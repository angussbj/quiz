/**
 * Enrich world-rivers.csv with discharge volume, tributary, and length data.
 *
 * Adds five columns:
 *   discharge_m3s    — mean annual discharge in m³/s (blank if unknown)
 *   discharge_rank   — rank by discharge (1 = highest); for rivers with multiple
 *                      path segments, only the lowest-scalerank segment is ranked.
 *   tributary_of     — name of the direct parent river (blank if top-level)
 *   length_km        — estimated length of this row's path in km
 *   total_length_km  — river's own length + all direct tributary lengths, recursively;
 *                      only set on the lowest-scalerank row per river name
 *
 * Discharge values are approximate means sourced from Wikipedia's
 * "List of rivers by discharge" and linked articles. Upper-course segments
 * of major rivers (e.g. Tongtian = upper Yangtze) are given their realistic
 * upstream discharge rather than the main stem's total.
 *
 * Branches and deltas (e.g. "Damietta Branch") are intentionally blank.
 *
 * Usage: node scripts/enrichRiversWithDischarge.mjs
 *
 * Reads/writes: public/data/rivers/world-rivers.csv (in-place)
 */

import { readFileSync, writeFileSync } from 'fs';

const RIVERS_PATH = 'public/data/rivers/world-rivers.csv';

// Mean annual discharge in m³/s, keyed by the river name as it appears in
// world-rivers.csv. Upper-course segments use their own upstream discharge,
// not the main stem total. Sources: Wikipedia "List of rivers by discharge".
const DISCHARGE = {
  // ── Amazon system ───────────────────────────────────────────────────────
  'Amazonas':        209000,
  'Ucayali':           8000,  // Amazon tributary
  'Madeira':          31200,  // Amazon tributary — largest by discharge
  'Negro':            28400,  // Amazon tributary (Brazilian Negro)
  'Mamoré':            4700,  // Madeira tributary
  'Guaporé':            870,  // Madeira headwater
  'Araguaia':          5510,  // Tocantins tributary
  'Tocantins':        11300,
  'Orinoco':          30000,
  'Paraná':           17000,
  'Paraguay':          4500,  // Paraná tributary
  'Uruguay':           5000,  // flows into Río de la Plata estuary
  'Magdalena':         7500,

  // ── Congo system ────────────────────────────────────────────────────────
  'Congo':            41000,
  'Lualaba':          10000,  // upper Congo (upstream of main tributaries)
  'Kasai':             9000,  // Congo tributary
  'Ubangi':            4000,  // Congo tributary
  'Kibali':             500,  // Uele tributary → Ubangi → Congo
  'Uele':              1500,  // Ubangi tributary

  // ── Nile system ─────────────────────────────────────────────────────────
  'Nile':              2830,
  'Abay':              1548,  // Blue Nile
  'Kagera':             230,  // drains into Lake Victoria (White Nile headwater)
  'Albert Nile':        700,  // upper Nile leaving Lake Albert

  // ── Yangtze system ──────────────────────────────────────────────────────
  'Yangtze':          30166,
  'Tongtian':          2500,  // upper Yangtze (before main tributaries)
  'Tuotuo':             120,  // headwater of Yangtze
  'Han':               1830,  // Yangtze tributary (China)

  // ── Yenisei system ──────────────────────────────────────────────────────
  'Yenisey':          19600,
  'Angara':            4530,  // Yenisei tributary, outflow of Lake Baikal
  'Verkhniy Yenisey':  1050,  // upper Yenisei
  'Malyy Yenisey':      500,  // upper Yenisei headwater
  'Kyzyl-Khem':         200,  // Yenisei headwater
  'Selenga':            935,  // flows into Lake Baikal

  // ── Brahmaputra system ──────────────────────────────────────────────────
  'Brahmaputra':      19800,
  'Dihang':            5000,  // upper Brahmaputra (before plains tributaries)
  'Damqogkanbab':       200,  // Brahmaputra headwater
  'Shiquan':            400,  // Brahmaputra headwater segment

  // ── Mekong system ───────────────────────────────────────────────────────
  'Mekong':           16000,
  'Ideriyn':            200,  // Mekong headwater
  'Za':                 300,  // Mekong headwater

  // ── Yellow River ────────────────────────────────────────────────────────
  'Huang':             1365,
  'Wei':                490,  // Yellow River tributary (China)

  // ── Pearl River ─────────────────────────────────────────────────────────
  'Xi':                7650,  // Pearl River
  'Hongshui':          1800,  // Pearl River tributary
  'Nanpan':             600,  // Pearl River headwater
  'Xun':               3800,  // Pearl River tributary

  // ── Irrawaddy ───────────────────────────────────────────────────────────
  'Irrawaddy Delta':  13000,
  'Nmai':               450,  // Irrawaddy headwater

  // ── Indus system ────────────────────────────────────────────────────────
  'Indus':             7160,
  'Chenab':            1000,  // Indus tributary
  'Jhelum':             970,  // Indus tributary

  // ── Ganges system ───────────────────────────────────────────────────────
  'Ganges':           12015,
  'Yamuna':            2950,  // Ganges tributary
  'Chambal':            625,  // Yamuna tributary
  'Gomti':              234,  // Ganges tributary

  // ── Indian rivers ───────────────────────────────────────────────────────
  'Godavari':          3000,
  'Krishna':           1400,
  'Mahanadi':          1600,

  // ── Other major rivers (standalone) ────────────────────────────────────
  'Lena':             17175,
  'Mississippi':      16792,
  'Ob':               12500,
  'Amur':             11400,
  'St. Lawrence':     10100,
  'Mackenzie':        10000,
  'Niger':             9250,
  'Ohio':              8294,
  'Volga':             8080,
  'Columbia':          7500,
  'Danube':            6500,
  'Yukon':             6340,
  'Niagara':           5720,  // Lake Erie outflow
  'Aldan':             5060,  // Lena tributary
  'Pechora':           4100,
  'Kama':              4100,  // Volga tributary
  'Kolyma':            3800,
  'Slave':             3400,  // Mackenzie tributary
  'Zambezi':           3400,
  'Severnaya Dvina':   3332,
  'Volta':             1200,
  'Rhein':             2900,
  'São  Francisco':    2850,  // note: two spaces in CSV name
  'Benue':             2000,  // Niger tributary
  'Bénoué':            2000,  // Benue (French spelling in CSV)
  'Nelson':            2370,
  'Peace':             2000,  // Slave/Mackenzie tributary
  'Shatt al Arab':     1750,  // Tigris+Euphrates confluence at mouth
  'Salween':           1494,
  'Don':                900,
  'Loire':              900,
  'Po':                1500,
  'Vistula':           1050,
  'Elbe':               870,
  'Kura':               570,
  'Dniester':           310,
  'Oka':               1250,  // Volga tributary
  'Paranaíba':         1200,  // Paraná headwater
  'Euphrates':          848,
  'Al Furat':           848,  // Euphrates (Arabic)
  'Firat':              848,  // Euphrates (Turkish)
  'Tigris':             840,
  'Dicle':              840,  // Tigris (Turkish)
  'Ertis':              960,  // Irtysh, Ob tributary
  'Murray':             767,  // Australia
  'Colorado':           640,  // USA
  'Arkansas':          1060,
  'Missouri':          2300,
  'La Grande':         1600,  // Quebec
  'Sénégal':            680,
  'Bafing':            1850,  // Sénégal headwater
  'Dnieper':           1700,
  'Dnepre':            1700,  // alternate spelling
  'Oder':               570,
  'Saskatchewan':       450,
  'North Saskatchewan': 220,
  'Orange':             365,
  'Ural':               400,
  'Seine':              490,
  'Vaal':               180,  // Orange tributary
  'Sukhona':            430,  // Severnaya Dvina headwater
  'Allegheny':          680,  // Ohio tributary
  'Darling':             30,  // Murray-Darling (highly variable)
  'Barwon':             500,
  'Teslin':             175,  // Yukon tributary
  'Ergun':              300,  // Amur tributary (Argun)
  'Hailar':             100,  // Ergun tributary
  'Okavango':           500,  // drains into Okavango Delta
  'Limpopo':            170,
  'Gambia':             100,
  'Pilcomayo':          550,  // Paraguay tributary
  'Amu Darya':         2525,
  'Syr Darya':          700,
};

// Direct parent river for each tributary. One level only — each river points to its
// immediate parent. Rivers not listed here are considered top-level (standalone).
const TRIBUTARY_OF = {
  // ── Amazon system ───────────────────────────────────────────────────────
  'Ucayali':    'Amazonas',
  'Madeira':    'Amazonas',
  'Negro':      'Amazonas',
  'Mamoré':     'Madeira',
  'Guaporé':    'Mamoré',
  'Araguaia':   'Tocantins',
  'Paraguay':   'Paraná',
  'Pilcomayo':  'Paraguay',

  // ── Congo system ────────────────────────────────────────────────────────
  'Lualaba':    'Congo',
  'Kasai':      'Congo',
  'Ubangi':     'Congo',
  'Uele':       'Ubangi',
  'Kibali':     'Uele',

  // ── Nile system ─────────────────────────────────────────────────────────
  'Abay':       'Nile',
  'Kagera':     'Nile',
  'Albert Nile': 'Nile',

  // ── Yangtze system ──────────────────────────────────────────────────────
  'Tongtian':   'Yangtze',
  'Tuotuo':     'Tongtian',
  'Han':        'Yangtze',

  // ── Yenisei system ──────────────────────────────────────────────────────
  'Angara':           'Yenisey',
  'Verkhniy Yenisey': 'Yenisey',
  'Malyy Yenisey':    'Yenisey',
  'Kyzyl-Khem':       'Yenisey',
  'Selenga':          'Angara',

  // ── Brahmaputra system ──────────────────────────────────────────────────
  'Dihang':         'Brahmaputra',
  'Damqogkanbab':   'Brahmaputra',
  'Shiquan':        'Brahmaputra',

  // ── Mekong headwaters ───────────────────────────────────────────────────
  'Ideriyn':    'Mekong',
  'Za':         'Mekong',

  // ── Yellow River ────────────────────────────────────────────────────────
  'Wei':        'Huang',

  // ── Pearl River ─────────────────────────────────────────────────────────
  'Hongshui':   'Xi',
  'Nanpan':     'Hongshui',
  'Xun':        'Xi',

  // ── Irrawaddy ───────────────────────────────────────────────────────────
  'Nmai':       'Irrawaddy Delta',

  // ── Indus system ────────────────────────────────────────────────────────
  'Chenab':     'Indus',
  'Jhelum':     'Indus',

  // ── Ganges system ───────────────────────────────────────────────────────
  'Yamuna':     'Ganges',
  'Chambal':    'Yamuna',
  'Gomti':      'Ganges',

  // ── Niger ───────────────────────────────────────────────────────────────
  'Benue':      'Niger',
  'Bénoué':     'Niger',

  // ── Mississippi system ──────────────────────────────────────────────────
  'Missouri':   'Mississippi',
  'Ohio':       'Mississippi',
  'Arkansas':   'Mississippi',
  'Allegheny':  'Ohio',

  // ── Mackenzie system ────────────────────────────────────────────────────
  'Slave':      'Mackenzie',
  'Peace':      'Slave',

  // ── Lena ────────────────────────────────────────────────────────────────
  'Aldan':      'Lena',

  // ── Amur ────────────────────────────────────────────────────────────────
  'Ergun':      'Amur',
  'Hailar':     'Ergun',

  // ── Ob ──────────────────────────────────────────────────────────────────
  'Ertis':      'Ob',

  // ── Volga ───────────────────────────────────────────────────────────────
  'Kama':       'Volga',
  'Oka':        'Volga',

  // ── Danube ──────────────────────────────────────────────────────────────
  // (major tributaries not in dataset)

  // ── Sénégal ─────────────────────────────────────────────────────────────
  'Bafing':     'Sénégal',

  // ── Orange ──────────────────────────────────────────────────────────────
  'Vaal':       'Orange',

  // ── Severnaya Dvina ─────────────────────────────────────────────────────
  'Sukhona':    'Severnaya Dvina',

  // ── Paraná ──────────────────────────────────────────────────────────────
  'Paranaíba':  'Paraná',

  // ── Yukon ───────────────────────────────────────────────────────────────
  'Teslin':     'Yukon',

  // ── Murray-Darling ──────────────────────────────────────────────────────
  'Darling':    'Murray',
  'Barwon':     'Darling',

  // ── Saskatchewan ────────────────────────────────────────────────────────
  'North Saskatchewan': 'Saskatchewan',
};

// ── CSV helpers ──────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n');
  const header = lines[0];
  const cols = parseCSVRow(header);
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

function formatCSVValue(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function toCSV(cols, rows) {
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((col) => formatCSVValue(row[col] ?? '')).join(','));
  }
  return lines.join('\n') + '\n';
}

// ── Geographic distance ───────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine great-circle distance in km between two lat/lng points (degrees).
 * Mirrors src/scoring/calculateGreatCircleDistance.ts.
 */
function greatCircleDistanceKm(lat1, lng1, lat2, lng2) {
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
 * Compute the great-circle distance in km between two SVG path coordinate points.
 * In these paths: x = longitude (degrees), y = -latitude (degrees, SVG north-is-up convention).
 */
function geoDistanceKm(x1, y1, x2, y2) {
  return greatCircleDistanceKm(-y1, x1, -y2, x2);
}

/**
 * Compute the total length in km from a raw `paths` CSV cell value.
 * The `paths` column contains pipe-separated SVG path `d` strings.
 * Closed paths (ending with Z) are skipped — those are lake polygons embedded
 * in river data, not the river line itself.
 */
function computePathLengthKm(rawPaths) {
  if (!rawPaths) return 0;
  const pathParts = rawPaths.split('|').map((s) => s.trim()).filter(Boolean);
  let totalKm = 0;

  for (const pathD of pathParts) {
    // Skip closed polygons (lake shapes embedded in river paths)
    if (pathD.trimEnd().endsWith('Z')) continue;

    // Split into M/L command segments
    const segments = pathD.split(/(?=[ML])/);
    const coords = [];
    for (const seg of segments) {
      const nums = seg.slice(1).trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        coords.push({ x: nums[0], y: nums[1] });
      }
    }

    for (let i = 1; i < coords.length; i++) {
      totalKm += geoDistanceKm(coords[i - 1].x, coords[i - 1].y, coords[i].x, coords[i].y);
    }
  }

  return Math.round(totalKm);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const text = readFileSync(RIVERS_PATH, 'utf8');
const { cols, rows } = parseCSV(text);

// Strip any existing enrichment columns before re-adding
const ENRICHED_COLS = ['discharge_m3s', 'discharge_rank', 'tributary_of', 'length_km', 'total_length_km'];
const baseCols = cols.filter((c) => !ENRICHED_COLS.includes(c));
for (const row of rows) {
  for (const col of ENRICHED_COLS) delete row[col];
}

// ── Discharge ────────────────────────────────────────────────────────────────

for (const row of rows) {
  const discharge = DISCHARGE[row.name];
  row.discharge_m3s = discharge != null ? String(discharge) : '';
}

// For rivers with multiple segments (same name), only rank the lowest scalerank.
const bestScalerankByName = {};
for (const row of rows) {
  if (row.discharge_m3s === '') continue;
  const rank = Number(row.scalerank);
  if (!(row.name in bestScalerankByName) || rank < bestScalerankByName[row.name]) {
    bestScalerankByName[row.name] = rank;
  }
}

const rankable = rows.filter((r) => {
  if (r.discharge_m3s === '') return false;
  return Number(r.scalerank) === bestScalerankByName[r.name];
});

rankable.sort((a, b) => Number(b.discharge_m3s) - Number(a.discharge_m3s));
rankable.forEach((row, i) => { row.discharge_rank = String(i + 1); });

for (const row of rows) {
  if (!row.discharge_rank) row.discharge_rank = '';
}

// ── Tributary relationships ───────────────────────────────────────────────────

for (const row of rows) {
  row.tributary_of = TRIBUTARY_OF[row.name] ?? '';
}

// ── Length ───────────────────────────────────────────────────────────────────

for (const row of rows) {
  const km = computePathLengthKm(row.paths);
  row.length_km = km > 0 ? String(km) : '';
}

// Sum all path-segment lengths per named river (a river may have multiple rows)
const totalLengthByName = {};
for (const row of rows) {
  if (!row.length_km) continue;
  const km = Number(row.length_km);
  totalLengthByName[row.name] = (totalLengthByName[row.name] ?? 0) + km;
}

// Recursively compute total_length_km (own length + all tributaries, recursively)
const totalLengthKmCache = {};
function totalLengthKm(name) {
  if (name in totalLengthKmCache) return totalLengthKmCache[name];
  const own = totalLengthByName[name] ?? 0;
  // Find all rivers whose direct parent is this river
  const children = Object.entries(TRIBUTARY_OF)
    .filter(([, parent]) => parent === name)
    .map(([child]) => child);
  const childTotal = children.reduce((sum, child) => sum + totalLengthKm(child), 0);
  const result = own + childTotal;
  totalLengthKmCache[name] = result;
  return result;
}

// Assign total_length_km only to the lowest-scalerank row per name
const bestScalerankForLength = {};
for (const row of rows) {
  const rank = Number(row.scalerank);
  if (!(row.name in bestScalerankForLength) || rank < bestScalerankForLength[row.name]) {
    bestScalerankForLength[row.name] = rank;
  }
}

for (const row of rows) {
  row.total_length_km = '';
}
for (const row of rows) {
  if (Number(row.scalerank) !== bestScalerankForLength[row.name]) continue;
  if (totalLengthByName[row.name] == null) continue; // skip rivers with no path data
  // Avoid duplicates when multiple rows share the same name+scalerank
  if (row.total_length_km !== '') continue;
  const total = totalLengthKm(row.name);
  if (total > 0) row.total_length_km = String(total);
}

// ── Write CSV ────────────────────────────────────────────────────────────────

const newCols = [...baseCols, 'discharge_m3s', 'discharge_rank', 'tributary_of', 'length_km', 'total_length_km'];
writeFileSync(RIVERS_PATH, toCSV(newCols, rows));

// ── Report ───────────────────────────────────────────────────────────────────

const ranked = rows.filter((r) => r.discharge_rank !== '');
ranked.sort((a, b) => Number(a.discharge_rank) - Number(b.discharge_rank));
console.log(`Ranked ${ranked.length} rivers by discharge.`);
console.log('Top 20:');
ranked.slice(0, 20).forEach((r) => {
  const tributaryLabel = r.tributary_of ? ` [trib. of ${r.tributary_of}]` : '';
  console.log(`  ${r.discharge_rank.padStart(2)}. ${r.name}${tributaryLabel} (scalerank ${r.scalerank}): ${Number(r.discharge_m3s).toLocaleString()} m³/s`);
});

console.log('');
console.log('Longest rivers (by total_length_km):');
const withLength = rows.filter((r) => r.total_length_km !== '');
withLength.sort((a, b) => Number(b.total_length_km) - Number(a.total_length_km));
withLength.slice(0, 20).forEach((r) => {
  const tributaryLabel = r.tributary_of ? ` [trib. of ${r.tributary_of}]` : '';
  console.log(`  ${r.name}${tributaryLabel}: own=${r.length_km}km  total=${r.total_length_km}km`);
});

// Build name → own path length map (sum of length_km across all rows for that name)
const ownLengthByName = {};
for (const row of rows) {
  if (!row.length_km) continue;
  ownLengthByName[row.name] = (ownLengthByName[row.name] ?? 0) + Number(row.length_km);
}

console.log('');
console.log('NAMING ANOMALIES (tributary own length > parent own length):');
const anomalies = [];
for (const [tributaryName, parentName] of Object.entries(TRIBUTARY_OF)) {
  const tributaryLen = ownLengthByName[tributaryName];
  const parentLen = ownLengthByName[parentName];
  if (tributaryLen == null || parentLen == null) continue;
  if (tributaryLen > parentLen) {
    anomalies.push({ tributaryName, parentName, tributaryLen, parentLen });
  }
}
anomalies.sort((a, b) => b.tributaryLen - b.parentLen - (a.tributaryLen - a.parentLen));
if (anomalies.length === 0) {
  console.log('  (none found)');
} else {
  anomalies.forEach(({ tributaryName, parentName, tributaryLen, parentLen }) => {
    console.log(`  ${tributaryName} (${tributaryLen.toLocaleString()}km) > ${parentName} (${parentLen.toLocaleString()}km)`);
  });
}
