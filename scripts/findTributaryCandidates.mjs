/**
 * Geometric tributary/distributary/segment candidate finder.
 *
 * For each river in world-rivers.csv, extracts both endpoints of its open
 * (non-lake) path, then checks:
 *
 *   1. ENDPOINT-TO-MIDPOINT: endpoint of A is near a point on B's path but
 *      NOT near B's own endpoints → A is a tributary or distributary of B.
 *      B is always the "main" river here.
 *
 *   2. ENDPOINT-TO-ENDPOINT: endpoints of two (or more) rivers all meet near
 *      the same geographic point:
 *        - Exactly 2 rivers' endpoints meet → SEGMENT candidate (same river,
 *          different names).
 *        - 3+ rivers' endpoints meet → CONFLUENCE candidate; lower-discharge
 *          (or shorter) rivers are tributaries of the highest-discharge one.
 *
 * Already-known relationships (from enrichRiversWithDischarge.mjs maps) are
 * shown as VERIFIED lines for cross-checking, not suppressed entirely.
 *
 * Usage: node scripts/findTributaryCandidates.mjs
 */

import { readFileSync } from 'fs';

const RIVERS_PATH = 'public/data/rivers/world-rivers.csv';

// Distance threshold: an endpoint is "connected" to a river if it's within this many km.
const THRESHOLD_KM = 20;

// An endpoint-to-endpoint match requires both A's endpoint AND B's nearest endpoint
// to be within this distance of each other.
const ENDPOINT_MATCH_KM = 25;

// Already-known relationships from enrichRiversWithDischarge.mjs — shown as VERIFIED.
const KNOWN_TRIBUTARY_OF = new Set([
  'Ucayali', 'Madeira', 'Negro', 'Mamoré', 'Guaporé', 'Araguaia', 'Paraguay', 'Pilcomayo',
  'Lualaba', 'Kasai', 'Ubangi', 'Uele', 'Kibali',
  'Abay', 'Kagera',
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
  'Japurá', 'Tapajós', 'Kafue', 'Shire', 'Sungari', 'Liard',
]);
const KNOWN_DISTRIBUTARY_OF = new Set(['Damietta Branch', 'Rosetta Branch', 'Bykovskaya Protoka']);
const KNOWN_SEGMENT_OF = new Set(['Dicle', 'Dnepre', 'Tajo', 'Caquetá', 'Albert Nile']);

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
 * Parse pipe-separated SVG paths into {x, y} points (x=lng, y=-lat).
 * Skips Z-closed subpaths (lake polygons).
 */
function parsePathPoints(rawPaths) {
  const allPoints = [];
  for (const pathD of rawPaths.split('|').map((s) => s.trim()).filter(Boolean)) {
    if (pathD.trimEnd().endsWith('Z')) continue;
    const segments = pathD.split(/(?=[ML])/);
    for (const seg of segments) {
      const nums = seg.slice(1).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      if (nums.length >= 2) allPoints.push({ x: nums[0], y: nums[1] });
    }
  }
  return allPoints;
}

function pathEndpoints(points) {
  if (points.length === 0) return null;
  return { start: points[0], end: points[points.length - 1] };
}

/** Minimum haversine distance from a point to a polyline. Returns dist and the segment index. */
function minDistToPolyline(point, polyPoints) {
  let minDist = Infinity;
  let minSegIdx = -1;
  for (let i = 0; i < polyPoints.length - 1; i++) {
    const p0 = polyPoints[i];
    const p1 = polyPoints[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const lengthSq = dx * dx + dy * dy;
    let t = 0;
    if (lengthSq > 0) {
      t = Math.max(0, Math.min(1, ((point.x - p0.x) * dx + (point.y - p0.y) * dy) / lengthSq));
    }
    const cx = p0.x + t * dx;
    const cy = p0.y + t * dy;
    const dist = haversineKm(-point.y, point.x, -cy, cx);
    if (dist < minDist) { minDist = dist; minSegIdx = i; }
  }
  return { dist: minDist, segIdx: minSegIdx };
}

function pointDistKm(a, b) {
  return haversineKm(-a.y, a.x, -b.y, b.x);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rows = parseCSV(readFileSync(RIVERS_PATH, 'utf8'));
const quizRows = rows.filter((r) => Number(r.scalerank) <= 6);

// Pre-parse all rivers
const rivers = quizRows.map((row) => {
  const points = parsePathPoints(row.paths);
  const endpoints = pathEndpoints(points);
  return {
    name: row.name,
    id: row.id,
    scalerank: Number(row.scalerank),
    discharge: row.discharge_m3s !== '' ? Number(row.discharge_m3s) : null,
    lengthKm: row.length_km !== '' ? Number(row.length_km) : null,
    tributaryOf: row.tributary_of,
    distributaryOf: row.distributary_of,
    segmentOf: row.segment_of,
    points,
    endpoints,
  };
});

// Helper: best available "magnitude" for a river (discharge preferred, else length)
function magnitude(r) {
  return r.discharge ?? r.lengthKm ?? 0;
}

function magnitudeLabel(r) {
  if (r.discharge != null) return `${r.discharge.toLocaleString()} m³/s`;
  if (r.lengthKm != null) return `${r.lengthKm.toLocaleString()} km`;
  return 'unknown';
}

// ── Step 1: collect all endpoint→river connections ────────────────────────────

// For each (riverA, endpointLabel), find all rivers B where
// A's endpoint is within THRESHOLD_KM of B's polyline.
const connections = [];

for (const riverA of rivers) {
  if (!riverA.endpoints) continue;

  for (const { point, epLabel } of [
    { point: riverA.endpoints.start, epLabel: 'start' },
    { point: riverA.endpoints.end,   epLabel: 'end' },
  ]) {
    for (const riverB of rivers) {
      if (riverB.name === riverA.name) continue;
      if (riverB.points.length < 2) continue;

      const { dist } = minDistToPolyline(point, riverB.points);
      if (dist > THRESHOLD_KM) continue;

      // Distance from A's endpoint to B's two endpoints
      const distToBS = pointDistKm(point, riverB.endpoints.start);
      const distToBE = pointDistKm(point, riverB.endpoints.end);
      const minDistToBEndpoints = Math.min(distToBS, distToBE);

      const isEndpointMatch = minDistToBEndpoints <= ENDPOINT_MATCH_KM;

      connections.push({
        aName: riverA.name,
        aScalerank: riverA.scalerank,
        aMagnitude: magnitude(riverA),
        aMagnitudeLabel: magnitudeLabel(riverA),
        epLabel,
        bName: riverB.name,
        bScalerank: riverB.scalerank,
        bMagnitude: magnitude(riverB),
        bMagnitudeLabel: magnitudeLabel(riverB),
        distToPolyline: Math.round(dist * 10) / 10,
        distToBEndpoints: Math.round(minDistToBEndpoints * 10) / 10,
        isEndpointMatch,
        aKnownRelationship: riverA.tributaryOf || riverA.distributaryOf || riverA.segmentOf,
      });
    }
  }
}

// ── Step 2: deduplicate endpoint-to-polyline connections ─────────────────────
// For each (A, endpointLabel): keep only the closest B.
const bestMidpoint = new Map(); // key: `${A.name}|${epLabel}` → best connection
for (const conn of connections) {
  if (conn.isEndpointMatch) continue; // handled separately
  const key = `${conn.aName}|${conn.epLabel}`;
  const existing = bestMidpoint.get(key);
  if (!existing || conn.distToPolyline < existing.distToPolyline) {
    bestMidpoint.set(key, conn);
  }
}

// ── Step 3: cluster endpoint-to-endpoint connections ────────────────────────
// Collect all endpoint coordinates where isEndpointMatch = true,
// then group by geographic proximity to detect segments vs confluences.

// Map: `${A.name}|${epLabel}` → point
const epPointMap = new Map();
for (const r of rivers) {
  if (!r.endpoints) continue;
  epPointMap.set(`${r.name}|start`, r.endpoints.start);
  epPointMap.set(`${r.name}|end`, r.endpoints.end);
}

// Collect all endpoint-to-endpoint pairs
const endpointPairs = connections.filter((c) => c.isEndpointMatch);

// Find clusters: group river-endpoint pairs that all share the same meeting point.
// Simple O(n²) grouping: for each meeting point, find all other river endpoints within ENDPOINT_MATCH_KM.
const clustered = new Map(); // key: canonical cluster id → Set of `${riverName}|${epLabel}`

for (const conn of endpointPairs) {
  const aKey = `${conn.aName}|${conn.epLabel}`;
  const aPoint = epPointMap.get(aKey);
  if (!aPoint) continue;

  // Find the canonical cluster for this point (first matching cluster)
  let found = false;
  for (const [, members] of clustered) {
    for (const memberKey of members) {
      const memberPoint = epPointMap.get(memberKey);
      if (memberPoint && pointDistKm(aPoint, memberPoint) <= ENDPOINT_MATCH_KM) {
        members.add(aKey);
        members.add(`${conn.bName}|start`); // tentative — will refine below
        members.add(`${conn.bName}|end`);   // tentative
        found = true;
        break;
      }
    }
    if (found) break;
  }
  if (!found) {
    const id = `cluster_${clustered.size}`;
    clustered.set(id, new Set([aKey]));
  }
}

// Refine clusters: for each endpoint in a cluster, only keep the endpoint that is
// actually geographically close (within ENDPOINT_MATCH_KM) to the cluster centroid.
// Re-derive clusters cleanly from the endpointPairs.
const meetingPoints = []; // { rivers: Set<string> (river names), points: [...] }

for (const conn of endpointPairs) {
  const aKey = `${conn.aName}|${conn.epLabel}`;
  const aPoint = epPointMap.get(aKey);
  if (!aPoint) continue;

  // Determine which endpoint of B is close to aPoint
  const bStart = epPointMap.get(`${conn.bName}|start`);
  const bEnd   = epPointMap.get(`${conn.bName}|end`);
  const bStartDist = bStart ? pointDistKm(aPoint, bStart) : Infinity;
  const bEndDist   = bEnd   ? pointDistKm(aPoint, bEnd)   : Infinity;
  const bKey = bStartDist < bEndDist ? `${conn.bName}|start` : `${conn.bName}|end`;
  const bPoint = bStartDist < bEndDist ? bStart : bEnd;
  if (!bPoint) continue;

  // Find or create a meeting point cluster containing aPoint
  let cluster = meetingPoints.find((mp) => mp.points.some((p) => pointDistKm(aPoint, p) <= ENDPOINT_MATCH_KM));
  if (!cluster) {
    cluster = { rivers: new Set(), epKeys: new Set(), points: [] };
    meetingPoints.push(cluster);
  }
  cluster.rivers.add(conn.aName);
  cluster.rivers.add(conn.bName);
  cluster.epKeys.add(aKey);
  cluster.epKeys.add(bKey);
  if (!cluster.points.some((p) => pointDistKm(aPoint, p) <= 1)) cluster.points.push(aPoint);
  if (!cluster.points.some((p) => pointDistKm(bPoint, p) <= 1)) cluster.points.push(bPoint);
}

// ── Step 4: classify and print ───────────────────────────────────────────────

const allKnown = new Set([...KNOWN_TRIBUTARY_OF, ...KNOWN_DISTRIBUTARY_OF, ...KNOWN_SEGMENT_OF]);

// --- Midpoint connections (endpoint of A → midpoint of B) ---
// These are new tributary/distributary candidates (B is always main).
const midpointNew = [];
const midpointVerified = [];

for (const conn of bestMidpoint.values()) {
  if (allKnown.has(conn.aName)) {
    midpointVerified.push(conn);
  } else {
    midpointNew.push(conn);
  }
}

midpointNew.sort((a, b) => a.aScalerank - b.aScalerank || a.distToPolyline - b.distToPolyline);
midpointVerified.sort((a, b) => a.aScalerank - b.aScalerank || a.distToPolyline - b.distToPolyline);

console.log('═══════════════════════════════════════════════════════════════════════');
console.log(' ENDPOINT-TO-MIDPOINT CONNECTIONS  (A connects to middle of B → A is tributary/distributary of B)');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');
console.log('── NEW (not yet in enrichment maps) ───────────────────────────────────');

let lastSR = -1;
for (const c of midpointNew) {
  if (c.aScalerank !== lastSR) { console.log(`  [scalerank ${c.aScalerank}]`); lastSR = c.aScalerank; }
  const ratio = c.bMagnitude > 0 && c.aMagnitude > 0
    ? ` ratio ${Math.round(c.bMagnitude / c.aMagnitude)}:1`
    : '';
  console.log(`  ${c.aName} (${c.epLabel}) → ${c.bName}  [${c.distToPolyline} km]  A: ${c.aMagnitudeLabel}  B: ${c.bMagnitudeLabel}${ratio}`);
}

if (midpointNew.length === 0) console.log('  (none)');

console.log('');
console.log('── VERIFIED (already in enrichment maps) ──────────────────────────────');
lastSR = -1;
for (const c of midpointVerified) {
  if (c.aScalerank !== lastSR) { console.log(`  [scalerank ${c.aScalerank}]`); lastSR = c.aScalerank; }
  const knownAs = KNOWN_TRIBUTARY_OF.has(c.aName) ? 'tributary'
    : KNOWN_DISTRIBUTARY_OF.has(c.aName) ? 'distributary'
    : KNOWN_SEGMENT_OF.has(c.aName) ? 'segment'
    : '?';
  console.log(`  ✓ ${c.aName} [known ${knownAs}] (${c.epLabel}) → ${c.bName}  [${c.distToPolyline} km]`);
}
if (midpointVerified.length === 0) console.log('  (none)');

// --- Endpoint-to-endpoint connections (segment vs confluence) ---
console.log('');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log(' ENDPOINT-TO-ENDPOINT CONNECTIONS');
console.log(' 2 rivers meeting → SEGMENT candidate  |  3+ rivers meeting → CONFLUENCE (tributaries)');
console.log('═══════════════════════════════════════════════════════════════════════');
console.log('');

// Deduplicate: each cluster once
const printedClusters = new Set();

for (const cluster of meetingPoints) {
  const clusterKey = [...cluster.rivers].sort().join('|');
  if (printedClusters.has(clusterKey)) continue;
  printedClusters.add(clusterKey);

  const riverCount = cluster.rivers.size;
  const riverList = [...cluster.rivers].sort((a, b) => {
    // Sort by magnitude descending
    const ra = rivers.find((r) => r.name === a);
    const rb = rivers.find((r) => r.name === b);
    return (magnitude(rb ?? { discharge: 0, lengthKm: 0 }) - magnitude(ra ?? { discharge: 0, lengthKm: 0 }));
  });

  if (riverCount === 2) {
    const [nameA, nameB] = riverList;
    const rA = rivers.find((r) => r.name === nameA);
    const rB = rivers.find((r) => r.name === nameB);
    const knownA = allKnown.has(nameA) ? '✓' : ' ';
    const knownB = allKnown.has(nameB) ? '✓' : ' ';
    const label = (allKnown.has(nameA) || allKnown.has(nameB)) ? 'VERIFIED' : 'NEW';
    console.log(`  [${label}] SEGMENT? ${nameA} ↔ ${nameB}`);
    console.log(`       ${knownA} ${nameA}: ${magnitudeLabel(rA ?? { discharge: null, lengthKm: null })}`);
    console.log(`       ${knownB} ${nameB}: ${magnitudeLabel(rB ?? { discharge: null, lengthKm: null })}`);
  } else {
    // Confluence: highest-magnitude river is main, others are tributaries
    const [mainName, ...tribs] = riverList;
    const mainRiver = rivers.find((r) => r.name === mainName);
    const label = riverList.some((n) => allKnown.has(n)) ? 'VERIFIED' : 'NEW';
    console.log(`  [${label}] CONFLUENCE — main: ${mainName} (${magnitudeLabel(mainRiver ?? { discharge: null, lengthKm: null })})`);
    for (const tribName of tribs) {
      const tr = rivers.find((r) => r.name === tribName);
      const known = allKnown.has(tribName) ? '✓' : ' ';
      console.log(`       ${known} tributary: ${tribName} (${magnitudeLabel(tr ?? { discharge: null, lengthKm: null })})`);
    }
  }
  console.log('');
}

console.log(`Total rivers checked: ${rivers.length} (scalerank 0–6)`);
console.log(`Threshold: ${THRESHOLD_KM} km to polyline, ${ENDPOINT_MATCH_KM} km for endpoint matching`);
