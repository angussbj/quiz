#!/usr/bin/env node
/**
 * Targeted fixes:
 * 1. Merge ilium/pubis/ischium back into a single "pelvis" entry
 * 2. Flip right-hand finger phalanges: thumb↔little, index↔ring
 *    (middle finger stays)
 * 3. Mark uncertain right-hand paths as "unknown finger path N"
 *
 * Does NOT touch ribs or toes.
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
  const paths = pathsStr.split('|');
  const left = [];  // x > MIDLINE (skeleton's left)
  const right = []; // x <= MIDLINE (skeleton's right)
  for (const p of paths) {
    if (pathMidX(p) > MIDLINE) left.push(p);
    else right.push(p);
  }
  return { left, right };
}

// --- Main ---

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRow(id) { return csv.rows.find(r => r[0] === id); }
function findRowIndex(id) { return csv.rows.findIndex(r => r[0] === id); }

// ============================================================
// PART 1: Merge ilium/pubis/ischium back into pelvis
// ============================================================
console.log('Part 1: Merging ilium/pubis/ischium → pelvis...');

const iliumRow = findRow('ilium');
const pubisRow = findRow('pubis');
const ischiumRow = findRow('ischium');

if (iliumRow && pubisRow && ischiumRow) {
  const allPaths = [iliumRow[6], pubisRow[6], ischiumRow[6]].join('|');
  const iliumIdx = findRowIndex('ilium');

  // Create pelvis row from ilium template
  const pelvisRow = [...iliumRow];
  pelvisRow[0] = 'pelvis';
  pelvisRow[1] = 'Pelvis';
  pelvisRow[2] = 'pelvic girdle|hip bone|os coxae|innominate bone';
  pelvisRow[6] = allPaths;

  // Remove ilium, pubis, ischium and insert pelvis
  csv.rows = csv.rows.filter(r => r[0] !== 'ilium' && r[0] !== 'pubis' && r[0] !== 'ischium');
  const newInsertIdx = Math.min(iliumIdx, csv.rows.length);
  csv.rows.splice(newInsertIdx, 0, pelvisRow);

  const pathCount = allPaths.split('|').length;
  console.log(`  Created pelvis with ${pathCount} paths.`);
} else {
  console.log('  WARNING: Could not find ilium/pubis/ischium entries');
}

// ============================================================
// PART 2: Flip right-hand finger phalanges
// ============================================================
console.log('\nPart 2: Flipping right-hand finger phalanges...');

// Swap pairs for right-hand paths only:
//   thumb ↔ little (proximal, distal)
//   index ↔ ring (proximal, middle, distal)
//   middle stays

const swapPairs = [
  ['phalanx-hand-thumb-proximal', 'phalanx-hand-little-finger-proximal'],
  ['phalanx-hand-thumb-distal', 'phalanx-hand-little-finger-distal'],
  ['phalanx-hand-index-finger-proximal', 'phalanx-hand-ring-finger-proximal'],
  ['phalanx-hand-index-finger-middle', 'phalanx-hand-ring-finger-middle'],
  ['phalanx-hand-index-finger-distal', 'phalanx-hand-ring-finger-distal'],
];

for (const [idA, idB] of swapPairs) {
  const rowA = findRow(idA);
  const rowB = findRow(idB);
  if (!rowA || !rowB) {
    console.log(`  WARNING: Could not find ${idA} or ${idB}`);
    continue;
  }

  const splitA = splitBySide(rowA[6]);
  const splitB = splitBySide(rowB[6]);

  // A keeps its left, gets B's right
  rowA[6] = [...splitA.left, ...splitB.right].join('|');
  // B keeps its left, gets A's right
  rowB[6] = [...splitB.left, ...splitA.right].join('|');

  console.log(`  Swapped right paths: ${idA} (${splitA.right.length}R) ↔ ${idB} (${splitB.right.length}R)`);
}

// Handle little-finger-middle right paths → unknown
// (Thumb has no middle phalanx, so there's no swap partner)
const littleMiddleRow = findRow('phalanx-hand-little-finger-middle');
if (littleMiddleRow) {
  const split = splitBySide(littleMiddleRow[6]);
  if (split.right.length > 0) {
    console.log(`\n  little-finger-middle has ${split.right.length} right-hand paths with no swap partner.`);

    // Keep only left paths in little-finger-middle
    littleMiddleRow[6] = split.left.join('|');

    // Create unknown entries for the orphaned right paths
    const littleMiddleIdx = findRowIndex('phalanx-hand-little-finger-middle');
    let unknownCount = 0;
    for (const p of split.right) {
      unknownCount++;
      const unknownRow = [...littleMiddleRow];
      unknownRow[0] = `unknown-finger-path-${unknownCount}`;
      unknownRow[1] = `Unknown Finger Path ${unknownCount}`;
      unknownRow[2] = '';
      unknownRow[6] = p;
      unknownRow[7] = '';
      unknownRow[8] = '';
      unknownRow[9] = '';
      unknownRow[10] = '';
      unknownRow[11] = '';
      unknownRow[12] = '';
      csv.rows.splice(littleMiddleIdx + unknownCount, 0, unknownRow);
    }
    console.log(`  Created ${unknownCount} unknown-finger-path entries for orphaned right paths.`);
  }
}

// ============================================================
// Write
// ============================================================
const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);
console.log('\nDone. CSV updated.');
