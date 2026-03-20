#!/usr/bin/env node
/**
 * Round 3 finger corrections.
 *
 * RIGHT HAND:
 *  - middle-proximal R: split-middle-middle 1,2,3
 *  - middle-middle R: split-middle-middle 4,5,6,7,8
 *  - ring-distal R: needs splitting (create numbered entries)
 *
 * LEFT HAND:
 *  - index-distal L: split-index-distal-L 1,2,3,4
 *  - middle-distal L: split-index-distal-L 5,6
 *  - middle-middle L: current ring-middle L (move first, before reassigning ring-middle)
 *  - ring-middle L: split-ring-distal-L 1,2,3,4,5,6,7,8
 *  - ring-distal L: split-ring-distal-L 9,10,11,12,13
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
  const left = [];
  const right = [];
  for (const p of paths) {
    if (pathMidX(p) > MIDLINE) left.push(p);
    else right.push(p);
  }
  return { left, right };
}

function joinPaths(arr) {
  return arr.filter(Boolean).join('|');
}

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRow(id) { return csv.rows.find(r => r[0] === id); }
function findRowIndex(id) { return csv.rows.findIndex(r => r[0] === id); }
function getPath(id) { const r = findRow(id); return r ? r[6] : ''; }

const P = 'phalanx-hand-';

// ============================================================
// Collect split entry paths
// ============================================================

const splitMiddleMiddle = {};
for (let i = 1; i <= 8; i++) splitMiddleMiddle[i] = getPath(`split-middle-middle-${i}`);

const splitIndexDistalL = {};
for (let i = 1; i <= 6; i++) splitIndexDistalL[i] = getPath(`split-index-distal-L-${i}`);

const splitRingDistalL = {};
for (let i = 1; i <= 13; i++) splitRingDistalL[i] = getPath(`split-ring-distal-L-${i}`);

// ============================================================
// RIGHT HAND
// ============================================================

// Middle finger proximal phalanx R: split-middle-middle 1,2,3
const middleProxRow = findRow(P + 'middle-finger-proximal');
const middleProxSplit = splitBySide(middleProxRow[6]);
middleProxRow[6] = joinPaths([
  ...middleProxSplit.left,
  splitMiddleMiddle[1], splitMiddleMiddle[2], splitMiddleMiddle[3],
]);
console.log('middle-proximal R: set to split-middle-middle 1,2,3');

// Middle finger middle phalanx R: split-middle-middle 4,5,6,7,8
const middleMiddleRow = findRow(P + 'middle-finger-middle');
const middleMiddleSplit = splitBySide(middleMiddleRow[6]);
// Will set L paths below after handling left-hand corrections
const middleMiddleNewR = [
  splitMiddleMiddle[4], splitMiddleMiddle[5], splitMiddleMiddle[6],
  splitMiddleMiddle[7], splitMiddleMiddle[8],
];
console.log('middle-middle R: set to split-middle-middle 4,5,6,7,8');

// ============================================================
// LEFT HAND
// ============================================================

// Index finger distal L: split-index-distal-L 1,2,3,4
const indexDistalRow = findRow(P + 'index-finger-distal');
const indexDistalSplit = splitBySide(indexDistalRow[6]);
indexDistalRow[6] = joinPaths([
  splitIndexDistalL[1], splitIndexDistalL[2], splitIndexDistalL[3], splitIndexDistalL[4],
  ...indexDistalSplit.right,
]);
console.log('index-distal L: set to split-index-distal-L 1,2,3,4');

// Middle finger distal L: split-index-distal-L 5,6
const middleDistalRow = findRow(P + 'middle-finger-distal');
const middleDistalSplit = splitBySide(middleDistalRow[6]);
middleDistalRow[6] = joinPaths([
  splitIndexDistalL[5], splitIndexDistalL[6],
  ...middleDistalSplit.right,
]);
console.log('middle-distal L: set to split-index-distal-L 5,6');

// Middle finger middle L: current ring-middle L paths
// (Must do this BEFORE reassigning ring-middle L)
const ringMiddleRow = findRow(P + 'ring-finger-middle');
const ringMiddleSplit = splitBySide(ringMiddleRow[6]);
const middleMiddleNewL = ringMiddleSplit.left;
console.log(`middle-middle L: took ${middleMiddleNewL.length} paths from ring-middle L`);

// Now set middle-middle with both L and R
middleMiddleRow[6] = joinPaths([...middleMiddleNewL, ...middleMiddleNewR]);

// Ring finger middle L: split-ring-distal-L 1,2,3,4,5,6,7,8
ringMiddleRow[6] = joinPaths([
  splitRingDistalL[1], splitRingDistalL[2], splitRingDistalL[3], splitRingDistalL[4],
  splitRingDistalL[5], splitRingDistalL[6], splitRingDistalL[7], splitRingDistalL[8],
  ...ringMiddleSplit.right,  // keep any existing R paths (currently 0)
]);
console.log('ring-middle L: set to split-ring-distal-L 1,2,3,4,5,6,7,8');

// Ring finger distal L: split-ring-distal-L 9,10,11,12,13
const ringDistalRow = findRow(P + 'ring-finger-distal');
const ringDistalSplit = splitBySide(ringDistalRow[6]);
const ringDistalNewL = [
  splitRingDistalL[9], splitRingDistalL[10], splitRingDistalL[11],
  splitRingDistalL[12], splitRingDistalL[13],
];
// Ring distal R will need splitting, so save it
const ringDistalR = ringDistalSplit.right;
ringDistalRow[6] = joinPaths([...ringDistalNewL, ...ringDistalR]);
console.log('ring-distal L: set to split-ring-distal-L 9,10,11,12,13');

// ============================================================
// Remove all old split entries
// ============================================================
csv.rows = csv.rows.filter(r =>
  !r[0].startsWith('split-middle-middle-') &&
  !r[0].startsWith('split-index-distal-L-') &&
  !r[0].startsWith('split-ring-distal-L-')
);

// ============================================================
// Create new split entries: ring-distal R
// ============================================================
const ringDistalSplit2 = splitBySide(ringDistalRow[6]);
console.log(`\nRing-distal R has ${ringDistalSplit2.right.length} paths → creating split entries`);
ringDistalRow[6] = joinPaths(ringDistalSplit2.left);  // keep L only

const ringDistalIdx = findRowIndex(P + 'ring-finger-distal');
for (let i = 0; i < ringDistalSplit2.right.length; i++) {
  const newRow = [...ringDistalRow];
  newRow[0] = `split-ring-distal-R-${i + 1}`;
  newRow[1] = `Split Ring Distal R ${i + 1}`;
  newRow[2] = '';
  newRow[6] = ringDistalSplit2.right[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(ringDistalIdx + 1 + i, 0, newRow);
}

// ============================================================
// Write
// ============================================================
const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);

// Print summary
console.log('\n--- Summary ---');
const ids = [
  'thumb-proximal', 'thumb-distal',
  'index-finger-proximal', 'index-finger-middle', 'index-finger-distal',
  'middle-finger-proximal', 'middle-finger-middle', 'middle-finger-distal',
  'ring-finger-proximal', 'ring-finger-middle', 'ring-finger-distal',
  'little-finger-proximal', 'little-finger-middle', 'little-finger-distal',
];
for (const id of ids) {
  const row = findRow(P + id);
  if (row) {
    const s = splitBySide(row[6]);
    console.log(`  ${id}: ${s.left.length}L ${s.right.length}R`);
  }
}

console.log(`\nNew split entries: split-ring-distal-R-1..${ringDistalSplit2.right.length}`);
console.log('Still missing: middle-finger-distal R paths (need to find in original SVG)');
console.log('\nDone. CSV updated.');
