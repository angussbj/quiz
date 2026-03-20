#!/usr/bin/env node
/**
 * Round 2 finger corrections.
 *
 * Resolves split entries from round 1, applies new moves,
 * creates new split entries for further classification.
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
// Step 1: Collect split entry paths
// ============================================================

const splitLittleDistal = {};
for (let i = 1; i <= 4; i++) {
  splitLittleDistal[i] = getPath(`split-little-distal-${i}`);
}

const splitIndexDistal = {};
for (let i = 1; i <= 6; i++) {
  splitIndexDistal[i] = getPath(`split-index-distal-${i}`);
}

const splitIndexMiddleL = {};
for (let i = 1; i <= 6; i++) {
  splitIndexMiddleL[i] = getPath(`split-index-middle-L-${i}`);
}

// ============================================================
// Step 2: Apply right-hand split classifications
// ============================================================

// Nothing: split little distal 1 (remove it)
console.log('Removing split-little-distal-1 (nonsense path)');

// Little finger middle phalanx: Split little distal 2,3,4
const littleMiddleRow = findRow(P + 'little-finger-middle');
const littleMiddleSplit = splitBySide(littleMiddleRow[6]);
littleMiddleRow[6] = joinPaths([
  ...littleMiddleSplit.left,
  ...littleMiddleSplit.right,
  splitLittleDistal[2], splitLittleDistal[3], splitLittleDistal[4],
]);
console.log('little-finger-middle R: added split-little-distal 2,3,4');

// Ring finger distal phalanx: Split index distal 1,2
const ringDistalRow = findRow(P + 'ring-finger-distal');
const ringDistalSplit = splitBySide(ringDistalRow[6]);
const newRingDistalR = [...ringDistalSplit.right, splitIndexDistal[1], splitIndexDistal[2]];

// Index finger distal phalanx: Split index distal 3,4,5,6
const indexDistalRow = findRow(P + 'index-finger-distal');
const indexDistalSplit = splitBySide(indexDistalRow[6]);
const newIndexDistalR = [splitIndexDistal[3], splitIndexDistal[4], splitIndexDistal[5], splitIndexDistal[6]];
indexDistalRow[6] = joinPaths([...indexDistalSplit.left, ...newIndexDistalR]);
console.log('index-finger-distal R: set to split-index-distal 3,4,5,6');

// Ring finger middle phalanx R → Ring finger distal phalanx R
const ringMiddleRow = findRow(P + 'ring-finger-middle');
const ringMiddleSplit = splitBySide(ringMiddleRow[6]);
newRingDistalR.push(...ringMiddleSplit.right);
console.log(`ring-finger-middle R (${ringMiddleSplit.right.length}) → ring-finger-distal R`);
ringMiddleRow[6] = joinPaths(ringMiddleSplit.left);  // keep L only (currently 0)

// Now set ring-finger-distal with all its R paths
// But ring-finger-distal L needs splitting too (step 4), so hold off on L for now

// ============================================================
// Step 3: Apply left-hand split classifications
// ============================================================

// Index finger middle phalanx: Split index middle L 1,2,3
const indexMiddleRow = findRow(P + 'index-finger-middle');
const indexMiddleSplit = splitBySide(indexMiddleRow[6]);
indexMiddleRow[6] = joinPaths([
  splitIndexMiddleL[1], splitIndexMiddleL[2], splitIndexMiddleL[3],
  ...indexMiddleSplit.right,
]);
console.log('index-finger-middle L: set to split-index-middle-L 1,2,3');

// Ring finger middle phalanx: Split index middle L 4,5,6
// ring-finger-middle L was empty, now gets these paths
const ringMiddleNewL = [splitIndexMiddleL[4], splitIndexMiddleL[5], splitIndexMiddleL[6]];
ringMiddleRow[6] = joinPaths([...ringMiddleNewL]);  // L from splits, R already cleared above
console.log('ring-finger-middle L: set to split-index-middle-L 4,5,6');

// ============================================================
// Step 4: Remove all split entries
// ============================================================
csv.rows = csv.rows.filter(r =>
  !r[0].startsWith('split-little-distal-') &&
  !r[0].startsWith('split-index-distal-') &&
  !r[0].startsWith('split-index-middle-L-')
);

// ============================================================
// Step 5: Create new split entries for further classification
// ============================================================

// Middle finger middle phalanx R needs splitting (currently 8 R paths)
const middleMiddleRow = findRow(P + 'middle-finger-middle');
const middleMiddleSplit = splitBySide(middleMiddleRow[6]);
console.log(`\nMiddle-middle R has ${middleMiddleSplit.right.length} paths → creating split entries`);
middleMiddleRow[6] = joinPaths(middleMiddleSplit.left);  // keep L only (currently 0)

const middleMiddleIdx = findRowIndex(P + 'middle-finger-middle');
for (let i = 0; i < middleMiddleSplit.right.length; i++) {
  const newRow = [...middleMiddleRow];
  newRow[0] = `split-middle-middle-${i + 1}`;
  newRow[1] = `Split Middle Middle ${i + 1}`;
  newRow[2] = '';
  newRow[6] = middleMiddleSplit.right[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(middleMiddleIdx + 1 + i, 0, newRow);
}

// Index finger distal L needs splitting (currently 6 L paths)
const indexDistalSplit2 = splitBySide(indexDistalRow[6]);
console.log(`Index-distal L has ${indexDistalSplit2.left.length} paths → creating split entries`);
indexDistalRow[6] = joinPaths(indexDistalSplit2.right);  // keep R only

const indexDistalIdx = findRowIndex(P + 'index-finger-distal');
for (let i = 0; i < indexDistalSplit2.left.length; i++) {
  const newRow = [...indexDistalRow];
  newRow[0] = `split-index-distal-L-${i + 1}`;
  newRow[1] = `Split Index Distal L ${i + 1}`;
  newRow[2] = '';
  newRow[6] = indexDistalSplit2.left[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(indexDistalIdx + 1 + i, 0, newRow);
}

// Ring finger distal L needs splitting (currently 13 L paths)
// First, finalize ring-finger-distal with its new R paths
ringDistalRow[6] = joinPaths([...ringDistalSplit.left, ...newRingDistalR]);
const ringDistalSplit2 = splitBySide(ringDistalRow[6]);
console.log(`Ring-distal L has ${ringDistalSplit2.left.length} paths → creating split entries`);
ringDistalRow[6] = joinPaths(ringDistalSplit2.right);  // keep R only

const ringDistalIdx = findRowIndex(P + 'ring-finger-distal');
for (let i = 0; i < ringDistalSplit2.left.length; i++) {
  const newRow = [...ringDistalRow];
  newRow[0] = `split-ring-distal-L-${i + 1}`;
  newRow[1] = `Split Ring Distal L ${i + 1}`;
  newRow[2] = '';
  newRow[6] = ringDistalSplit2.left[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(ringDistalIdx + 1 + i, 0, newRow);
}

// ============================================================
// Write
// ============================================================
const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);

console.log('\n--- New split entries for classification ---');
console.log(`split-middle-middle-1..${middleMiddleSplit.right.length} (R hand: classify by finger)`);
console.log(`split-index-distal-L-1..${indexDistalSplit2.left.length} (L hand: classify as index-distal or ?)`);
console.log(`split-ring-distal-L-1..${ringDistalSplit2.left.length} (L hand: classify as ring-distal or ?)`);
console.log('\nDone. CSV updated.');
