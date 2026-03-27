/**
 * Update the paths column of world-borders.csv from Natural Earth GeoJSON data.
 *
 * Reads the existing CSV, regenerates SVG path data from GeoJSON source, and
 * writes back ONLY the paths column — all other columns are preserved as-is.
 * This avoids clobbering manual edits to names, alternates, regions, etc.
 *
 * Polygon holes (inner rings) are included in the path data so that enclaves
 * (e.g. Lesotho inside South Africa) render correctly with fill-rule="evenodd".
 *
 * Usage:
 *   npx tsx scripts/generateBorderPaths.ts
 *
 * Input:
 *   scripts/source-data/countries.geojson  (Natural Earth via datasets/geo-countries)
 *   public/data/borders/world-borders.csv  (existing CSV — only paths column is updated)
 *
 * Output:
 *   public/data/borders/world-borders.csv  (updated in place)
 *
 * Source files are gitignored (too large). Download before running:
 *   curl -L https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson -o scripts/source-data/countries.geojson
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface GeoJsonFeature {
  readonly properties: { readonly name: string; readonly 'ISO3166-1-Alpha-2': string };
  readonly geometry: {
    readonly type: 'Polygon' | 'MultiPolygon';
    readonly coordinates: ReadonlyArray<unknown>;
  };
}

interface GeoJsonCollection {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<GeoJsonFeature>;
}

// ------------------------------------------------------------------
// Path simplification: Douglas-Peucker
// ------------------------------------------------------------------

type Point = readonly [number, number];

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    const ex = point[0] - lineStart[0];
    const ey = point[1] - lineStart[1];
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lengthSq;
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;
  const ex = point[0] - projX;
  const ey = point[1] - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

function douglasPeucker(points: ReadonlyArray<Point>, epsilon: number): ReadonlyArray<Point> {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

// ------------------------------------------------------------------
// Coordinate conversion
// ------------------------------------------------------------------

function ringToPath(ring: ReadonlyArray<ReadonlyArray<number>>, epsilon: number): string {
  const points: Array<Point> = ring.map(([lng, lat]) => [lng, -lat] as Point);
  const simplified = douglasPeucker(points, epsilon);

  if (simplified.length < 3) return '';

  const parts: Array<string> = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    const rx = Math.round(x * 100) / 100;
    const ry = Math.round(y * 100) / 100;
    parts.push(i === 0 ? `M ${rx} ${ry}` : `L ${rx} ${ry}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Convert a GeoJSON geometry to pipe-separated SVG path strings.
 * Each polygon produces one path string. Inner rings (holes) are included
 * in the same path string as the outer ring, enabling fill-rule="evenodd"
 * to cut out enclaves (e.g. Lesotho inside South Africa).
 */
function featureToSvgPaths(geometry: GeoJsonFeature['geometry'], epsilon: number): ReadonlyArray<string> {
  const paths: Array<string> = [];

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    const ringPaths: Array<string> = [];
    for (const ring of rings) {
      const path = ringToPath(ring, epsilon);
      if (path) ringPaths.push(path);
    }
    if (ringPaths.length > 0) paths.push(ringPaths.join(' '));
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>>;
    for (const polygon of polygons) {
      const ringPaths: Array<string> = [];
      for (const ring of polygon) {
        const path = ringToPath(ring, epsilon);
        if (path) ringPaths.push(path);
      }
      if (ringPaths.length > 0) paths.push(ringPaths.join(' '));
    }
  }

  return paths;
}

// ------------------------------------------------------------------
// CSV escaping
// ------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('|') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// CSV parsing (handles quoted fields with pipes and commas)
// ------------------------------------------------------------------

function parseCsvRow(line: string): Array<string> {
  const fields: Array<string> = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ------------------------------------------------------------------
// GeoJSON name → CSV id mapping
// ------------------------------------------------------------------

/** Maps GeoJSON feature names to CSV ids where they don't match the
 *  default id derivation (lowercase, strip diacritics, hyphenate). */
const GEOJSON_NAME_TO_CSV_ID: Readonly<Record<string, string>> = {
  'Vatican': 'vatican-city',
};

function nameToId(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const scriptDir = dirname(new URL(import.meta.url).pathname);
const sourceDir = resolve(scriptDir, 'source-data');
const csvPath = resolve(scriptDir, '..', 'public', 'data', 'borders', 'world-borders.csv');

// Load existing CSV
const csvContent = readFileSync(csvPath, 'utf8');
const csvLines = csvContent.split('\n').filter((line) => line.trim() !== '');
const headerFields = parseCsvRow(csvLines[0]);
const pathsColIndex = headerFields.indexOf('paths');
if (pathsColIndex === -1) {
  throw new Error('Could not find "paths" column in CSV header');
}

// Parse existing rows into id → fields map
const existingRows = new Map<string, Array<string>>();
const rowOrder: Array<string> = [];
for (let i = 1; i < csvLines.length; i++) {
  const fields = parseCsvRow(csvLines[i]);
  const id = fields[0];
  existingRows.set(id, fields);
  rowOrder.push(id);
}

// Load GeoJSON
const geojsonPath = resolve(sourceDir, 'countries.geojson');
const geojson: GeoJsonCollection = JSON.parse(readFileSync(geojsonPath, 'utf8'));

// Simplification epsilon — in degrees. 0.1° ≈ 11km at the equator.
const EPSILON = 0.05;

// Build GeoJSON id → paths lookup
const geojsonPaths = new Map<string, string>();
for (const feature of geojson.features) {
  const name = feature.properties.name;
  const id = GEOJSON_NAME_TO_CSV_ID[name] ?? nameToId(name);

  const svgPaths = featureToSvgPaths(feature.geometry, EPSILON);
  if (svgPaths.length === 0) continue;

  geojsonPaths.set(id, svgPaths.join('|'));
}

// Update paths column in existing rows
let updatedCount = 0;
let skippedCount = 0;
for (const [id, fields] of existingRows) {
  const newPaths = geojsonPaths.get(id);
  if (newPaths !== undefined) {
    fields[pathsColIndex] = newPaths;
    updatedCount++;
  } else {
    skippedCount++;
    console.log(`  Kept existing paths for: ${id} (no GeoJSON match)`);
  }
}

// Write back
const outputLines = [csvLines[0]];
for (const id of rowOrder) {
  const fields = existingRows.get(id);
  if (!fields) continue;
  outputLines.push(fields.map(escapeCsvField).join(','));
}

writeFileSync(csvPath, outputLines.join('\n') + '\n');

console.log(`Updated paths for ${updatedCount} countries, kept ${skippedCount} unchanged`);
console.log(`File size: ${Math.round((outputLines.join('\n').length) / 1024)}KB`);
