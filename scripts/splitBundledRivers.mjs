/**
 * One-time migration: split bundled Natural Earth river paths into separate CSV rows.
 *
 * Natural Earth bundles nearby rivers into single features, and our generation
 * script's merge pass further combined groups with similar name prefixes. This
 * script re-processes the GeoJSON source to extract correct per-river paths,
 * then updates the existing CSV — preserving all manually-curated columns.
 *
 * Usage:
 *   node scripts/splitBundledRivers.mjs [--dry-run]
 *
 * Requires:
 *   scripts/source-data/rivers.geojson
 *   scripts/source-data/lakes.geojson
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const RIVERS_CSV = 'public/data/rivers/world-rivers.csv';
const RIVERS_GEOJSON = 'scripts/source-data/rivers.geojson';
const LAKES_GEOJSON = 'scripts/source-data/lakes.geojson';

// ── Simplification (matches generateRiverPaths.ts exactly) ───────────────────

const RIVER_EPSILON = 0.03;

function perpendicularDistance(point, lineStart, lineEnd) {
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

function douglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) { maxDist = dist; maxIndex = i; }
  }
  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[end]];
}

function roundCoord(n) { return Math.round(n * 100) / 100; }

function lineToPath(coords, epsilon) {
  const points = coords.map(([lng, lat]) => [lng, -lat]);
  const simplified = douglasPeucker(points, epsilon);
  if (simplified.length < 2) return '';
  const parts = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    parts.push(i === 0 ? `M ${roundCoord(x)} ${roundCoord(y)}` : `L ${roundCoord(x)} ${roundCoord(y)}`);
  }
  return parts.join(' ');
}

// ── Segment extraction (matches generateRiverPaths.ts) ──────────────────────

function extractSegments(geometry) {
  const segments = [];
  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates;
    if (coords.length >= 2) {
      const typed = coords.map(c => [c[0], c[1]]);
      segments.push({ coords: typed, start: typed[0], end: typed[typed.length - 1] });
    }
  } else if (geometry.type === 'MultiLineString') {
    for (const line of geometry.coordinates) {
      if (line.length >= 2) {
        const typed = line.map(c => [c[0], c[1]]);
        segments.push({ coords: typed, start: typed[0], end: typed[typed.length - 1] });
      }
    }
  }
  return segments;
}

function geoDist(a, b) {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function chainSegments(segments) {
  if (segments.length <= 1) return segments;
  const remaining = segments.map((seg, i) => ({ seg, reversed: false }));
  const chain = [{ seg: remaining[0].seg, reversed: false }];
  remaining.splice(0, 1);
  while (remaining.length > 0) {
    const lastSeg = chain[chain.length - 1];
    const lastEnd = lastSeg.reversed ? lastSeg.seg.start : lastSeg.seg.end;
    let bestIdx = -1, bestDist = Infinity, bestReversed = false;
    for (let i = 0; i < remaining.length; i++) {
      const d1 = geoDist(lastEnd, remaining[i].seg.start);
      const d2 = geoDist(lastEnd, remaining[i].seg.end);
      if (d1 < bestDist) { bestDist = d1; bestIdx = i; bestReversed = false; }
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; bestReversed = true; }
    }
    chain.push({ seg: remaining[bestIdx].seg, reversed: bestReversed });
    remaining.splice(bestIdx, 1);
  }
  return chain.map(({ seg, reversed }) => {
    if (!reversed) return seg;
    const rev = [...seg.coords].reverse();
    return { coords: rev, start: rev[0], end: rev[rev.length - 1] };
  });
}

// ── Length calculation (haversine, matches enrichRiversWithDischarge) ─────────

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pathLengthKm(pathStr) {
  // Skip closed polygon paths (lake fills)
  if (pathStr.trim().endsWith('Z')) return 0;
  const nums = pathStr.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 4) return 0;
  let total = 0;
  for (let i = 2; i < nums.length; i += 2) {
    const lng1 = parseFloat(nums[i - 2]);
    const lat1 = -parseFloat(nums[i - 1]); // SVG y = -lat
    const lng2 = parseFloat(nums[i]);
    const lat2 = -parseFloat(nums[i + 1]);
    total += haversineKm(lat1, lng1, lat2, lng2);
  }
  return total;
}

// ── Continent assignment (matches generateRiverPaths.ts) ─────────────────────

function assignContinent(lat, lng) {
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

// ── Midpoint calculation ─────────────────────────────────────────────────────

function midpointFromSegments(segments) {
  const allCoords = [];
  for (const seg of segments) {
    for (const c of seg.coords) allCoords.push(c);
  }
  if (allCoords.length === 0) return { lat: 0, lng: 0 };
  if (allCoords.length === 1) return { lat: allCoords[0][1], lng: allCoords[0][0] };
  const distances = [0];
  for (let i = 1; i < allCoords.length; i++) {
    const dlng = allCoords[i][0] - allCoords[i - 1][0];
    const dlat = allCoords[i][1] - allCoords[i - 1][1];
    distances.push(distances[i - 1] + Math.sqrt(dlng * dlng + dlat * dlat));
  }
  const total = distances[distances.length - 1];
  if (total === 0) return { lat: allCoords[0][1], lng: allCoords[0][0] };
  const target = 0.5 * total;
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= target) {
      const segLen = distances[i] - distances[i - 1];
      const frac = segLen > 0 ? (target - distances[i - 1]) / segLen : 0;
      return {
        lat: allCoords[i - 1][1] + frac * (allCoords[i][1] - allCoords[i - 1][1]),
        lng: allCoords[i - 1][0] + frac * (allCoords[i][0] - allCoords[i - 1][0]),
      };
    }
  }
  const last = allCoords[allCoords.length - 1];
  return { lat: last[1], lng: last[0] };
}

// ── CSV helpers ──────────────────────────────────────────────────────────────

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
  return { cols, rows };
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

function escapeCsvField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('|') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowToCsv(row, cols) {
  return cols.map(col => escapeCsvField(row[col] ?? '')).join(',');
}

// ── Generate paths for a set of GeoJSON features ─────────────────────────────

function generatePaths(features) {
  const allSegments = [];
  for (const f of features) {
    allSegments.push(...extractSegments(f.geometry));
  }
  if (allSegments.length === 0) return { paths: '', segments: [], midpoint: { lat: 0, lng: 0 } };

  const chained = chainSegments(allSegments);
  const pathStrs = [];
  for (const seg of chained) {
    const p = lineToPath(seg.coords.map(c => [c[0], c[1]]), RIVER_EPSILON);
    if (p) pathStrs.push(p);
  }
  const midpoint = midpointFromSegments(chained);
  return { paths: pathStrs.join('|'), segments: chained, midpoint };
}

// ── ID generation ────────────────────────────────────────────────────────────

function makeId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT MANIFEST
// ═══════════════════════════════════════════════════════════════════════════════
//
// Each entry: the existing CSV row to modify, and rivers to extract from it.
// geoJsonNames: names to match in GeoJSON (checked against name, name_en, name_alt)
//
// mergeIntoId: if set, don't create a new row — append extracted paths to this
//              existing row instead.
// skipCreate:  if true, just remove paths from parent without creating/merging.

const SPLITS = [
  {
    existingId: 'mississippi-156',
    extract: [
      { geoJsonNames: ['Missouri'], newName: 'Missouri', tributaryOf: 'Mississippi', wikipedia: 'Missouri_River' },
    ],
  },
  {
    existingId: 'mountain-nile-14',
    extract: [
      { geoJsonNames: ['Blue Nile'], newName: 'Blue Nile', tributaryOf: 'Nile', mergeIntoId: 'abay-67', wikipedia: 'Blue_Nile' },
    ],
  },
  {
    existingId: 'paranaiba-108',
    extract: [
      // Paraná already has its own row — just remove its geometry from Paranaíba
      { geoJsonNames: ['Paraná'], skipCreate: true },
    ],
  },
  {
    existingId: 'mur-208',
    extract: [
      { geoJsonNames: ['Drava', 'Drau'], newName: 'Drava', tributaryOf: 'Danube', wikipedia: 'Drava' },
      { geoJsonNames: ['Mures'], newName: 'Mureș', tributaryOf: 'Tisa', wikipedia: 'Mureș_(river)' },
    ],
  },
  {
    existingId: 'don-277',
    extract: [
      { geoJsonNames: ['Donets'], newName: 'Donets', tributaryOf: 'Don', wikipedia: 'Seversky_Donets' },
    ],
  },
  {
    existingId: 'cuanza-448',
    extract: [
      { geoJsonNames: ['Cuando'], newName: 'Cuando', wikipedia: 'Cuando_River' },
    ],
  },
  {
    existingId: 'guadiana-395',
    extract: [
      { geoJsonNames: ['Guadalquivir'], newName: 'Guadalquivir', wikipedia: 'Guadalquivir' },
    ],
  },
  {
    existingId: 'mananantanana-298',
    extract: [
      { geoJsonNames: ['Mangoky'], newName: 'Mangoky', wikipedia: 'Mangoky_River' },
      { geoJsonNames: ['Mania'], newName: 'Mania', wikipedia: 'Mania_River' },
    ],
  },
  {
    existingId: 'waikato-2039',
    extract: [
      { geoJsonNames: ['Waihou'], newName: 'Waihou', wikipedia: 'Waihou_River' },
      { geoJsonNames: ['Waitoa'], newName: 'Waitoa', wikipedia: 'Waitoa_River' },
      // Wairoa already exists as wairoa-2042
      { geoJsonNames: ['Wairoa'], skipCreate: true },
    ],
  },
  {
    existingId: 'wairau-2041',
    extract: [
      { geoJsonNames: ['Waimakariri'], newName: 'Waimakariri', wikipedia: 'Waimakariri_River' },
      // Waiau already exists as waiau-1000
      { geoJsonNames: ['Waiau'], skipCreate: true },
    ],
  },
  {
    existingId: 'whanganui-2048',
    extract: [
      { geoJsonNames: ['Whangaehu'], newName: 'Whangaehu', wikipedia: 'Whangaehu_River' },
      { geoJsonNames: ['Whakatane'], newName: 'Whakatane', wikipedia: 'Whakatane_River' },
    ],
  },
  {
    existingId: 'rangitikei-1091',
    extract: [
      { geoJsonNames: ['Rangitaiki'], newName: 'Rangitaiki', wikipedia: 'Rangitaiki_River' },
    ],
  },
  {
    existingId: 'gamka-1039',
    extract: [
      { geoJsonNames: ['Gamtoos'], newName: 'Gamtoos', segmentOf: 'Gamka', wikipedia: 'Gamtoos_River' },
    ],
  },
  {
    existingId: 'madeira-291',
    extract: [
      { geoJsonNames: ['Madre de Dios'], newName: 'Madre de Dios', tributaryOf: 'Madeira', wikipedia: 'Madre_de_Dios_River' },
    ],
  },
  {
    existingId: 'chattahoochee-250',
    extract: [
      { geoJsonNames: ['Chattooga'], newName: 'Chattooga', wikipedia: 'Chattooga_River' },
    ],
  },
  {
    existingId: 'sreng-483',
    extract: [
      { geoJsonNames: ['Srepok'], newName: 'Srepok', tributaryOf: 'Mekong', wikipedia: 'Srepok_River' },
    ],
  },
  {
    existingId: 'bandama-417',
    extract: [
      { geoJsonNames: ['Bandama Blanc'], newName: 'Bandama Blanc', wikipedia: 'White_Bandama' },
    ],
  },
  {
    existingId: 'drina-1133',
    extract: [
      { geoJsonNames: ['Drin'], newName: 'Drin', wikipedia: 'Drin_(river)' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

if (!existsSync(RIVERS_GEOJSON) || !existsSync(LAKES_GEOJSON)) {
  console.error('Missing GeoJSON source files. Download with:');
  console.error('  curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson -o scripts/source-data/rivers.geojson');
  console.error('  curl -L https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson -o scripts/source-data/lakes.geojson');
  process.exit(1);
}

// Load GeoJSON
const geo = JSON.parse(readFileSync(RIVERS_GEOJSON, 'utf8'));
const riverFeatures = geo.features.filter(f => f.properties.featurecla === 'River');
console.log(`Loaded ${riverFeatures.length} river features from GeoJSON`);

// Load existing CSV
const csvText = readFileSync(RIVERS_CSV, 'utf8');
const { cols, rows } = parseCSV(csvText);
console.log(`Loaded ${rows.length} rows from CSV (${cols.length} columns)`);

// Index CSV rows by id
const rowById = new Map();
for (const row of rows) {
  rowById.set(row.id, row);
}

// Find GeoJSON features by name
function findFeatures(names) {
  return riverFeatures.filter(f => {
    const n = f.properties.name || '';
    const ne = f.properties.name_en || '';
    const na = (f.properties.name_alt || '').toString();
    for (const search of names) {
      if (n === search || ne === search) return true;
      if (na.split(/[;,|]/).map(s => s.trim()).includes(search)) return true;
    }
    return false;
  });
}

// Helper: match generated path against existing row's pipe-separated paths
function removePathsFromRow(row, pathsToRemove) {
  const existingPaths = splitPaths(row.paths);
  const removePaths = splitPaths(pathsToRemove);

  // Try exact string match first
  const remaining = [];
  const matched = new Set();

  for (const ep of existingPaths) {
    let found = false;
    for (let i = 0; i < removePaths.length; i++) {
      if (!matched.has(i) && ep === removePaths[i]) {
        matched.add(i);
        found = true;
        break;
      }
    }
    if (!found) remaining.push(ep);
  }

  // If exact match didn't find enough, try bounding-box proximity
  if (matched.size < removePaths.length) {
    const stillToRemove = removePaths.filter((_, i) => !matched.has(i));
    const finalRemaining = [];
    for (const ep of remaining) {
      const epBB = pathBoundingBox(ep);
      let shouldRemove = false;
      for (let i = 0; i < stillToRemove.length; i++) {
        const rpBB = pathBoundingBox(stillToRemove[i]);
        if (bboxOverlap(epBB, rpBB) > 0.8) {
          stillToRemove.splice(i, 1);
          shouldRemove = true;
          break;
        }
      }
      if (!shouldRemove) finalRemaining.push(ep);
    }
    return finalRemaining.join('|');
  }

  return remaining.join('|');
}

function splitPaths(pathsStr) {
  if (!pathsStr) return [];
  // Split on | but not inside quoted CSV fields (paths use M/L/Z, not quotes)
  // Each path starts with M, so split before M that follows a non-space
  const parts = [];
  let current = '';
  const raw = pathsStr.split('|');
  // Actually pipe is our delimiter already
  return raw.filter(Boolean);
}

function pathBoundingBox(pathStr) {
  const nums = pathStr.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 2) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

function bboxOverlap(a, b) {
  // Fraction of b's area that overlaps with a
  const overlapX = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
  const overlapY = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
  const bArea = (b.maxX - b.minX) * (b.maxY - b.minY);
  if (bArea === 0) return 0;
  return (overlapX * overlapY) / bArea;
}

// Recalculate latitude, longitude, length_km from paths string
function recalcFromPaths(pathsStr) {
  const paths = splitPaths(pathsStr);
  let totalLen = 0;
  for (const p of paths) totalLen += pathLengthKm(p);

  // Midpoint from first non-polygon path
  const linePaths = paths.filter(p => !p.trim().endsWith('Z'));
  if (linePaths.length === 0) return { lat: 0, lng: 0, length: 0 };

  // Simple midpoint: average of all coords weighted by nothing (good enough)
  const allNums = linePaths.join(' ').match(/-?\d+\.?\d*/g);
  if (!allNums || allNums.length < 2) return { lat: 0, lng: 0, length: totalLen };

  // Use the path midpoint approach: find the middle point along the concatenated path
  let coords = [];
  for (const p of linePaths) {
    const nums = p.match(/-?\d+\.?\d*/g);
    if (!nums) continue;
    for (let i = 0; i < nums.length; i += 2) {
      coords.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
    }
  }
  if (coords.length === 0) return { lat: 0, lng: 0, length: totalLen };

  const mid = coords[Math.floor(coords.length / 2)];
  return {
    lat: Math.round(-mid[1] * 100) / 100,  // SVG y = -lat
    lng: Math.round(mid[0] * 100) / 100,
    length: Math.round(totalLen),
  };
}

// ── Process each split ──────────────────────────────────────────────────────

const newRows = [];
const summary = [];

for (const split of SPLITS) {
  const existingRow = rowById.get(split.existingId);
  if (!existingRow) {
    console.error(`WARNING: existing row '${split.existingId}' not found in CSV — skipping`);
    continue;
  }

  const originalPathCount = splitPaths(existingRow.paths).length;
  let currentPaths = existingRow.paths;

  for (const ext of split.extract) {
    const features = findFeatures(ext.geoJsonNames);
    if (features.length === 0) {
      console.error(`WARNING: no GeoJSON features found for ${ext.geoJsonNames.join('/')} — skipping`);
      continue;
    }

    const scalerank = Math.min(...features.map(f => f.properties.scalerank));
    const { paths: extractedPaths, segments, midpoint } = generatePaths(features);
    if (!extractedPaths) {
      console.error(`WARNING: no paths generated for ${ext.geoJsonNames.join('/')} — skipping`);
      continue;
    }

    const extractedPathCount = splitPaths(extractedPaths).length;

    // Remove extracted paths from existing row
    const before = splitPaths(currentPaths).length;
    currentPaths = removePathsFromRow({ paths: currentPaths }, extractedPaths);
    const after = splitPaths(currentPaths).length;
    const removed = before - after;

    if (ext.skipCreate) {
      summary.push(`  ${split.existingId}: removed ${removed} paths for ${ext.geoJsonNames.join('/')} (already has own row)`);
      continue;
    }

    if (ext.mergeIntoId) {
      // Append paths to existing row
      const targetRow = rowById.get(ext.mergeIntoId);
      if (!targetRow) {
        console.error(`WARNING: merge target '${ext.mergeIntoId}' not found — creating new row instead`);
      } else {
        const existingTargetPaths = targetRow.paths;
        targetRow.paths = existingTargetPaths ? existingTargetPaths + '|' + extractedPaths : extractedPaths;
        const recalc = recalcFromPaths(targetRow.paths);
        targetRow.latitude = String(recalc.lat);
        targetRow.longitude = String(recalc.lng);
        targetRow.length_km = String(recalc.length);
        summary.push(`  ${split.existingId}: removed ${removed} paths for ${ext.newName}, merged into ${ext.mergeIntoId} (+${extractedPathCount} paths)`);
        continue;
      }
    }

    // Create new row
    const lat = Math.round(midpoint.lat * 100) / 100;
    const lng = Math.round(midpoint.lng * 100) / 100;
    let lengthKm = 0;
    for (const p of splitPaths(extractedPaths)) lengthKm += pathLengthKm(p);

    const newRow = {};
    for (const col of cols) newRow[col] = '';
    newRow.id = makeId(ext.newName);
    newRow.name = ext.newName;
    newRow.name_alternates = '';
    newRow.continent = assignContinent(lat, lng);
    newRow.scalerank = String(scalerank);
    newRow.paths = extractedPaths;
    newRow.latitude = String(lat);
    newRow.longitude = String(lng);
    newRow.label_t = '';
    newRow.label_position = '';
    newRow.discharge_m3s = '';
    newRow.discharge_rank = '';
    newRow.tributary_of = ext.tributaryOf || '';
    newRow.distributary_of = '';
    newRow.segment_of = ext.segmentOf || '';
    newRow.length_km = String(Math.round(lengthKm));
    newRow.total_length_km = '';
    newRow.wikipedia = ext.wikipedia || '';

    // Check for ID collision
    if (rowById.has(newRow.id)) {
      newRow.id = newRow.id + '-new';
    }

    newRows.push(newRow);
    summary.push(`  ${split.existingId}: removed ${removed} paths for ${ext.newName} → new row '${newRow.id}' (${extractedPathCount} paths, ${Math.round(lengthKm)}km)`);
  }

  // Update existing row's paths and recalculate
  const remainingPathCount = splitPaths(currentPaths).length;
  existingRow.paths = currentPaths;
  const recalc = recalcFromPaths(currentPaths);
  existingRow.latitude = String(recalc.lat);
  existingRow.longitude = String(recalc.lng);
  existingRow.length_km = String(recalc.length);

  summary.push(`  ${split.existingId} (${existingRow.name}): ${originalPathCount} paths → ${remainingPathCount} paths`);
}

// Add new rows to the CSV
for (const newRow of newRows) {
  rows.push(newRow);
}

// ── Output ──────────────────────────────────────────────────────────────────

console.log('\nSplit summary:');
for (const line of summary) console.log(line);
console.log(`\nNew rows created: ${newRows.length}`);
console.log(`Total rows: ${rows.length}`);

if (DRY_RUN) {
  console.log('\n(dry run — no files modified)');
} else {
  // Backup
  writeFileSync(RIVERS_CSV + '.bak', csvText);
  console.log(`\nBackup written to ${RIVERS_CSV}.bak`);

  // Write updated CSV
  const header = cols.join(',');
  const csvRows = rows.map(r => rowToCsv(r, cols));
  writeFileSync(RIVERS_CSV, header + '\n' + csvRows.join('\n') + '\n');
  console.log(`Written ${rows.length} rows to ${RIVERS_CSV}`);
}
