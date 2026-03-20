/**
 * Enrich world-rivers.csv with discharge volume data.
 *
 * Adds two columns:
 *   discharge_m3s  — mean annual discharge in m³/s (blank if unknown)
 *   discharge_rank — rank by discharge (1 = highest); for rivers with multiple
 *                    path segments, only the lowest-scalerank segment is ranked.
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

  // ── Congo system ────────────────────────────────────────────────────────
  'Congo':            41000,
  'Lualaba':          10000,  // upper Congo (upstream of main tributaries)
  'Kasai':             9000,  // Congo tributary
  'Ubangi':            4000,  // Congo tributary
  'Kibali':             500,  // Uele tributary → Ubangi → Congo
  'Uele':              1500,  // Ubangi tributary
  'Lualaba':          10000,

  // ── Nile system ─────────────────────────────────────────────────────────
  'Nile':              2830,
  'Abay':              1548,  // Blue Nile
  'Kagera':             230,  // Nile tributary, drains into Lake Victoria

  // ── Yangtze system ──────────────────────────────────────────────────────
  'Yangtze':          30166,
  'Tongtian':          2500,  // upper Yangtze (before main tributaries)
  'Tuotuo':             120,  // headwater of Yangtze

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
  'Hongshui':          1800,  // Pearl River tributary
  'Nanpan':             600,  // Pearl River headwater

  // ── Irrawaddy ───────────────────────────────────────────────────────────
  'Irrawaddy Delta':  13000,
  'Nmai':               450,  // Irrawaddy headwater

  // ── Other major rivers (standalone) ────────────────────────────────────
  'Orinoco':          30000,
  'Paraná':           17000,
  'Lena':             17175,
  'Mississippi':      16792,
  'Ob':               12500,
  'Ganges':           12015,
  'Tocantins':        11300,
  'Amur':             11400,
  'St. Lawrence':     10100,
  'Mackenzie':        10000,
  'Niger':             9250,
  'Ohio':              8294,
  'Volga':             8080,
  'Xi':                7650,  // Pearl River
  'Xun':               3800,  // Pearl River tributary
  'Magdalena':         7500,
  'Columbia':          7500,
  'Indus':             7160,
  'Danube':            6500,
  'Yukon':             6340,
  'Niagara':           5720,  // Lake Erie outflow
  'Aldan':             5060,  // Lena tributary
  'Pechora':           4100,
  'Kolyma':            3800,
  'Slave':             3400,  // Mackenzie tributary
  'Zambezi':           3400,
  'Severnaya Dvina':   3332,
  'Rhein':             2900,
  'São  Francisco':    2850,  // note: two spaces in CSV name
  'Nile':              2830,
  'Benue':             2000,  // Niger tributary
  'Bénoué':            2000,  // Benue (French spelling in CSV)
  'Nelson':            2370,
  'Peace':             2000,  // Slave/Mackenzie tributary
  'Shatt al Arab':     1750,  // Tigris+Euphrates confluence at mouth
  'Salween':           1494,
  'Paranaíba':         1200,  // Paraná headwater
  'Euphrates':          848,
  'Al Furat':           848,  // Euphrates (Arabic)
  'Firat':              848,  // Euphrates (Turkish)
  'Tigris':             840,
  'Dicle':              840,  // Tigris (Turkish)
  'Ertis':              960,  // Irtysh, Ob tributary
  'Murray':             767,  // Australia
  'Arkansas':          1060,
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
};

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

const text = readFileSync(RIVERS_PATH, 'utf8');
const { cols, rows } = parseCSV(text);

// Strip any existing discharge columns before re-adding
const baseCols = cols.filter((c) => c !== 'discharge_m3s' && c !== 'discharge_rank');
for (const row of rows) {
  delete row.discharge_m3s;
  delete row.discharge_rank;
}

// Add discharge_m3s to all rows
for (const row of rows) {
  const discharge = DISCHARGE[row.name];
  row.discharge_m3s = discharge != null ? String(discharge) : '';
}

// For rivers with multiple segments (same name), only rank the lowest scalerank.
// Ties in scalerank: rank them all (they're separate quiz elements).
const bestScalerankByName = {};
for (const row of rows) {
  if (row.discharge_m3s === '') continue;
  const rank = Number(row.scalerank);
  if (!(row.name in bestScalerankByName) || rank < bestScalerankByName[row.name]) {
    bestScalerankByName[row.name] = rank;
  }
}

// Assign discharge_rank only to the primary segment of each named river
const rankable = rows.filter((r) => {
  if (r.discharge_m3s === '') return false;
  return Number(r.scalerank) === bestScalerankByName[r.name];
});

// Sort by discharge descending, then assign ranks
rankable.sort((a, b) => Number(b.discharge_m3s) - Number(a.discharge_m3s));
rankable.forEach((row, i) => { row.discharge_rank = String(i + 1); });

// All other rows get empty discharge_rank
for (const row of rows) {
  if (!row.discharge_rank) row.discharge_rank = '';
}

const newCols = [...baseCols, 'discharge_m3s', 'discharge_rank'];
writeFileSync(RIVERS_PATH, toCSV(newCols, rows));

const ranked = rows.filter((r) => r.discharge_rank !== '');
console.log(`Ranked ${ranked.length} rivers by discharge.`);
console.log('Top 20:');
ranked.slice(0, 20).forEach((r) => {
  console.log(`  ${r.discharge_rank.padStart(2)}. ${r.name} (scalerank ${r.scalerank}): ${Number(r.discharge_m3s).toLocaleString()} m³/s`);
});
