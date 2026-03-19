/**
 * Generate world-rivers.csv from Natural Earth GeoJSON data.
 *
 * Reads the 10m rivers/lake centerlines GeoJSON, converts LineString/MultiLineString
 * coordinates to equirectangular SVG path `d` strings (x = longitude, y = -latitude),
 * and outputs a CSV with pipe-separated paths for multi-line rivers.
 *
 * Usage:
 *   npx tsx scripts/generateRiverPaths.ts
 *
 * Input:
 *   scripts/source-data/rivers.geojson  (Natural Earth ne_10m_rivers_lake_centerlines)
 *
 * Output:
 *   public/data/rivers/world-rivers.csv
 *
 * Source file is gitignored (too large). Download before running:
 *   curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson -o scripts/source-data/rivers.geojson
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface GeoJsonFeature {
  readonly properties: {
    readonly name: string | null;
    readonly name_en: string | null;
    readonly name_alt: string | null;
    readonly featurecla: string;
    readonly scalerank: number;
    readonly rivernum: number;
    readonly min_zoom: number;
  };
  readonly geometry: {
    readonly type: 'LineString' | 'MultiLineString';
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

/** Convert a line (array of [lng, lat] coords) to SVG path d string. */
function lineToPath(
  coords: ReadonlyArray<ReadonlyArray<number>>,
  epsilon: number,
): string {
  // Convert to equirectangular: x = lng, y = -lat
  const points: Array<Point> = coords.map(([lng, lat]) => [lng, -lat] as Point);
  const simplified = douglasPeucker(points, epsilon);

  if (simplified.length < 2) return '';

  const parts: Array<string> = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    const rx = Math.round(x * 100) / 100;
    const ry = Math.round(y * 100) / 100;
    parts.push(i === 0 ? `M ${rx} ${ry}` : `L ${rx} ${ry}`);
  }
  return parts.join(' ');
}

function featureToSvgPaths(
  geometry: GeoJsonFeature['geometry'],
  epsilon: number,
): ReadonlyArray<string> {
  const paths: Array<string> = [];

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates as ReadonlyArray<ReadonlyArray<number>>;
    const path = lineToPath(coords, epsilon);
    if (path) paths.push(path);
  } else if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    for (const line of lines) {
      const path = lineToPath(line, epsilon);
      if (path) paths.push(path);
    }
  }

  return paths;
}

/** Compute the centroid of all coordinates in a geometry. */
function computeCentroid(geometry: GeoJsonFeature['geometry']): { lat: number; lng: number } {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  function addCoords(coords: ReadonlyArray<ReadonlyArray<number>>) {
    for (const [lng, lat] of coords) {
      sumLng += lng;
      sumLat += lat;
      count++;
    }
  }

  if (geometry.type === 'LineString') {
    addCoords(geometry.coordinates as ReadonlyArray<ReadonlyArray<number>>);
  } else if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    for (const line of lines) {
      addCoords(line);
    }
  }

  return { lat: count > 0 ? sumLat / count : 0, lng: count > 0 ? sumLng / count : 0 };
}

// ------------------------------------------------------------------
// Continent assignment from centroid
// ------------------------------------------------------------------

function assignContinent(lat: number, lng: number): string {
  // Oceania (Australia, NZ, Pacific Islands)
  if (lng > 110 && lat < -10) return 'Oceania';
  if (lng > 160 && lat < 0) return 'Oceania';

  // Americas — divide at ~10°N latitude
  // Below 10°N in the western hemisphere is South America (Amazon, Orinoco, etc.)
  // Above 10°N is North America (includes Central America, Caribbean)
  if (lng < -25) {
    if (lat > 10) return 'North America';
    return 'South America';
  }

  // Africa — below 35°N between 20°W and 55°E
  if (lng > -20 && lng < 55 && lat < 35) return 'Africa';

  // Europe vs Asia — Urals (~60°E), Caucasus (~45°E at ~42°N)
  if (lat > 35 && lng < 40) return 'Europe';
  if (lat > 50 && lng < 60) return 'Europe';

  // Everything else is Asia
  return 'Asia';
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
// Name alternates for quiz answer matching
// ------------------------------------------------------------------

/**
 * Build pipe-separated alternate names for a river.
 * Includes name_en and name_alt if they differ from the primary name.
 */
function buildAlternates(feature: GeoJsonFeature, primaryName: string): string {
  const alts = new Set<string>();
  const nameLower = primaryName.toLowerCase();

  if (feature.properties.name_en && feature.properties.name_en.toLowerCase() !== nameLower) {
    alts.add(feature.properties.name_en);
  }
  if (feature.properties.name && feature.properties.name.toLowerCase() !== nameLower) {
    alts.add(feature.properties.name);
  }
  if (feature.properties.name_alt) {
    for (const alt of feature.properties.name_alt.split(/[;,|]/)) {
      const trimmed = alt.trim();
      if (trimmed && trimmed.toLowerCase() !== nameLower) {
        alts.add(trimmed);
      }
    }
  }

  return [...alts].join('|');
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const scriptDir = dirname(new URL(import.meta.url).pathname);
const sourceDir = resolve(scriptDir, 'source-data');
const outputDir = resolve(scriptDir, '..', 'public', 'data', 'rivers');

// Load GeoJSON
const geojsonPath = resolve(sourceDir, 'rivers.geojson');
const geojson: GeoJsonCollection = JSON.parse(readFileSync(geojsonPath, 'utf8'));

// Simplification epsilon — in degrees. Rivers need less simplification than borders
// since they're lines, not polygons. 0.03° ≈ 3.3km at the equator.
const EPSILON = 0.03;

// Filter to rivers only (exclude lake centerlines), must have a name
const riverFeatures = geojson.features.filter(
  (f) => f.properties.featurecla === 'River' && f.properties.name,
);

console.log(`Total river features with names: ${riverFeatures.length}`);

// Group features by rivernum to handle same-river-different-segments.
// When multiple names share a rivernum (data error), split into separate groups.
const byGroupKey = new Map<string, Array<GeoJsonFeature>>();
let nextSyntheticNum = 100000;

for (const feature of riverFeatures) {
  const num = feature.properties.rivernum;
  const name = feature.properties.name ?? '';
  const key = `${num}`;
  const existing = byGroupKey.get(key);
  if (existing) {
    // Check if names match — if not, this is a data error; split into own group
    const existingName = existing[0].properties.name;
    if (existingName === name) {
      existing.push(feature);
    } else {
      byGroupKey.set(`${nextSyntheticNum++}`, [feature]);
    }
  } else {
    byGroupKey.set(key, [feature]);
  }
}

console.log(`Unique river groups: ${byGroupKey.size}`);

// Process each river group
interface RiverRow {
  id: string;
  name: string;
  nameAlternates: string;
  continent: string;
  scalerank: number;
  paths: string;
  latitude: number;
  longitude: number;
}

const rivers: Array<RiverRow> = [];

for (const [groupKey, features] of byGroupKey) {
  // Use the best name: prefer name_en, fall back to name
  const primaryFeature = features.reduce((best, f) =>
    f.properties.scalerank < best.properties.scalerank ? f : best,
  );
  const name = primaryFeature.properties.name_en ?? primaryFeature.properties.name ?? '';
  if (!name) continue;

  const minScalerank = Math.min(...features.map((f) => f.properties.scalerank));

  // Collect all SVG paths from all features in this river group
  const allPaths: Array<string> = [];
  let totalLat = 0;
  let totalLng = 0;
  let pointCount = 0;

  for (const feature of features) {
    const paths = featureToSvgPaths(feature.geometry, EPSILON);
    allPaths.push(...paths);

    const centroid = computeCentroid(feature.geometry);
    // Weight by number of coordinate points (rough proxy for path length)
    const coords = feature.geometry.type === 'LineString'
      ? (feature.geometry.coordinates as ReadonlyArray<unknown>).length
      : (feature.geometry.coordinates as ReadonlyArray<ReadonlyArray<unknown>>)
          .reduce((sum, line) => sum + line.length, 0);
    totalLat += centroid.lat * coords;
    totalLng += centroid.lng * coords;
    pointCount += coords;
  }

  if (allPaths.length === 0) continue;

  const avgLat = pointCount > 0 ? totalLat / pointCount : 0;
  const avgLng = pointCount > 0 ? totalLng / pointCount : 0;
  const continent = assignContinent(avgLat, avgLng);

  const id = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const nameAlternates = buildAlternates(primaryFeature, name);

  rivers.push({
    id: `${id}-${groupKey}`,
    name,
    nameAlternates,
    continent,
    scalerank: minScalerank,
    paths: allPaths.join('|'),
    latitude: Math.round(avgLat * 100) / 100,
    longitude: Math.round(avgLng * 100) / 100,
  });
}

// Sort by scalerank (most important first), then by name
rivers.sort((a, b) => a.scalerank - b.scalerank || a.name.localeCompare(b.name));

console.log(`\nRivers by continent:`);
const byCont = new Map<string, number>();
for (const r of rivers) {
  byCont.set(r.continent, (byCont.get(r.continent) ?? 0) + 1);
}
for (const [cont, count] of [...byCont.entries()].sort()) {
  console.log(`  ${cont}: ${count}`);
}

console.log(`\nRivers by scalerank:`);
const byRank = new Map<number, number>();
for (const r of rivers) {
  byRank.set(r.scalerank, (byRank.get(r.scalerank) ?? 0) + 1);
}
for (const [rank, count] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  rank ${rank}: ${count}`);
}

// Write output
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const header = 'id,name,name_alternates,continent,scalerank,paths,latitude,longitude';
const csvRows = rivers.map((r) =>
  [
    r.id,
    r.name,
    r.nameAlternates,
    r.continent,
    String(r.scalerank),
    r.paths,
    String(r.latitude),
    String(r.longitude),
  ]
    .map(escapeCsvField)
    .join(','),
);

const output = header + '\n' + csvRows.join('\n') + '\n';
const outputPath = resolve(outputDir, 'world-rivers.csv');
writeFileSync(outputPath, output);

console.log(`\nWritten ${rivers.length} rivers to ${outputPath}`);
console.log(`File size: ${Math.round(output.length / 1024)}KB`);
