#!/usr/bin/env node
/**
 * Fix mislabeled human bones in the CSV.
 * Phases: 1 (xiphoid merge + patella z-order), 3 (metacarpal reversal),
 *         4a (right hand phalanx fixes), 5 (foot phalanx swaps).
 * Phase 2 (pelvis split) is handled separately (needs visual classification).
 * Phase 4b (left hand re-examination) is exploratory.
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';
const MIDLINE = 203;

// Parse CSV: first line is header, remaining are data rows.
// Fields are comma-separated but the "paths" field is quoted and contains commas.
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
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function serializeRow(fields) {
  return fields.map((f, i) => {
    // The paths field (index 6) needs quoting if it contains commas
    if (i === 6 && f.includes(',')) return `"${f}"`;
    return f;
  }).join(',');
}

function serializeCSV({ header, rows }) {
  return header + '\n' + rows.map(serializeRow).join('\n') + '\n';
}

// Get the bounding box midpoint X for a single SVG path string
function pathMidpointX(pathStr) {
  const nums = [];
  // Extract all coordinate pairs from path commands
  const re = /[-+]?\d*\.?\d+/g;
  let match;
  const allNums = [];
  while ((match = re.exec(pathStr)) !== null) {
    allNums.push(parseFloat(match[0]));
  }
  // In SVG path data, coordinates come in x,y pairs after commands
  // Simple approach: extract x values (even indices after command letters)
  const xVals = [];
  let idx = 0;
  const tokens = pathStr.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
  let expectX = true;
  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      expectX = true;
      continue;
    }
    if (expectX) {
      xVals.push(parseFloat(token));
      expectX = false;
    } else {
      expectX = true;
    }
  }
  if (xVals.length === 0) return MIDLINE;
  const minX = Math.min(...xVals);
  const maxX = Math.max(...xVals);
  return (minX + maxX) / 2;
}

// Split pipe-separated paths into left (x>MIDLINE) and right (x<MIDLINE) groups
function splitPathsBySide(pathsStr) {
  const paths = pathsStr.split('|');
  const left = []; // skeleton's left = x > MIDLINE
  const right = []; // skeleton's right = x < MIDLINE
  for (const p of paths) {
    const mx = pathMidpointX(p);
    if (mx > MIDLINE) {
      left.push(p);
    } else {
      right.push(p);
    }
  }
  return { left, right };
}

// --- Main ---
const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

function findRow(id) {
  return csv.rows.find(r => r[0] === id);
}

function findRowIndex(id) {
  return csv.rows.findIndex(r => r[0] === id);
}

function getPaths(row) {
  return row[6];
}

function setPaths(row, paths) {
  row[6] = paths;
}

// ============================================================
// PHASE 1a: Merge xiphoid-process paths into thoracic-vertebrae
// ============================================================
console.log('Phase 1a: Merging xiphoid-process into thoracic-vertebrae...');
const thoracicRow = findRow('thoracic-vertebrae');
const xiphoidRow = findRow('xiphoid-process');
const xiphoidIdx = findRowIndex('xiphoid-process');

if (thoracicRow && xiphoidRow) {
  const thoracicPaths = getPaths(thoracicRow);
  const xiphoidPaths = getPaths(xiphoidRow);
  setPaths(thoracicRow, thoracicPaths + '|' + xiphoidPaths);
  csv.rows.splice(xiphoidIdx, 1);
  console.log('  Merged and deleted xiphoid-process row.');
} else {
  console.log('  ERROR: Could not find thoracic-vertebrae or xiphoid-process');
}

// ============================================================
// PHASE 1b: Patella z-order
// Currently: femur, patella, fibula, tibia
// Desired:   femur, fibula, tibia, patella
// ============================================================
console.log('Phase 1b: Fixing patella z-order...');
const patellaIdx = findRowIndex('patella');
const fibulaIdx = findRowIndex('fibula');
const tibiaIdx = findRowIndex('tibia');

if (patellaIdx >= 0 && fibulaIdx >= 0 && tibiaIdx >= 0) {
  // patella should be right after tibia
  // Current order: femur(57), patella(58), fibula(59), tibia(60) (0-indexed after header removal)
  // Remove patella, then insert after tibia
  const patellaData = csv.rows.splice(patellaIdx, 1)[0];
  // After removal, tibia index shifts down by 1
  const newTibiaIdx = findRowIndex('tibia');
  csv.rows.splice(newTibiaIdx + 1, 0, patellaData);
  console.log('  Moved patella after tibia.');
} else {
  console.log('  ERROR: Could not find patella/fibula/tibia');
}

// ============================================================
// PHASE 5: Foot phalanx swaps
// ============================================================
console.log('Phase 5: Foot phalanx swaps...');

// Read all current foot phalanx data
const footIds = [
  'phalanx-foot-big-toe-proximal',
  'phalanx-foot-big-toe-distal',
  'phalanx-foot-2nd-toe-proximal',
  'phalanx-foot-2nd-toe-distal',
  'phalanx-foot-3rd-toe-proximal',
  'phalanx-foot-3rd-toe-distal',
  'phalanx-foot-4th-toe-proximal',
  'phalanx-foot-4th-toe-distal',
  'phalanx-foot-little-toe-proximal',
  'phalanx-foot-little-toe-distal',
];

// Save current paths for all foot phalanges
const currentPaths = {};
for (const id of footIds) {
  const row = findRow(id);
  if (row) {
    currentPaths[id] = getPaths(row);
  } else {
    console.log(`  WARNING: Could not find ${id}`);
  }
}

// Split little-toe-distal and 4th-toe-proximal by side
const littleDistalSplit = splitPathsBySide(currentPaths['phalanx-foot-little-toe-distal']);
const fourthProxSplit = splitPathsBySide(currentPaths['phalanx-foot-4th-toe-proximal']);

console.log(`  little-toe-distal: ${littleDistalSplit.left.length} left, ${littleDistalSplit.right.length} right`);
console.log(`  4th-toe-proximal: ${fourthProxSplit.left.length} left, ${fourthProxSplit.right.length} right`);

// Apply the mapping from the plan:
// big-toe-proximal ← current 3rd-toe-proximal ALL
setPaths(findRow('phalanx-foot-big-toe-proximal'), currentPaths['phalanx-foot-3rd-toe-proximal']);
// big-toe-distal ← current 3rd-toe-distal ALL
setPaths(findRow('phalanx-foot-big-toe-distal'), currentPaths['phalanx-foot-3rd-toe-distal']);
// 2nd-toe-proximal ← current 2nd-toe-distal ALL
setPaths(findRow('phalanx-foot-2nd-toe-proximal'), currentPaths['phalanx-foot-2nd-toe-distal']);
// 2nd-toe-distal ← current 4th-toe-distal ALL
setPaths(findRow('phalanx-foot-2nd-toe-distal'), currentPaths['phalanx-foot-4th-toe-distal']);
// 3rd-toe-proximal ← current 2nd-toe-proximal ALL
setPaths(findRow('phalanx-foot-3rd-toe-proximal'), currentPaths['phalanx-foot-2nd-toe-proximal']);
// 3rd-toe-distal ← current little-toe-distal LEFT + current 4th-toe-proximal RIGHT
setPaths(findRow('phalanx-foot-3rd-toe-distal'),
  [...littleDistalSplit.left, ...fourthProxSplit.right].join('|'));
// 4th-toe-proximal ← current 4th-toe-proximal LEFT (stays) + current little-toe-distal RIGHT
setPaths(findRow('phalanx-foot-4th-toe-proximal'),
  [...fourthProxSplit.left, ...littleDistalSplit.right].join('|'));
// 4th-toe-distal ← current big-toe-distal ALL
setPaths(findRow('phalanx-foot-4th-toe-distal'), currentPaths['phalanx-foot-big-toe-distal']);
// little-toe-proximal: unchanged
// little-toe-distal ← current big-toe-proximal ALL
setPaths(findRow('phalanx-foot-little-toe-distal'), currentPaths['phalanx-foot-big-toe-proximal']);

console.log('  All foot phalanx paths swapped.');

// ============================================================
// PHASE 3: Metacarpal reversal (right-hand paths only)
// ============================================================
console.log('Phase 3: Metacarpal reversal...');

const metacarpalIds = ['metacarpal-1', 'metacarpal-2', 'metacarpal-3', 'metacarpal-4', 'metacarpal-5'];
const metacarpalSplits = {};
for (const id of metacarpalIds) {
  const row = findRow(id);
  if (row) {
    metacarpalSplits[id] = splitPathsBySide(getPaths(row));
    console.log(`  ${id}: ${metacarpalSplits[id].left.length} left, ${metacarpalSplits[id].right.length} right`);
  }
}

// Swap right-hand paths: 1↔5, 2↔4, 3 stays
// metacarpal-1 gets: its own left + metacarpal-5's right
// metacarpal-5 gets: its own left + metacarpal-1's right
// metacarpal-2 gets: its own left + metacarpal-4's right
// metacarpal-4 gets: its own left + metacarpal-2's right

function setMetacarpalPaths(id, leftPaths, rightPaths) {
  const row = findRow(id);
  setPaths(row, [...leftPaths, ...rightPaths].join('|'));
}

setMetacarpalPaths('metacarpal-1', metacarpalSplits['metacarpal-1'].left, metacarpalSplits['metacarpal-5'].right);
setMetacarpalPaths('metacarpal-5', metacarpalSplits['metacarpal-5'].left, metacarpalSplits['metacarpal-1'].right);
setMetacarpalPaths('metacarpal-2', metacarpalSplits['metacarpal-2'].left, metacarpalSplits['metacarpal-4'].right);
setMetacarpalPaths('metacarpal-4', metacarpalSplits['metacarpal-4'].left, metacarpalSplits['metacarpal-2'].right);
// metacarpal-3 stays the same

console.log('  Metacarpal right-hand paths swapped.');

// ============================================================
// PHASE 4a: Right hand phalanx fixes
// ============================================================
console.log('Phase 4a: Right hand phalanx fixes...');

// #5: index-finger-middle has paths for both index AND middle on the right hand.
// Split right-hand paths by lateral position.
const indexMiddleRow = findRow('phalanx-hand-index-finger-middle');
const middleMiddleRow = findRow('phalanx-hand-middle-finger-middle');

if (indexMiddleRow && middleMiddleRow) {
  const indexMiddleSplit = splitPathsBySide(getPaths(indexMiddleRow));
  const middleMiddleSplit = splitPathsBySide(getPaths(middleMiddleRow));

  // Right-hand paths (x<203): split by lateral position
  // Index finger is more lateral (lower x on right hand, i.e., further from midline)
  // Middle finger is more medial (higher x on right hand, i.e., closer to midline)
  const rightPaths = indexMiddleSplit.right;

  if (rightPaths.length >= 2) {
    // Sort by midpoint X - lower X = more lateral = index finger
    const sorted = rightPaths.map(p => ({ path: p, mx: pathMidpointX(p) }))
      .sort((a, b) => a.mx - b.mx);

    // On right hand (x<203): lower x = more lateral = index finger
    // higher x (closer to midline) = middle finger
    const midpoint = sorted.length / 2;
    const indexPaths = sorted.slice(0, Math.ceil(midpoint)).map(s => s.path);
    const middlePaths = sorted.slice(Math.ceil(midpoint)).map(s => s.path);

    console.log(`  #5 index-finger-middle right: ${rightPaths.length} paths → ${indexPaths.length} index + ${middlePaths.length} middle`);
    for (const s of sorted) {
      console.log(`    midX=${s.mx.toFixed(1)}`);
    }

    // index-finger-middle: left paths + index right paths
    setPaths(indexMiddleRow, [...indexMiddleSplit.left, ...indexPaths].join('|'));
    // middle-finger-middle: its existing left paths + new middle right paths
    setPaths(middleMiddleRow, [...middleMiddleSplit.left, ...middlePaths].join('|'));
  } else {
    console.log(`  #5: Only ${rightPaths.length} right-hand path(s) for index-finger-middle, skipping split`);
  }
}

// #6: index-finger-distal has paths for both index AND middle on the right hand.
const indexDistalRow = findRow('phalanx-hand-index-finger-distal');
const middleDistalRow = findRow('phalanx-hand-middle-finger-distal');

if (indexDistalRow && middleDistalRow) {
  const indexDistalSplit = splitPathsBySide(getPaths(indexDistalRow));
  const middleDistalSplit = splitPathsBySide(getPaths(middleDistalRow));

  const rightPaths = indexDistalSplit.right;

  if (rightPaths.length >= 2) {
    const sorted = rightPaths.map(p => ({ path: p, mx: pathMidpointX(p) }))
      .sort((a, b) => a.mx - b.mx);

    const midpoint = sorted.length / 2;
    const indexPaths = sorted.slice(0, Math.ceil(midpoint)).map(s => s.path);
    const middlePaths = sorted.slice(Math.ceil(midpoint)).map(s => s.path);

    console.log(`  #6 index-finger-distal right: ${rightPaths.length} paths → ${indexPaths.length} index + ${middlePaths.length} middle`);
    for (const s of sorted) {
      console.log(`    midX=${s.mx.toFixed(1)}`);
    }

    setPaths(indexDistalRow, [...indexDistalSplit.left, ...indexPaths].join('|'));
    // middle-finger-distal gets the middle paths added to its right side
    // But wait — #7 says middle-finger-distal's right-hand paths are actually ring finger
    // So we need to handle #7 first or be careful about ordering
    // Let's save the current middle-finger-distal state before #7 modifies it
    // Actually, let's just add the middle distal right paths to middle-finger-distal
    // and #7 will then move the ORIGINAL right paths of middle-finger-distal to ring-finger-distal

    // For #6: middle-finger-distal gets its left paths + these new middle right paths
    // But #7 says the CURRENT right paths of middle-finger-distal are ring finger distal
    // So the new right paths from #6 are the TRUE middle-finger-distal right paths
    setPaths(middleDistalRow, [...middleDistalSplit.left, ...middlePaths].join('|'));

    // #7: The original right-hand paths of middle-finger-distal are actually ring-finger-distal
    const ringDistalRow = findRow('phalanx-hand-ring-finger-distal');
    if (ringDistalRow) {
      const ringDistalSplit = splitPathsBySide(getPaths(ringDistalRow));
      // Add the original middle-finger-distal right paths to ring-finger-distal
      setPaths(ringDistalRow, [...ringDistalSplit.left, ...middleDistalSplit.right, ...ringDistalSplit.right].join('|'));
      console.log(`  #7: Moved ${middleDistalSplit.right.length} middle-finger-distal right paths to ring-finger-distal`);
    }
  } else {
    console.log(`  #6: Only ${rightPaths.length} right-hand path(s) for index-finger-distal, skipping split`);
  }
}

// ============================================================
// Write output
// ============================================================
const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);
console.log('\nDone! CSV updated.');
