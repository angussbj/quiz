/**
 * Generate world-borders.csv from Natural Earth GeoJSON data.
 *
 * Reads source GeoJSON (countries.geojson) and countries.json metadata,
 * converts polygon coordinates to equirectangular SVG path `d` strings
 * (x = longitude, y = -latitude — matching projectGeo in the app),
 * and outputs a CSV file with pipe-separated paths for multi-polygon countries.
 *
 * Usage:
 *   npx tsx scripts/generateBorderPaths.ts
 *
 * Input:
 *   scripts/source-data/countries.geojson  (Natural Earth via datasets/geo-countries)
 *   scripts/source-data/countries.json     (mledoze/countries for region metadata)
 *
 * Output:
 *   public/data/borders/world-borders.csv
 *
 * Source files are gitignored (too large). Download before running:
 *   curl -L https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson -o scripts/source-data/countries.geojson
 *   curl -L https://raw.githubusercontent.com/mledoze/countries/master/countries.json -o scripts/source-data/countries.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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

interface CountryMeta {
  readonly cca2: string;
  readonly name: { readonly common: string };
  readonly region: string;
  readonly subregion?: string;
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

/** Equirectangular: x = longitude, y = -latitude. Rounds to 2 decimal places. */
function geoToSvg(lng: number, lat: number): string {
  const x = Math.round(lng * 100) / 100;
  const y = Math.round(-lat * 100) / 100;
  return `${x} ${y}`;
}

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

function featureToSvgPaths(geometry: GeoJsonFeature['geometry'], epsilon: number): ReadonlyArray<string> {
  const paths: Array<string> = [];

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    // Only use outer ring (index 0), skip holes
    const path = ringToPath(rings[0], epsilon);
    if (path) paths.push(path);
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>>;
    for (const polygon of polygons) {
      const path = ringToPath(polygon[0], epsilon);
      if (path) paths.push(path);
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
// Main
// ------------------------------------------------------------------

const scriptDir = dirname(new URL(import.meta.url).pathname);
const sourceDir = resolve(scriptDir, 'source-data');
const outputDir = resolve(scriptDir, '..', 'public', 'data', 'borders');

// Load GeoJSON
const geojsonPath = resolve(sourceDir, 'countries.geojson');
const geojson: GeoJsonCollection = JSON.parse(readFileSync(geojsonPath, 'utf8'));

// Load country metadata for region info
const countriesPath = resolve(sourceDir, 'countries.json');
const countriesMeta: ReadonlyArray<CountryMeta> = JSON.parse(readFileSync(countriesPath, 'utf8'));

// Build region lookup by ISO alpha-2 code
const regionByCode = new Map<string, { region: string; subregion: string }>();
for (const c of countriesMeta) {
  regionByCode.set(c.cca2, { region: c.region, subregion: c.subregion ?? '' });
}

// Simplification epsilon — in degrees. 0.1° ≈ 11km at the equator.
// The 110m Natural Earth data is already simplified, so we use a small epsilon
// just to reduce point count slightly for file size.
const EPSILON = 0.05;

// Generate CSV rows
const csvRows: Array<string> = [];

for (const feature of geojson.features) {
  const iso2 = feature.properties['ISO3166-1-Alpha-2'];
  const name = feature.properties.name;

  if (!iso2 || iso2 === '-99') continue;

  const meta = regionByCode.get(iso2);
  const region = meta?.region ?? '';
  const subregion = meta?.subregion ?? '';

  const svgPaths = featureToSvgPaths(feature.geometry, EPSILON);
  if (svgPaths.length === 0) continue;

  const id = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const pathsField = svgPaths.join('|');

  csvRows.push(
    [id, name, region, subregion, pathsField]
      .map(escapeCsvField)
      .join(','),
  );
}

// Sort by region then name for readability
csvRows.sort();

// Write output
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const header = 'id,name,region,group,paths';
const output = header + '\n' + csvRows.join('\n') + '\n';
const outputPath = resolve(outputDir, 'world-borders.csv');
writeFileSync(outputPath, output);

console.log(`Written ${csvRows.length} countries to ${outputPath}`);
console.log(`File size: ${Math.round(output.length / 1024)}KB`);
