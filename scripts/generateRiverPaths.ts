/**
 * Generate world-rivers.csv from Natural Earth GeoJSON data.
 *
 * Reads the 10m rivers/lake centerlines GeoJSON and 10m lakes GeoJSON,
 * converts LineString/MultiLineString coordinates to equirectangular SVG
 * path `d` strings (x = longitude, y = -latitude), fills gaps between
 * river segments using lake polygons (large lakes) or connecting lines
 * (small lakes / no lake found), and outputs a CSV with pipe-separated
 * paths for multi-line rivers.
 *
 * Usage:
 *   npx tsx scripts/generateRiverPaths.ts
 *
 * Input:
 *   scripts/source-data/rivers.geojson  (Natural Earth ne_10m_rivers_lake_centerlines)
 *   scripts/source-data/lakes.geojson   (Natural Earth ne_10m_lakes)
 *
 * Output:
 *   public/data/rivers/world-rivers.csv
 *
 * Source files are gitignored (too large). Download before running:
 *   curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson -o scripts/source-data/rivers.geojson
 *   curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson -o scripts/source-data/lakes.geojson
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface GeoJsonFeature {
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: {
    readonly type: string;
    readonly coordinates: ReadonlyArray<unknown>;
  };
}

interface GeoJsonCollection {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<GeoJsonFeature>;
}

type Coord = readonly [number, number]; // [lng, lat]

/** A single river line segment in geographic coordinates. */
interface RiverSegment {
  readonly coords: ReadonlyArray<Coord>;
  readonly start: Coord;
  readonly end: Coord;
}

/** A parsed lake polygon with its boundary ring and bounding box. */
interface LakePolygon {
  readonly name: string;
  readonly scalerank: number;
  readonly ring: ReadonlyArray<Coord>; // exterior ring in [lng, lat]
  readonly minLng: number;
  readonly maxLng: number;
  readonly minLat: number;
  readonly maxLat: number;
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

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Convert a line (array of [lng, lat] coords) to SVG path d string. */
function lineToPath(coords: ReadonlyArray<ReadonlyArray<number>>, epsilon: number): string {
  const points: Array<Point> = coords.map(([lng, lat]) => [lng, -lat] as Point);
  const simplified = douglasPeucker(points, epsilon);
  if (simplified.length < 2) return '';

  const parts: Array<string> = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    parts.push(i === 0 ? `M ${roundCoord(x)} ${roundCoord(y)}` : `L ${roundCoord(x)} ${roundCoord(y)}`);
  }
  return parts.join(' ');
}

/** Convert a polygon ring to a Z-closed SVG path d string. */
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

/** Extract all line segments from a river feature's geometry. */
function extractSegments(geometry: GeoJsonFeature['geometry']): ReadonlyArray<RiverSegment> {
  const segments: Array<RiverSegment> = [];

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates as ReadonlyArray<ReadonlyArray<number>>;
    if (coords.length >= 2) {
      const typedCoords = coords.map(c => [c[0], c[1]] as Coord);
      segments.push({
        coords: typedCoords,
        start: typedCoords[0],
        end: typedCoords[typedCoords.length - 1],
      });
    }
  } else if (geometry.type === 'MultiLineString') {
    const lines = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    for (const line of lines) {
      if (line.length >= 2) {
        const typedCoords = line.map(c => [c[0], c[1]] as Coord);
        segments.push({
          coords: typedCoords,
          start: typedCoords[0],
          end: typedCoords[typedCoords.length - 1],
        });
      }
    }
  }

  return segments;
}

/** Compute centroid of all coordinates across multiple segments. */
function segmentsCentroid(segments: ReadonlyArray<RiverSegment>): { lat: number; lng: number } {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const seg of segments) {
    for (const [lng, lat] of seg.coords) {
      sumLng += lng;
      sumLat += lat;
      count++;
    }
  }
  return { lat: count > 0 ? sumLat / count : 0, lng: count > 0 ? sumLng / count : 0 };
}

// ------------------------------------------------------------------
// Lake loading
// ------------------------------------------------------------------

function loadLakes(path: string): ReadonlyArray<LakePolygon> {
  const geojson: GeoJsonCollection = JSON.parse(readFileSync(path, 'utf8'));
  const lakes: Array<LakePolygon> = [];

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

    for (const ring of rings) {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      lakes.push({ name, scalerank, ring, minLng, maxLng, minLat, maxLat });
    }
  }

  return lakes;
}

// ------------------------------------------------------------------
// Lake-river matching
// ------------------------------------------------------------------

/** Distance between two geographic points in degrees (Euclidean — fine for proximity checks). */
function geoDist(a: Coord, b: Coord): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Minimum distance from a point to a polygon ring boundary (not interior). */
function distToRing(point: Coord, ring: ReadonlyArray<Coord>): number {
  let minDist = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i];
    const b = ring[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lengthSq = dx * dx + dy * dy;
    let closest: Coord;
    if (lengthSq === 0) {
      closest = a;
    } else {
      const t = Math.max(0, Math.min(1,
        ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / lengthSq,
      ));
      closest = [a[0] + t * dx, a[1] + t * dy];
    }
    const dist = geoDist(point, closest);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/** Maximum gap distance (degrees) for matching river endpoints to lake boundaries. */
const LAKE_MATCH_THRESHOLD = 0.5;

/** Scalerank threshold: lakes with scalerank <= this get polygon rendering.
 *  Lakes with scalerank > this get a connecting line instead. */
const LARGE_LAKE_SCALERANK = 6;

/** Maximum gap to bridge with a connecting line (degrees). */
const MAX_LINE_BRIDGE_GAP = 3.0;

/**
 * Find a lake that bridges a gap between two river endpoints.
 * Returns the lake if found, or undefined.
 */
function findBridgingLake(
  endPoint: Coord,
  startPoint: Coord,
  lakes: ReadonlyArray<LakePolygon>,
): LakePolygon | undefined {
  let bestLake: LakePolygon | undefined;
  let bestDist = Infinity;

  for (const lake of lakes) {
    // Quick bounding box check with threshold expansion
    const t = LAKE_MATCH_THRESHOLD;
    if (endPoint[0] < lake.minLng - t || endPoint[0] > lake.maxLng + t) continue;
    if (endPoint[1] < lake.minLat - t || endPoint[1] > lake.maxLat + t) continue;
    if (startPoint[0] < lake.minLng - t || startPoint[0] > lake.maxLng + t) continue;
    if (startPoint[1] < lake.minLat - t || startPoint[1] > lake.maxLat + t) continue;

    const distEnd = distToRing(endPoint, lake.ring);
    const distStart = distToRing(startPoint, lake.ring);

    if (distEnd < LAKE_MATCH_THRESHOLD && distStart < LAKE_MATCH_THRESHOLD) {
      const totalDist = distEnd + distStart;
      if (totalDist < bestDist) {
        bestDist = totalDist;
        bestLake = lake;
      }
    }
  }

  return bestLake;
}

// ------------------------------------------------------------------
// Segment chaining
// ------------------------------------------------------------------

/**
 * Chain river segments into an ordered sequence by matching endpoints.
 * Segments may need to be reversed to form a continuous path.
 * Returns the ordered segments and any gaps with their bridging info.
 */
interface ChainedResult {
  readonly segments: ReadonlyArray<RiverSegment>;
  readonly gaps: ReadonlyArray<{
    readonly from: Coord; // end of previous segment
    readonly to: Coord;   // start of next segment
    readonly lake: LakePolygon | undefined;
  }>;
}

function chainSegments(
  segments: ReadonlyArray<RiverSegment>,
  lakes: ReadonlyArray<LakePolygon>,
): ChainedResult {
  if (segments.length <= 1) {
    return { segments, gaps: [] };
  }

  // Build the chain greedily: start with the first segment,
  // then repeatedly find the closest unvisited segment endpoint.
  const remaining = segments.map((seg, i) => ({ seg, index: i, reversed: false }));
  const chain: Array<{ seg: RiverSegment; reversed: boolean }> = [];

  // Start with segment 0
  chain.push({ seg: remaining[0].seg, reversed: false });
  remaining.splice(0, 1);

  while (remaining.length > 0) {
    const lastSeg = chain[chain.length - 1];
    const lastEnd = lastSeg.reversed ? lastSeg.seg.start : lastSeg.seg.end;

    let bestIdx = -1;
    let bestDist = Infinity;
    let bestReversed = false;

    for (let i = 0; i < remaining.length; i++) {
      const distToStart = geoDist(lastEnd, remaining[i].seg.start);
      const distToEnd = geoDist(lastEnd, remaining[i].seg.end);

      if (distToStart < bestDist) {
        bestDist = distToStart;
        bestIdx = i;
        bestReversed = false;
      }
      if (distToEnd < bestDist) {
        bestDist = distToEnd;
        bestIdx = i;
        bestReversed = true;
      }
    }

    chain.push({ seg: remaining[bestIdx].seg, reversed: bestReversed });
    remaining.splice(bestIdx, 1);
  }

  // Build ordered segments (reversing coordinates where needed)
  const orderedSegments: Array<RiverSegment> = chain.map(({ seg, reversed }) => {
    if (!reversed) return seg;
    const revCoords = [...seg.coords].reverse();
    return {
      coords: revCoords,
      start: revCoords[0],
      end: revCoords[revCoords.length - 1],
    };
  });

  // Identify gaps and find bridging lakes
  const gaps: Array<{ from: Coord; to: Coord; lake: LakePolygon | undefined }> = [];
  for (let i = 0; i < orderedSegments.length - 1; i++) {
    const from = orderedSegments[i].end;
    const to = orderedSegments[i + 1].start;
    const dist = geoDist(from, to);

    if (dist > 0.01) { // gap threshold ~1km
      const lake = findBridgingLake(from, to, lakes);
      gaps.push({ from, to, lake });
    }
  }

  return { segments: orderedSegments, gaps };
}

// ------------------------------------------------------------------
// Continent assignment from centroid
// ------------------------------------------------------------------

function assignContinent(lat: number, lng: number): string {
  if (lng > 110 && lat < -10) return 'Oceania';
  if (lng > 160 && lat < 0) return 'Oceania';

  if (lng < -25) {
    if (lat > 10) return 'North America';
    return 'South America';
  }

  if (lng > -20 && lng < 55 && lat < 35) return 'Africa';

  if (lat > 35 && lng < 40) return 'Europe';
  if (lat > 50 && lng < 60) return 'Europe';

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

function buildAlternates(feature: GeoJsonFeature, primaryName: string): string {
  const alts = new Set<string>();
  const nameLower = primaryName.toLowerCase();

  const nameEn = feature.properties['name_en'] as string | null;
  const name = feature.properties['name'] as string | null;
  const nameAlt = feature.properties['name_alt'] as string | null;

  if (nameEn && nameEn.toLowerCase() !== nameLower) {
    alts.add(nameEn);
  }
  if (name && name.toLowerCase() !== nameLower) {
    alts.add(name);
  }
  if (nameAlt) {
    for (const alt of nameAlt.split(/[;,|]/)) {
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

// Load GeoJSON data
const geojsonPath = resolve(sourceDir, 'rivers.geojson');
const lakesPath = resolve(sourceDir, 'lakes.geojson');
const geojson: GeoJsonCollection = JSON.parse(readFileSync(geojsonPath, 'utf8'));
const lakes = loadLakes(lakesPath);

console.log(`Loaded ${lakes.length} lake polygons`);

// Simplification epsilon — in degrees. 0.03° ≈ 3.3km at the equator.
const RIVER_EPSILON = 0.03;
// Lake polygons can use slightly more aggressive simplification
const LAKE_EPSILON = 0.05;

// Filter to rivers only (exclude lake centerlines), must have a name
const riverFeatures = geojson.features.filter(
  (f) => (f.properties['featurecla'] as string) === 'River' && f.properties['name'],
);

console.log(`Total river features with names: ${riverFeatures.length}`);

// Group features by rivernum to handle same-river-different-segments.
// When multiple names share a rivernum (data error), split into separate groups.
const byGroupKey = new Map<string, Array<GeoJsonFeature>>();
let nextSyntheticNum = 100000;

for (const feature of riverFeatures) {
  const num = feature.properties['rivernum'] as number;
  const name = (feature.properties['name'] as string) ?? '';
  const key = `${num}`;
  const existing = byGroupKey.get(key);
  if (existing) {
    const existingName = existing[0].properties['name'] as string;
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
let totalLakePolygons = 0;
let totalLineConnections = 0;
let totalGapsSkipped = 0;

for (const [groupKey, features] of byGroupKey) {
  const primaryFeature = features.reduce((best, f) =>
    (f.properties['scalerank'] as number) < (best.properties['scalerank'] as number) ? f : best,
  );
  const name = (primaryFeature.properties['name_en'] as string)
    ?? (primaryFeature.properties['name'] as string)
    ?? '';
  if (!name) continue;

  const minScalerank = Math.min(...features.map((f) => f.properties['scalerank'] as number));

  // Collect all segments from all features in this river group
  const allSegments: Array<RiverSegment> = [];
  for (const feature of features) {
    allSegments.push(...extractSegments(feature.geometry));
  }

  if (allSegments.length === 0) continue;

  // Chain segments and fill gaps with lakes or connecting lines
  const { segments, gaps } = chainSegments(allSegments, lakes);

  // Build SVG paths
  const allPaths: Array<string> = [];
  const usedLakes = new Set<LakePolygon>();

  for (let i = 0; i < segments.length; i++) {
    const path = lineToPath(
      segments[i].coords.map(c => [c[0], c[1]]),
      RIVER_EPSILON,
    );
    if (path) allPaths.push(path);

    // Check if there's a gap after this segment
    if (i < segments.length - 1) {
      const gap = gaps.find(g =>
        geoDist(g.from, segments[i].end) < 0.01 &&
        geoDist(g.to, segments[i + 1].start) < 0.01,
      );

      if (gap) {
        if (gap.lake && gap.lake.scalerank <= LARGE_LAKE_SCALERANK && !usedLakes.has(gap.lake)) {
          // Large lake: include polygon path
          const lakePath = polygonToPath(gap.lake.ring, LAKE_EPSILON);
          if (lakePath) {
            allPaths.push(lakePath);
            usedLakes.add(gap.lake);
            totalLakePolygons++;
          }
        } else if (geoDist(gap.from, gap.to) <= MAX_LINE_BRIDGE_GAP) {
          // Small lake or no lake: connect with a line
          const fx = roundCoord(gap.from[0]);
          const fy = roundCoord(-gap.from[1]);
          const tx = roundCoord(gap.to[0]);
          const ty = roundCoord(-gap.to[1]);
          allPaths.push(`M ${fx} ${fy} L ${tx} ${ty}`);
          totalLineConnections++;
        } else {
          totalGapsSkipped++;
        }
      }
    }
  }

  if (allPaths.length === 0) continue;

  const centroid = segmentsCentroid(segments);
  const continent = assignContinent(centroid.lat, centroid.lng);

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
    latitude: Math.round(centroid.lat * 100) / 100,
    longitude: Math.round(centroid.lng * 100) / 100,
  });
}

// Sort by scalerank (most important first), then by name
rivers.sort((a, b) => a.scalerank - b.scalerank || a.name.localeCompare(b.name));

console.log(`\nGap filling stats:`);
console.log(`  Lake polygons included: ${totalLakePolygons}`);
console.log(`  Line connections: ${totalLineConnections}`);
console.log(`  Gaps skipped (too large): ${totalGapsSkipped}`);

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
