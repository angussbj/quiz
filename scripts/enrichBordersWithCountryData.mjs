/**
 * Enrich world-borders.csv with data from world-capitals.csv:
 * - latitude/longitude (from capital city coordinates as approximate country center)
 * - name_alternates (from country_alternates in capitals CSV)
 * - is_sovereign (true if the border entry matches a country in the capitals CSV)
 *
 * For non-sovereign territories, latitude/longitude are computed from
 * the bounding box center of the SVG path data.
 *
 * Usage: node scripts/enrichBordersWithCountryData.mjs
 *
 * Reads:
 *   public/data/borders/world-borders.csv
 *   public/data/capitals/world-capitals.csv
 * Writes:
 *   public/data/borders/world-borders.csv (in-place update)
 */

import { readFileSync, writeFileSync } from 'fs';

const BORDERS_PATH = 'public/data/borders/world-borders.csv';
const CAPITALS_PATH = 'public/data/capitals/world-capitals.csv';

function parseCSV(text) {
  const lines = text.split('\n').filter((r) => r.trim());
  const headerLine = lines[0];
  const cols = headerLine.split(',');
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        vals.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    vals.push(current);
    const obj = {};
    cols.forEach((c, j) => (obj[c] = vals[j] || ''));
    rows.push(obj);
  }

  return { cols, rows };
}

/**
 * Compute bounding box center from SVG path data (equirectangular: x=lng, y=-lat).
 * Returns { latitude, longitude }.
 */
function centroidFromPaths(pathsRaw) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const numPattern = /-?\d+\.?\d*/g;
  // Extract all coordinate pairs from M/L commands
  const segments = pathsRaw.split('|');
  for (const segment of segments) {
    const tokens = segment.match(/[MLZ]|-?\d+\.?\d*/g) || [];
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === 'M' || token === 'L') {
        const x = parseFloat(tokens[i + 1]);
        const y = parseFloat(tokens[i + 2]);
        if (!isNaN(x) && !isNaN(y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        i += 3;
      } else {
        i++;
      }
    }
  }

  if (minX === Infinity) return { latitude: 0, longitude: 0 };

  // Equirectangular: x = longitude, y = -latitude
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    latitude: -centerY,
    longitude: centerX,
  };
}

// Parse both CSVs
const { cols: borderCols, rows: borders } = parseCSV(readFileSync(BORDERS_PATH, 'utf8'));
const { rows: capitals } = parseCSV(readFileSync(CAPITALS_PATH, 'utf8'));

// Build lookup from capitals by country name (lowercased)
const capByCountry = {};
for (const c of capitals) {
  capByCountry[c.country.toLowerCase()] = c;
}

// New columns to add
const newCols = [...borderCols, 'latitude', 'longitude', 'name_alternates', 'is_sovereign'];

// Build enriched rows
const enrichedRows = borders.map((b) => {
  const cap = capByCountry[b.name.toLowerCase()];
  let latitude, longitude, nameAlternates, isSovereign;

  if (cap) {
    // Sovereign country — use capital city coordinates
    latitude = cap.latitude;
    longitude = cap.longitude;
    nameAlternates = cap.country_alternates || '';
    isSovereign = 'true';
  } else {
    // Territory — compute centroid from path bounding box
    const centroid = centroidFromPaths(b.paths || '');
    latitude = centroid.latitude.toFixed(4);
    longitude = centroid.longitude.toFixed(4);
    nameAlternates = '';
    isSovereign = 'false';
  }

  return { ...b, latitude, longitude, name_alternates: nameAlternates, is_sovereign: isSovereign };
});

// Write CSV — quote fields that contain commas or pipes
function quoteField(val) {
  if (val.includes(',') || val.includes('|') || val.includes('"')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

const header = newCols.join(',');
const lines = enrichedRows.map((row) => newCols.map((col) => quoteField(row[col] || '')).join(','));
const output = [header, ...lines].join('\n') + '\n';

writeFileSync(BORDERS_PATH, output, 'utf8');

// Summary
const sovereign = enrichedRows.filter((r) => r.is_sovereign === 'true').length;
const territories = enrichedRows.filter((r) => r.is_sovereign === 'false').length;
console.log(`Updated ${BORDERS_PATH}: ${enrichedRows.length} rows (${sovereign} sovereign, ${territories} territories)`);
