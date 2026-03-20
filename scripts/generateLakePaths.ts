/**
 * Generate lake SVG path CSVs from Natural Earth 10m lakes GeoJSON.
 *
 * Outputs two files:
 *   public/data/lakes/large-lakes.csv      — scalerank 0–2 (~46 lakes)
 *   public/data/lakes/medium-lakes.csv     — scalerank 0–5 (~336 lakes, includes large)
 *
 * Source file (gitignored, ~4MB):
 *   scripts/source-data/lakes.geojson
 *
 * Download:
 *   curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson -o scripts/source-data/lakes.geojson
 *
 * Run:
 *   npx tsx scripts/generateLakePaths.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type Coord = readonly [number, number]; // [lng, lat]
type Point = readonly [number, number];

interface GeoJsonFeature {
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: unknown;
  };
}

interface GeoJsonCollection {
  readonly features: ReadonlyArray<GeoJsonFeature>;
}

// ------------------------------------------------------------------
// Path simplification: Douglas-Peucker
// ------------------------------------------------------------------

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
// SVG path generation
// ------------------------------------------------------------------

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert a polygon ring to a Z-closed SVG path d string (equirectangular: x=lng, y=-lat). */
function polygonToPath(ring: ReadonlyArray<Coord>, epsilon: number): string {
  const points: Array<Point> = ring.map(([lng, lat]) => [lng, -lat] as Point);
  const simplified = douglasPeucker(points, epsilon);
  if (simplified.length < 3) return '';

  const parts: Array<string> = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    parts.push(i === 0 ? `M ${roundCoord(x)} ${roundCoord(y)}` : `L ${roundCoord(x)} ${roundCoord(y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// ------------------------------------------------------------------
// Lake loading
// ------------------------------------------------------------------

interface LakeRow {
  readonly id: string;
  readonly name: string;
  readonly scalerank: number;
  readonly paths: string;
}

/** Simplification tolerance — same as rivers. */
const EPSILON = 0.03;

function loadAndProcessLakes(geojsonPath: string): ReadonlyArray<LakeRow> {
  const geojson: GeoJsonCollection = JSON.parse(readFileSync(geojsonPath, 'utf8'));
  const rows: Array<LakeRow> = [];
  let index = 0;

  for (const feature of geojson.features) {
    const name = (feature.properties['name'] as string) ?? '';
    const scalerank = (feature.properties['scalerank'] as number) ?? 10;

    // Extract exterior rings from Polygon or MultiPolygon
    const rings: Array<ReadonlyArray<Coord>> = [];
    if (feature.geometry.type === 'Polygon') {
      const coords = feature.geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
      rings.push(coords[0].map(c => [c[0], c[1]] as Coord));
    } else if (feature.geometry.type === 'MultiPolygon') {
      const polys = feature.geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>>;
      for (const poly of polys) {
        rings.push(poly[0].map(c => [c[0], c[1]] as Coord));
      }
    }

    if (rings.length === 0) continue;

    const pathSegments: Array<string> = [];
    for (const ring of rings) {
      const path = polygonToPath(ring, EPSILON);
      if (path) pathSegments.push(path);
    }

    if (pathSegments.length === 0) continue;

    const slug = name
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : `lake-${index}`;

    rows.push({
      id: `${slug}-${index}`,
      name,
      scalerank,
      paths: pathSegments.join('|'),
    });
    index++;
  }

  return rows;
}

// ------------------------------------------------------------------
// CSV output
// ------------------------------------------------------------------

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function writeLakeCsv(filePath: string, rows: ReadonlyArray<LakeRow>): void {
  const header = 'id,name,scalerank,paths';
  const lines = rows.map(r =>
    `${escapeCsv(r.id)},${escapeCsv(r.name)},${r.scalerank},${escapeCsv(r.paths)}`
  );
  const output = [header, ...lines].join('\n') + '\n';
  writeFileSync(filePath, output);
  console.log(`  ${filePath}: ${rows.length} lakes, ${Math.round(output.length / 1024)}KB`);
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const LAKES_GEOJSON = 'scripts/source-data/lakes.geojson';
const OUTPUT_DIR = 'public/data/lakes';

const allLakes = loadAndProcessLakes(LAKES_GEOJSON);
console.log(`Loaded ${allLakes.length} lakes total`);

// Count by scalerank
const byScalerank = new Map<number, number>();
for (const lake of allLakes) {
  byScalerank.set(lake.scalerank, (byScalerank.get(lake.scalerank) ?? 0) + 1);
}
for (const [sr, count] of [...byScalerank.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`  scalerank ${sr}: ${count} lakes`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const largeLakes = allLakes.filter(l => l.scalerank <= 2);
const mediumLakes = allLakes.filter(l => l.scalerank <= 5);

console.log('\nWriting CSVs:');
writeLakeCsv(`${OUTPUT_DIR}/large-lakes.csv`, largeLakes);
writeLakeCsv(`${OUTPUT_DIR}/medium-lakes.csv`, mediumLakes);

console.log('\nDone.');
