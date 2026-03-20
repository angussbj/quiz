#!/usr/bin/env node
/**
 * Targeted finger phalanx corrections.
 *
 * RIGHT HAND corrections (R = x ≤ 203):
 *  1. thumb-distal R → index-proximal R
 *  2. unknown-finger-path-1 → thumb-distal R
 *  3. unknown-finger-path-2 → thumb-distal R
 *  4. little-distal R → SPLIT (little-middle + nonsense to remove)
 *  5. index-proximal R → middle-middle R
 *  6. index-distal R → SPLIT (index-distal + ring-distal)
 *  7. ring-middle R → little-distal R
 *  8. middle-proximal R → middle-middle R
 *  9. middle-distal R → ring-middle R
 * 10. middle-middle R → little-distal R
 *
 * LEFT HAND corrections (L = x > 203):
 *  1. index-middle L → SPLIT (index-middle + middle-middle)
 *  2. middle-distal L → ring-distal L
 *
 * Also: removes unknown-finger-path-1 and unknown-finger-path-2 rows.
 * Note: middle-finger-distal ends up empty (paths are missing from source SVG).
 *
 * Does NOT touch ribs, toes, or pelvis.
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';
const MIDLINE = 203;

// --- CSV helpers ---

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

function joinPaths(pathsArray) {
  return pathsArray.filter(p => p).join('|');
}

// --- Main ---

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRow(id) { return csv.rows.find(r => r[0] === id); }
function findRowIndex(id) { return csv.rows.findIndex(r => r[0] === id); }

const P = 'phalanx-hand-';

// Step 1: Snapshot ALL current paths for finger phalanges, split by side
const ids = [
  'thumb-proximal', 'thumb-distal',
  'index-finger-proximal', 'index-finger-middle', 'index-finger-distal',
  'middle-finger-proximal', 'middle-finger-middle', 'middle-finger-distal',
  'ring-finger-proximal', 'ring-finger-middle', 'ring-finger-distal',
  'little-finger-proximal', 'little-finger-middle', 'little-finger-distal',
];

const snap = {};
for (const id of ids) {
  const row = findRow(P + id);
  if (row) {
    snap[id] = splitBySide(row[6]);
  } else {
    console.log(`WARNING: missing ${P + id}`);
    snap[id] = { left: [], right: [] };
  }
}

// Also snapshot the unknown entries
const unk1 = findRow('unknown-finger-path-1');
const unk2 = findRow('unknown-finger-path-2');
const unkPath1 = unk1 ? unk1[6] : '';
const unkPath2 = unk2 ? unk2[6] : '';

console.log('Snapshot taken. Current right-hand path counts:');
for (const id of ids) {
  console.log(`  ${id}: ${snap[id].left.length}L ${snap[id].right.length}R`);
}

// Step 2: Build new RIGHT-hand assignments
const newR = {};
for (const id of ids) newR[id] = [];

// Unchanged entries (not mentioned in corrections):
newR['thumb-proximal'] = snap['thumb-proximal'].right;
newR['little-finger-proximal'] = snap['little-finger-proximal'].right;
newR['index-finger-middle'] = snap['index-finger-middle'].right;  // not mentioned for R
newR['ring-finger-proximal'] = snap['ring-finger-proximal'].right;
newR['ring-finger-distal'] = snap['ring-finger-distal'].right;  // may get additions from split #6

// Correction #1: thumb-distal R → index-proximal R
newR['index-finger-proximal'] = snap['thumb-distal'].right;
console.log(`\n#1: thumb-distal R (${snap['thumb-distal'].right.length}) → index-proximal R`);

// Corrections #2,#3: unknown-finger-path-1,2 → thumb-distal R
newR['thumb-distal'] = [unkPath1, unkPath2].filter(Boolean);
console.log(`#2,#3: unknown paths (${newR['thumb-distal'].length}) → thumb-distal R`);

// Correction #4: little-distal R → SPLIT (needs user classification)
// Will create numbered entries below

// Correction #5: index-proximal R → middle-middle R
newR['middle-finger-middle'] = [...snap['index-finger-proximal'].right];
console.log(`#5: index-proximal R (${snap['index-finger-proximal'].right.length}) → middle-middle R`);

// Correction #6: index-distal R → SPLIT (needs user classification)
// Will create numbered entries below

// Correction #7: ring-middle R → little-distal R
newR['little-finger-distal'] = [...snap['ring-finger-middle'].right];
console.log(`#7: ring-middle R (${snap['ring-finger-middle'].right.length}) → little-distal R`);

// Correction #8: middle-proximal R → middle-middle R (add to #5's paths)
newR['middle-finger-middle'].push(...snap['middle-finger-proximal'].right);
console.log(`#8: middle-proximal R (${snap['middle-finger-proximal'].right.length}) → middle-middle R (now ${newR['middle-finger-middle'].length} total)`);

// Correction #9: middle-distal R → ring-middle R
newR['ring-finger-middle'] = snap['middle-finger-distal'].right;
console.log(`#9: middle-distal R (${snap['middle-finger-distal'].right.length}) → ring-middle R`);

// Correction #10: middle-middle R → little-distal R (add to #7's paths)
newR['little-finger-distal'].push(...snap['middle-finger-middle'].right);
console.log(`#10: middle-middle R (${snap['middle-finger-middle'].right.length}) → little-distal R (now ${newR['little-finger-distal'].length} total)`);

// middle-proximal R: now empty (all paths moved by #8)
newR['middle-finger-proximal'] = [];
console.log(`middle-proximal R: now empty (paths moved by #8)`);

// middle-distal R: now empty (all paths moved by #9)
newR['middle-finger-distal'] = [];
console.log(`middle-distal R: now empty (user confirmed missing)`);

// little-finger-middle R: stays empty (was already 0 after unknown extraction)
newR['little-finger-middle'] = [];

// Step 3: Build new LEFT-hand assignments
const newL = {};
for (const id of ids) newL[id] = snap[id].left;  // default: keep original

// Left correction #1: index-middle L → SPLIT (needs user classification)
// Will create numbered entries below

// Left correction #2: middle-distal L → ring-distal L
newL['ring-finger-distal'] = [...snap['ring-finger-distal'].left, ...snap['middle-finger-distal'].left];
newL['middle-finger-distal'] = [];
console.log(`\nLeft #2: middle-distal L (${snap['middle-finger-distal'].left.length}) → ring-distal L (now ${newL['ring-finger-distal'].length} total)`);

// Step 4: Apply new paths to rows
for (const id of ids) {
  const row = findRow(P + id);
  if (!row) continue;

  // For split entries, we'll handle them specially below
  if (id === 'little-finger-distal' || id === 'index-finger-distal' || id === 'index-finger-middle') {
    continue;  // handle below
  }

  row[6] = joinPaths([...newL[id], ...newR[id]]);
}

// Step 5: Handle splits — create numbered entries for user classification

// Correction #4: little-distal R (4 paths) → numbered entries
// little-distal also gets NEW R paths from #7 and #10
const littleDistalRow = findRow(P + 'little-finger-distal');
littleDistalRow[6] = joinPaths([...newL['little-finger-distal'], ...newR['little-finger-distal']]);

const splitLittleDistalR = snap['little-finger-distal'].right;
console.log(`\nSplit #4: little-distal R has ${splitLittleDistalR.length} paths → creating numbered entries`);
console.log('  (User: classify as little-finger-middle or nonsense-to-remove)');

const littleDistalIdx = findRowIndex(P + 'little-finger-distal');
const templateRow = findRow(P + 'little-finger-distal');

let splitCounter = 0;
for (let i = 0; i < splitLittleDistalR.length; i++) {
  splitCounter++;
  const newRow = [...templateRow];
  newRow[0] = `split-little-distal-${splitCounter}`;
  newRow[1] = `Split Little Distal ${splitCounter}`;
  newRow[2] = '';
  newRow[6] = splitLittleDistalR[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(littleDistalIdx + splitCounter, 0, newRow);
}

// Correction #6: index-distal R (6 paths) → numbered entries
// index-distal also keeps its L paths, but R paths need splitting
const indexDistalRow = findRow(P + 'index-finger-distal');
indexDistalRow[6] = joinPaths(newL['index-finger-distal']);  // L paths only for now

const splitIndexDistalR = snap['index-finger-distal'].right;
console.log(`\nSplit #6: index-distal R has ${splitIndexDistalR.length} paths → creating numbered entries`);
console.log('  (User: classify as index-distal or ring-distal)');

const indexDistalIdx = findRowIndex(P + 'index-finger-distal');
for (let i = 0; i < splitIndexDistalR.length; i++) {
  splitCounter++;
  const newRow = [...indexDistalRow];
  newRow[0] = `split-index-distal-${i + 1}`;
  newRow[1] = `Split Index Distal ${i + 1}`;
  newRow[2] = '';
  newRow[6] = splitIndexDistalR[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(indexDistalIdx + i + 1, 0, newRow);
}

// Left correction #1: index-middle L → numbered entries
// index-middle keeps its R paths, but L paths need splitting
const indexMiddleRow = findRow(P + 'index-finger-middle');
indexMiddleRow[6] = joinPaths(newR['index-finger-middle']);  // R paths only for now

const splitIndexMiddleL = snap['index-finger-middle'].left;
console.log(`\nLeft Split #1: index-middle L has ${splitIndexMiddleL.length} paths → creating numbered entries`);
console.log('  (User: classify as index-middle or middle-middle)');

const indexMiddleIdx = findRowIndex(P + 'index-finger-middle');
for (let i = 0; i < splitIndexMiddleL.length; i++) {
  splitCounter++;
  const newRow = [...indexMiddleRow];
  newRow[0] = `split-index-middle-L-${i + 1}`;
  newRow[1] = `Split Index Middle L ${i + 1}`;
  newRow[2] = '';
  newRow[6] = splitIndexMiddleL[i];
  newRow[7] = ''; newRow[8] = ''; newRow[9] = ''; newRow[10] = ''; newRow[11] = ''; newRow[12] = '';
  csv.rows.splice(indexMiddleIdx + i + 1, 0, newRow);
}

// Step 6: Remove unknown-finger-path entries
csv.rows = csv.rows.filter(r => !r[0].startsWith('unknown-finger-path'));

// Step 7: Write
const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);

console.log('\n--- Summary ---');
console.log('New right-hand path counts:');
for (const id of ids) {
  console.log(`  ${id}: ${newL[id].length}L ${newR[id].length}R`);
}
console.log(`\nCreated ${splitLittleDistalR.length} split-little-distal-N entries (correction #4)`);
console.log(`Created ${splitIndexDistalR.length} split-index-distal-N entries (correction #6)`);
console.log(`Created ${splitIndexMiddleL.length} split-index-middle-L-N entries (left correction #1)`);
console.log('\nNote: middle-finger-distal is now empty (paths missing from source SVG)');
console.log('Note: middle-finger-proximal R is now empty');
console.log('\nDone. CSV updated.');
