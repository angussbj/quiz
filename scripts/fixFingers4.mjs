#!/usr/bin/env node
/**
 * Round 4 finger corrections.
 *
 * RIGHT HAND:
 *  - ring-middle R: split-ring-distal-R 1,2,3,7
 *  - ring-distal R: split-ring-distal-R 4,5,6
 *
 * Does NOT touch ribs, toes, or pelvis.
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';
const MIDLINE = 203;

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

function pathMidX(pathStr) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
  const xVals = [];
  let expectX = true;
  for (const t of tokens) {
    if (/^[A-Za-z]$/.test(t)) { expectX = true; continue; }
    if (expectX) { xVals.push(parseFloat(t)); expectX = false; }
    else expectX = true;
  }
  if (xVals.length === 0) return MIDLINE;
  return (Math.min(...xVals) + Math.max(...xVals)) / 2;
}

function splitBySide(pathsStr) {
  if (!pathsStr) return { left: [], right: [] };
  const paths = pathsStr.split('|');
  const left = [], right = [];
  for (const p of paths) {
    if (pathMidX(p) > MIDLINE) left.push(p); else right.push(p);
  }
  return { left, right };
}

function joinPaths(arr) { return arr.filter(Boolean).join('|'); }

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRow(id) { return csv.rows.find(r => r[0] === id); }
function getPath(id) { const r = findRow(id); return r ? r[6] : ''; }

const P = 'phalanx-hand-';

// Collect split paths
const splitPaths = {};
for (let i = 1; i <= 7; i++) splitPaths[i] = getPath(`split-ring-distal-R-${i}`);

// Ring finger middle R: splits 1,2,3,7
const ringMiddleRow = findRow(P + 'ring-finger-middle');
const ringMiddleSplit = splitBySide(ringMiddleRow[6]);
ringMiddleRow[6] = joinPaths([
  ...ringMiddleSplit.left,
  ...ringMiddleSplit.right,
  splitPaths[1], splitPaths[2], splitPaths[3], splitPaths[7],
]);
console.log('ring-middle R: added split-ring-distal-R 1,2,3,7');

// Ring finger distal R: splits 4,5,6
const ringDistalRow = findRow(P + 'ring-finger-distal');
const ringDistalSplit = splitBySide(ringDistalRow[6]);
ringDistalRow[6] = joinPaths([
  ...ringDistalSplit.left,
  ...ringDistalSplit.right,
  splitPaths[4], splitPaths[5], splitPaths[6],
]);
console.log('ring-distal R: added split-ring-distal-R 4,5,6');

// Remove split entries
csv.rows = csv.rows.filter(r => !r[0].startsWith('split-ring-distal-R-'));

// Write
writeFileSync(CSV_PATH, serializeCSV(csv));

// Summary
const ids = [
  'thumb-proximal', 'thumb-distal',
  'index-finger-proximal', 'index-finger-middle', 'index-finger-distal',
  'middle-finger-proximal', 'middle-finger-middle', 'middle-finger-distal',
  'ring-finger-proximal', 'ring-finger-middle', 'ring-finger-distal',
  'little-finger-proximal', 'little-finger-middle', 'little-finger-distal',
];
console.log('\n--- Summary ---');
for (const id of ids) {
  const row = findRow(P + id);
  if (row) {
    const s = splitBySide(row[6]);
    console.log(`  ${id}: ${s.left.length}L ${s.right.length}R`);
  }
}
console.log('\nDone. CSV updated.');
