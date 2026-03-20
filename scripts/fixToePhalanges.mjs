/**
 * Fix mislabeled toe phalanges in human-bones.csv.
 *
 * The SVG path data is correct, but the IDs/names are assigned to the wrong toes.
 * Based on visual inspection comparing phalanx positions to metatarsal positions:
 *
 * Current label "4th Toe" paths are actually on the 2nd toe
 * Current label "Little Toe" paths are actually on the 3rd toe
 * Current label "3rd Toe" paths are actually on the 4th toe
 * Current label "2nd Toe" paths are actually on the little toe (5th)
 *
 * This script swaps the id, name, and name_alternates columns while keeping
 * all other columns (paths, coordinates, labels) unchanged.
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

const content = readFileSync(CSV_PATH, 'utf-8');
const lines = content.split('\n');
const header = parseCSVLine(lines[0]);

const idIdx = header.indexOf('id');
const nameIdx = header.indexOf('name');
const altIdx = header.indexOf('name_alternates');

// Define the swap: for each bone row, if its current id matches a key,
// replace the id/name/alternates with the value.
// The path data (which is correct) stays on its current row.
const SWAPS = {
  // Proximal phalanges
  'phalanx-foot-4th-toe-proximal': {
    id: 'phalanx-foot-2nd-toe-proximal',
    name: '2nd Toe Proximal Phalanx',
    alts: 'second toe proximal phalanx',
  },
  'phalanx-foot-2nd-toe-proximal': {
    id: 'phalanx-foot-little-toe-proximal',
    name: 'Little Toe Proximal Phalanx',
    alts: '5th toe proximal phalanx|pinky toe proximal phalanx',
  },
  'phalanx-foot-little-toe-proximal': {
    id: 'phalanx-foot-3rd-toe-proximal',
    name: '3rd Toe Proximal Phalanx',
    alts: 'third toe proximal phalanx',
  },
  'phalanx-foot-3rd-toe-proximal': {
    id: 'phalanx-foot-4th-toe-proximal',
    name: '4th Toe Proximal Phalanx',
    alts: 'fourth toe proximal phalanx',
  },
  // Distal phalanges (same rotation)
  'phalanx-foot-4th-toe-distal': {
    id: 'phalanx-foot-2nd-toe-distal',
    name: '2nd Toe Distal Phalanx',
    alts: 'second toe distal phalanx',
  },
  'phalanx-foot-2nd-toe-distal': {
    id: 'phalanx-foot-little-toe-distal',
    name: 'Little Toe Distal Phalanx',
    alts: '5th toe distal phalanx|pinky toe distal phalanx',
  },
  'phalanx-foot-little-toe-distal': {
    id: 'phalanx-foot-3rd-toe-distal',
    name: '3rd Toe Distal Phalanx',
    alts: 'third toe distal phalanx',
  },
  'phalanx-foot-3rd-toe-distal': {
    id: 'phalanx-foot-4th-toe-distal',
    name: '4th Toe Distal Phalanx',
    alts: 'fourth toe distal phalanx',
  },
};

let swapCount = 0;
const newLines = [lines[0]]; // keep header

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) { newLines.push(lines[i]); continue; }

  const fields = parseCSVLine(lines[i]);
  const currentId = fields[idIdx];

  if (SWAPS[currentId]) {
    const swap = SWAPS[currentId];
    console.log(`Swapping: ${currentId} -> ${swap.id}`);
    fields[idIdx] = swap.id;
    fields[nameIdx] = swap.name;
    fields[altIdx] = swap.alts;
    swapCount++;
  }

  newLines.push(fields.map(toCSVField).join(','));
}

writeFileSync(CSV_PATH, newLines.join('\n'));
console.log(`\nDone. Swapped ${swapCount} rows.`);
