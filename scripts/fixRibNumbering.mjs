/**
 * Fix off-by-one rib numbering in human-bones.csv.
 *
 * The rib paths extracted from the SVG have an off-by-one error:
 * - Current rib-1 paths = hyoid (not a rib at all)
 * - Current rib-2 paths = actual rib 1
 * - Current rib-3 paths = actual rib 2
 * - ... (each shifted by 1)
 * - Current rib-7 paths = actual rib 6
 * - Current rib-8 paths = costal cartilage (not a rib)
 * - Current rib-9 through rib-12 = correct
 *
 * This script:
 * 1. Merges current rib-1 paths into the hyoid entry (they're hyoid paths)
 * 2. Shifts rib-2→rib-1, rib-3→rib-2, ..., rib-7→rib-6 (keeping paths in place)
 * 3. Converts current rib-8 to costal-cartilage (common=false, new subregion)
 * 4. Removes now-empty rib-7 and rib-8 rows (ribs 7-8 not present in source SVG)
 * 5. Leaves rib-9 through rib-12 unchanged
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

function toCSVField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

const RIB_NAMES = {
  1: { name: 'Rib 1', alts: 'first rib|true rib|costa 1' },
  2: { name: 'Rib 2', alts: 'second rib|true rib|costa 2' },
  3: { name: 'Rib 3', alts: 'third rib|true rib|costa 3' },
  4: { name: 'Rib 4', alts: 'fourth rib|true rib|costa 4' },
  5: { name: 'Rib 5', alts: 'fifth rib|true rib|costa 5' },
  6: { name: 'Rib 6', alts: 'sixth rib|true rib|costa 6' },
};

const content = readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');
const header = parseCSVLine(lines[0]);

const idIdx = header.indexOf('id');
const nameIdx = header.indexOf('name');
const altIdx = header.indexOf('name_alternates');
const pathsIdx = header.indexOf('paths');
const commonIdx = header.indexOf('common');
const subregionIdx = header.indexOf('subregion');
const xIdx = header.indexOf('x');
const yIdx = header.indexOf('y');
const labelXIdx = header.indexOf('label_x');
const labelYIdx = header.indexOf('label_y');
const anchorXIdx = header.indexOf('anchor_x');
const anchorYIdx = header.indexOf('anchor_y');

// First pass: collect data
const rowsByRib = {};
let hyoidRowIdx = -1;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const fields = parseCSVLine(lines[i]);
  const id = fields[idIdx];

  if (id === 'hyoid') {
    hyoidRowIdx = i;
  }

  const ribMatch = id.match(/^rib-(\d+)$/);
  if (ribMatch) {
    rowsByRib[parseInt(ribMatch[1])] = { lineIdx: i, fields };
  }
}

console.log('Current rib rows:', Object.keys(rowsByRib).map(Number).sort((a, b) => a - b).join(', '));

// Step 1: Merge rib-1 paths into hyoid
if (hyoidRowIdx >= 0 && rowsByRib[1]) {
  const hyoidFields = parseCSVLine(lines[hyoidRowIdx]);
  const rib1Paths = rowsByRib[1].fields[pathsIdx];
  const hyoidPaths = hyoidFields[pathsIdx];
  hyoidFields[pathsIdx] = hyoidPaths + '|' + rib1Paths;
  lines[hyoidRowIdx] = hyoidFields.map(toCSVField).join(',');
  console.log(`Merged ${rib1Paths.split('|').length} paths from rib-1 into hyoid (now ${hyoidFields[pathsIdx].split('|').length} paths)`);
}

// Step 2: Shift rib-2→rib-1, ..., rib-7→rib-6
for (let newNum = 1; newNum <= 6; newNum++) {
  const oldNum = newNum + 1; // rib-2 becomes rib-1, etc.
  const row = rowsByRib[oldNum];
  if (!row) {
    console.error(`Missing rib-${oldNum} row!`);
    continue;
  }
  const fields = row.fields;
  fields[idIdx] = `rib-${newNum}`;
  fields[nameIdx] = RIB_NAMES[newNum].name;
  fields[altIdx] = RIB_NAMES[newNum].alts;
  // Common: ribs 1-7 are true ribs
  fields[commonIdx] = 'true';
  lines[row.lineIdx] = fields.map(toCSVField).join(',');
  console.log(`rib-${oldNum} → rib-${newNum} (${RIB_NAMES[newNum].name})`);
}

// Step 3: Convert rib-8 to costal-cartilage
if (rowsByRib[8]) {
  const fields = rowsByRib[8].fields;
  fields[idIdx] = 'costal-cartilage';
  fields[nameIdx] = 'Costal Cartilage';
  fields[altIdx] = 'rib cartilage|costal arch';
  fields[subregionIdx] = 'Rib Cage';
  fields[commonIdx] = '';  // not in quiz
  lines[rowsByRib[8].lineIdx] = fields.map(toCSVField).join(',');
  console.log('rib-8 → costal-cartilage (filtered from quiz)');
}

// Step 4: Remove old rib-1 row (now merged into hyoid) and old rib-7 row (empty after shift)
// We need to mark rows for deletion
const deleteLineIndices = new Set();

// Delete original rib-1 (hyoid duplicate)
if (rowsByRib[1]) {
  deleteLineIndices.add(rowsByRib[1].lineIdx);
  console.log('Deleted rib-1 row (hyoid paths merged into hyoid entry)');
}

// After shifting rib-2→rib-1 through rib-7→rib-6, rib-7 and rib-8 (original)
// are now rib-6 and costal-cartilage respectively.
// But we also need to handle the original rib-7 row which became rib-6.
// Wait - the shifts were: old rib-2→new rib-1, ..., old rib-7→new rib-6.
// The original rib-1 row still exists with its old data (we just modified rib-2..rib-7 in place).
// So we just need to delete the original rib-1 line.

// We also don't have ribs 7 or 8 anymore - they're not in the SVG.
// Don't create empty rows for them.

const newLines = lines.filter((_, idx) => !deleteLineIndices.has(idx));

writeFileSync(CSV_PATH, newLines.join('\n'));
console.log(`\nDone. Wrote ${newLines.length} lines.`);
console.log('Note: Ribs 7-8 are not present in the source SVG (g845 group).');
console.log('Available ribs: 1-6, 9-12. Costal cartilage added as non-quiz entry.');
