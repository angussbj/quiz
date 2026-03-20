#!/usr/bin/env node
/**
 * Round 5: Add two missing SVG paths as candidate middle-finger-distal R entries.
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';

function parseCSV(text) {
  const lines = text.split('\n');
  const header = lines[0];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    rows.push(parseRow(lines[i]));
  }
  return { header, rows };
}

function parseRow(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { fields.push(current); current = ''; }
    else current += ch;
  }
  fields.push(current);
  return fields;
}

function serializeRow(fields) {
  return fields.map((f, i) => {
    if (i === 6 && f.includes(',')) return `"${f}"`;
    return f;
  }).join(',');
}

function serializeCSV({ header, rows }) {
  return header + '\n' + rows.map(serializeRow).join('\n') + '\n';
}

const path887 = 'M 137.437,282.5 C 135.754,286.521 141.584,288.508 144.193,289.441 C 143.921,289.191 143.587,288.764 143.26,288.606 C 144.293,288.934 146.26,288.62 146.322,287.354 C 144.235,287.399 142.508,285.875 140.579,285.379 C 141.802,286.329 143.508,286.663 144.726,287.685 C 144.241,287.892 143.64,287.937 143.119,287.891 C 143.173,288.057 143.191,288.237 143.229,288.379 C 140.639,288.306 137.651,286.154 137.241,283.752';
const path897 = 'M 134.92,266.945 C 134.281,268.788 135.263,271.446 137.064,272.42 C 137.051,272.2 137.089,271.993 137.094,271.787 C 138.516,274.003 141.379,275.198 143.87,276.421 C 146.597,277.761 148.985,278.999 152.084,279.117 C 152.007,279.003 151.904,278.912 151.831,278.784 C 152.232,278.649 152.665,278.329 153.055,278.201 C 147.215,278.779 140.27,274.568 137.235,270.225 C 137.214,270.371 137.226,270.531 137.21,270.679 C 135.738,270.493 134.447,267.816 135.113,266.587';

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRowIndex(id) { return csv.rows.findIndex(r => r[0] === id); }

const middleDistalIdx = findRowIndex('phalanx-hand-middle-finger-distal');
const templateRow = csv.rows[middleDistalIdx];

for (let i = 0; i < 2; i++) {
  const path = i === 0 ? path887 : path897;
  const label = i === 0 ? '1 (path887, midY=286)' : '2 (path897, midY=273)';
  const newRow = [...templateRow];
  newRow[0] = `candidate-middle-distal-${i + 1}`;
  newRow[1] = `Candidate Middle Distal ${label}`;
  newRow[2] = '';
  newRow[6] = path;
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(middleDistalIdx + 1 + i, 0, newRow);
}

writeFileSync(CSV_PATH, serializeCSV(csv));
console.log('Added candidate-middle-distal-1 (path887) and candidate-middle-distal-2 (path897)');
console.log('Check them in the debug viewer to confirm they are middle-finger-distal R.');
