/**
 * Geometric tributary candidate finder.
 *
 * For each river in world-rivers.csv, extracts both endpoints of its path
 * (first and last coordinate), then checks how close each endpoint is to
 * every other river's path segments using the haversine great-circle formula.
 *
 * When an endpoint of river A is within THRESHOLD_KM of river B's path,
 * A is a candidate tributary of B (or B of A — context determines direction).
 *
 * Candidates already in the hardcoded TRIBUTARY_OF map are omitted.
 * Same-name rows (multiple segments of one river) are also skipped.
 *
 * Usage: node scripts/findTributaryCandidates.mjs
 */

import { readFileSync } from 'fs';

const RIVERS_PATH = 'public/data/rivers/world-rivers.csv';
const THRESHOLD_KM = 15;

// Already-known tributary relationships — suppress these from output
const KNOWN_TRIBUTARIES = new Set([
  'Ucayali', 'Madeira', 'Negro', 'Mamoré', 'Guaporé', 'Araguaia', 'Paraguay', 'Pilcomayo',
  'Lualaba', 'Kasai', 'Ubangi', 'Uele', 'Kibali',
  'Abay', 'Kagera', 'Albert Nile',
  'Tongtian', 'Tuotuo', 'Han',
  'Angara', 'Verkhniy Yenisey', 'Malyy Yenisey', 'Kyzyl-Khem', 'Selenga',
  'Dihang', 'Damqogkanbab', 'Shiquan',
  'Ideriyn', 'Za',
  'Wei',
  'Hongshui', 'Nanpan', 'Xun',
  'Nmai',
  'Chenab', 'Jhelum',
  'Yamuna', 'Chambal', 'Gomti',
  'Benue', 'Bénoué',
  'Missouri', 'Ohio', 'Arkansas', 'Allegheny',
  'Slave', 'Peace',
  'Aldan',
  'Ergun', 'Hailar',
  'Ertis',
  'Kama', 'Oka',
  'Bafing',
  'Vaal',
  'Sukhona',
  'Paranaíba',
  'Teslin',
  'Darling', 'Barwon',
  'North Saskatchewan',
]);

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n');
  const cols = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const row = {};
    cols.forEach((col, idx) => { row[col] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Geometry ──────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Parse pipe-separated SVG paths into an array of {x, y} points.
 * Skips Z-closed subpaths (lake polygons embedded in river data).
 * In these paths: x = longitude, y = -latitude.
 */
function parsePathPoints(rawPaths) {
  const allPoints = [];
  for (const pathD of rawPaths.split('|').map((s) => s.trim()).filter(Boolean)) {
    if (pathD.endsWith('Z')) continue;
    const segments = pathD.split(/(?=[ML])/);
    for (const seg of segments) {
      const nums = seg.slice(1).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      if (nums.length >= 2) allPoints.push({ x: nums[0], y: nums[1] });
    }
  }
  return allPoints;
}

/**
 * Return the first and last coordinate from the open (non-Z) subpaths.
 * Returns null if no valid points.
 */
function pathEndpoints(rawPaths) {
  const points = parsePathPoints(rawPaths);
  if (points.length === 0) return null;
  return { start: points[0], end: points[points.length - 1] };
}

/**
 * Minimum haversine distance from a point {x=lng, y=-lat} to a polyline
 * defined by an array of {x, y} points, using planar projection for
 * segment parameterisation (accurate enough for short segments).
 */
function minDistanceToPolylineKm(point, polylinePoints) {
  let minDist = Infinity;
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const p0 = polylinePoints[i];
    const p1 = polylinePoints[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const lengthSq = dx * dx + dy * dy;
    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(0, Math.min(1, ((point.x - p0.x) * dx + (point.y - p0.y) * dy) / lengthSq));
    }
    const closest = { x: p0.x + t * dx, y: p0.y + t * dy };
    // Convert from SVG coords to lat/lng: lat = -y, lng = x
    const dist = haversineKm(-point.y, point.x, -closest.y, closest.x);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rows = parseCSV(readFileSync(RIVERS_PATH, 'utf8'));

// Only process rivers up to scalerank 6 (same as quiz filter) to keep output manageable
const quizRows = rows.filter((r) => Number(r.scalerank) <= 6);

// Pre-parse all polylines (expensive operation done once)
const riverPolylines = quizRows.map((row) => ({
  name: row.name,
  id: row.id,
  scalerank: Number(row.scalerank),
  tributaryOf: row.tributary_of,
  points: parsePathPoints(row.paths),
  endpoints: pathEndpoints(row.paths),
}));

// Build a map: name → all polyline entries (to group multi-segment rivers)
const byName = {};
for (const r of riverPolylines) {
  (byName[r.name] ??= []).push(r);
}

// For each river, check both endpoints against all other rivers
const candidates = [];

for (const river of riverPolylines) {
  if (!river.endpoints) continue;
  if (KNOWN_TRIBUTARIES.has(river.name)) continue;

  for (const { point, label } of [
    { point: river.endpoints.start, label: 'start' },
    { point: river.endpoints.end, label: 'end' },
  ]) {
    for (const other of riverPolylines) {
      if (other.name === river.name) continue;         // skip same-named rows
      if (other.points.length < 2) continue;
      if (KNOWN_TRIBUTARIES.has(river.name) && river.tributaryOf === other.name) continue;

      const dist = minDistanceToPolylineKm(point, other.points);
      if (dist < THRESHOLD_KM) {
        candidates.push({
          river: river.name,
          riverId: river.id,
          riverScalerank: river.scalerank,
          endpoint: label,
          other: other.name,
          otherId: other.id,
          otherScalerank: other.scalerank,
          dist: Math.round(dist * 10) / 10,
          alreadyKnown: river.tributaryOf === other.name,
        });
      }
    }
  }
}

// Deduplicate: keep only the closest match per (river, endpoint) pair
const best = {};
for (const c of candidates) {
  const key = `${c.river}|${c.endpoint}`;
  if (!best[key] || c.dist < best[key].dist) best[key] = c;
}

// Sort by river scalerank, then distance
const results = Object.values(best)
  .filter((c) => !c.alreadyKnown)
  .sort((a, b) => a.riverScalerank - b.riverScalerank || a.dist - b.dist);

console.log(`Checked ${riverPolylines.length} rivers (scalerank 0–6), threshold ${THRESHOLD_KM} km.\n`);
console.log(`Found ${results.length} potential new tributary relationships:\n`);

let lastScalerank = -1;
for (const c of results) {
  if (c.riverScalerank !== lastScalerank) {
    console.log(`── scalerank ${c.riverScalerank} ─────────────────────────`);
    lastScalerank = c.riverScalerank;
  }
  console.log(`  ${c.river} (${c.endpoint}) → near ${c.other}  [${c.dist} km]`);
}
