/**
 * Add sovereign_parent column to world-borders.csv.
 *
 * For non-sovereign territories, sovereign_parent is the name of the parent
 * sovereign country (matching the name column of the sovereign entry in the
 * same CSV). For sovereign countries, the column is empty.
 *
 * Data sources (cross-referenced for correctness):
 *   1. Natural Earth 10m admin-0 countries GeoJSON — ADMIN/SOVEREIGNT fields
 *      provide the authoritative territory → sovereign mapping.
 *   2. mledoze/countries JSON — independent boolean confirms territory status.
 *
 * Usage:
 *   node scripts/addSovereignParentColumn.mjs
 *
 * Reads:
 *   scripts/source-data/ne_admin0_10m_countries.geojson
 *   scripts/source-data/countries.json (mledoze)
 *   public/data/borders/world-borders.csv
 *
 * Writes:
 *   public/data/borders/world-borders.csv (in-place update)
 *
 * Download source files before running:
 *   curl -sL https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson -o scripts/source-data/ne_admin0_10m_countries.geojson
 *   curl -sL https://raw.githubusercontent.com/mledoze/countries/master/countries.json -o scripts/source-data/countries.json
 */

import { readFileSync, writeFileSync } from 'fs';

// ---------------------------------------------------------------------------
// CSV parsing (handles quoted fields with pipes/commas)
// ---------------------------------------------------------------------------

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

function quoteField(val) {
  if (val.includes(',') || val.includes('|') || val.includes('"')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

// ---------------------------------------------------------------------------
// Load Natural Earth 10m admin-0 data
// ---------------------------------------------------------------------------

const neData = JSON.parse(
  readFileSync('scripts/source-data/ne_admin0_10m_countries.geojson', 'utf8'),
);

// Build territory → sovereign name mapping from NE (lowercased keys)
const neTerritoryToSovereign = new Map();
for (const feature of neData.features) {
  const props = feature.properties;
  const admin = props.ADMIN || '';
  const sovereign = props.SOVEREIGNT || '';
  if (admin && sovereign && admin !== sovereign) {
    neTerritoryToSovereign.set(admin.toLowerCase(), sovereign);
  }
}

// ---------------------------------------------------------------------------
// Load mledoze/countries data
// ---------------------------------------------------------------------------

const mledozeData = JSON.parse(
  readFileSync('scripts/source-data/countries.json', 'utf8'),
);

// Build name → independent boolean (lowercased keys, using common name)
const mledozeIndependent = new Map();
for (const country of mledozeData) {
  mledozeIndependent.set(
    country.name.common.toLowerCase(),
    country.independent === true,
  );
}

// ---------------------------------------------------------------------------
// Load borders CSV
// ---------------------------------------------------------------------------

const BORDERS_PATH = 'public/data/borders/world-borders.csv';
const { cols, rows } = parseCSV(readFileSync(BORDERS_PATH, 'utf8'));

// Build a set of sovereign country names in the CSV (for matching parent names)
const sovereignNamesInCSV = new Set();
for (const row of rows) {
  if (row.is_sovereign === 'true') {
    sovereignNamesInCSV.add(row.name);
  }
}

// NE uses some country names that differ from our CSV. Map NE names → CSV names.
// Add entries here if NE sovereign name doesn't match the CSV 'name' column.
const neToCsvNameOverrides = new Map([]);

function resolveSovereignName(neSovereignName) {
  const override = neToCsvNameOverrides.get(neSovereignName.toLowerCase());
  if (override) return override;
  // Direct match
  if (sovereignNamesInCSV.has(neSovereignName)) return neSovereignName;
  // Case-insensitive fallback
  for (const csvName of sovereignNamesInCSV) {
    if (csvName.toLowerCase() === neSovereignName.toLowerCase()) return csvName;
  }
  return neSovereignName;
}

// ---------------------------------------------------------------------------
// Assign sovereign_parent to each row
// ---------------------------------------------------------------------------

// Add sovereign_parent column
const outputCols = cols.includes('sovereign_parent')
  ? cols
  : [...cols, 'sovereign_parent'];

let assigned = 0;
let crossCheckFails = 0;

for (const row of rows) {
  if (row.is_sovereign === 'true') {
    row.sovereign_parent = '';
    continue;
  }

  const nameLower = row.name.toLowerCase();
  const neSovereign = neTerritoryToSovereign.get(nameLower);

  if (neSovereign) {
    const resolvedName = resolveSovereignName(neSovereign);

    // Cross-check: mledoze should agree this is not independent
    const mledozeIsIndependent = mledozeIndependent.get(nameLower);
    if (mledozeIsIndependent === true) {
      console.warn(
        `  CROSS-CHECK WARNING: ${row.name} -> NE says sovereign=${neSovereign}, but mledoze says independent=true`,
      );
      crossCheckFails++;
    }

    // Verify the resolved parent actually exists in the CSV
    if (!sovereignNamesInCSV.has(resolvedName)) {
      console.warn(
        `  WARNING: ${row.name} -> sovereign parent "${resolvedName}" (from NE "${neSovereign}") not found in CSV`,
      );
      row.sovereign_parent = '';
    } else {
      row.sovereign_parent = resolvedName;
      assigned++;
    }
  } else {
    // Territory in CSV but not in NE — leave blank
    // (Antarctica, Western Sahara — no clear sovereign parent)
    row.sovereign_parent = '';
  }
}

// ---------------------------------------------------------------------------
// Write updated CSV
// ---------------------------------------------------------------------------

const header = outputCols.join(',');
const csvLines = rows.map((row) =>
  outputCols.map((col) => quoteField(row[col] || '')).join(','),
);
const output = [header, ...csvLines].join('\n') + '\n';

writeFileSync(BORDERS_PATH, output, 'utf8');

// Summary
const totalTerritories = rows.filter((r) => r.is_sovereign !== 'true').length;
console.log(
  `\nUpdated ${BORDERS_PATH}: ${rows.length} rows total`,
);
console.log(
  `  ${assigned}/${totalTerritories} territories assigned a sovereign_parent`,
);
console.log(`  ${totalTerritories - assigned} territories left unassigned (no clear sovereign)`);
if (crossCheckFails > 0) {
  console.log(`  ${crossCheckFails} cross-check warnings (NE and mledoze disagree)`);
}

// Print the assignments for review
console.log('\nAssignments:');
for (const row of rows) {
  if (row.sovereign_parent) {
    console.log(`  ${row.name} -> ${row.sovereign_parent}`);
  }
}

const unassigned = rows.filter(
  (r) => r.is_sovereign !== 'true' && !r.sovereign_parent,
);
if (unassigned.length > 0) {
  console.log('\nUnassigned territories:');
  for (const row of unassigned) {
    console.log(`  ${row.name}`);
  }
}
