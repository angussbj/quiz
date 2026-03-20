#!/usr/bin/env node
/**
 * Phase 2: Split pelvis into ilium, pubis, ischium.
 * Analyzes pelvis path bounding boxes and classifies by anatomical position.
 *
 * In the SVG coordinate system (Y increases downward):
 * - Ilium: upper portion (lower Y values) — the large wing-shaped fan
 * - Pubis: front-lower (higher Y, medial/closer to midline x≈203)
 * - Ischium: back-lower (higher Y, lateral/further from midline)
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
    if (i === 6 && f.includes(',')) return `"${f}"`;
    return f;
  }).join(',');
}

function serializeCSV({ header, rows }) {
  return header + '\n' + rows.map(serializeRow).join('\n') + '\n';
}

function getPathBBox(pathStr) {
  const tokens = pathStr.match(/[A-Za-z]|[-+]?\d*\.?\d+/g) || [];
  const xVals = [];
  const yVals = [];
  let expectX = true;
  for (const token of tokens) {
    if (/^[A-Za-z]$/.test(token)) {
      expectX = true;
      continue;
    }
    const val = parseFloat(token);
    if (expectX) {
      xVals.push(val);
      expectX = false;
    } else {
      yVals.push(val);
      expectX = true;
    }
  }
  if (xVals.length === 0 || yVals.length === 0) return null;
  return {
    minX: Math.min(...xVals),
    maxX: Math.max(...xVals),
    minY: Math.min(...yVals),
    maxY: Math.max(...yVals),
    midX: (Math.min(...xVals) + Math.max(...xVals)) / 2,
    midY: (Math.min(...yVals) + Math.max(...yVals)) / 2,
    width: Math.max(...xVals) - Math.min(...xVals),
    height: Math.max(...yVals) - Math.min(...yVals),
  };
}

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

const pelvisRow = csv.rows.find(r => r[0] === 'pelvis');
if (!pelvisRow) {
  console.error('pelvis row not found');
  process.exit(1);
}

const pelvisPaths = pelvisRow[6].split('|');
console.log(`Pelvis has ${pelvisPaths.length} paths\n`);

// Analyze each path
const pathInfos = pelvisPaths.map((p, i) => {
  const bbox = getPathBBox(p);
  return { index: i, path: p, bbox };
}).filter(p => p.bbox);

// Print analysis
for (const info of pathInfos) {
  const b = info.bbox;
  const side = b.midX > MIDLINE ? 'LEFT' : 'RIGHT';
  console.log(`Path ${info.index}: midX=${b.midX.toFixed(1)} midY=${b.midY.toFixed(1)} ` +
    `size=${b.width.toFixed(0)}x${b.height.toFixed(0)} ` +
    `y=[${b.minY.toFixed(0)},${b.maxY.toFixed(0)}] ` +
    `x=[${b.minX.toFixed(0)},${b.maxX.toFixed(0)}] ${side}`);
}

// Classification logic:
// The pelvis SVG paths span roughly Y=325 to Y=420
// Ilium = upper portion (large wing) roughly Y < 390
// Pubis = front-lower, near midline (higher Y, x closer to 203)
// Ischium = back-lower, more lateral (higher Y, x further from 203)
//
// Looking at the data:
// - Large paths spanning Y 325-413 are the main pelvic bones (ilium + some overlap)
// - Small paths near midline with high Y are pubis
// - Small paths far from midline with high Y are ischium
//
// Actually, for the pelvis bone:
// Path 0: the huge main path spanning both sides — this is primarily the ilium (pelvic wing)
// Path 1: near midline, small — this is the pubic symphysis area
// The smaller paths need to be classified individually.

// Let me classify based on position:
// Whole pelvis bbox spans roughly x=131-275, y=325-420
//
// For classification:
// - If the path primarily occupies the upper portion (low Y), it's ilium
// - If the path is near the midline and low (high Y), it's pubis
// - If the path is lateral and low, it's ischium
//
// But really the best approach for the pelvis is:
// The ilium is the large fan-shaped wing (upper part)
// The pubis is the anterior-inferior part connecting near the midline
// The ischium is the posterior-inferior part (what you sit on)
//
// In the SVG:
// - Y increases downward
// - Upper = lower Y = ilium
// - Lower = higher Y = pubis/ischium
// - Near midline at bottom = pubis (pubic symphysis)
// - Lateral at bottom = ischium

console.log('\n--- Classification ---');

const iliumPaths = [];
const pubisPaths = [];
const ischiumPaths = [];

for (const info of pathInfos) {
  const b = info.bbox;
  const distFromMidline = Math.abs(b.midX - MIDLINE);

  // Large paths that span most of the pelvis are ilium (the wing)
  if (b.height > 60 && b.width > 60) {
    iliumPaths.push(info);
    console.log(`Path ${info.index}: ILIUM (large spanning path ${b.width.toFixed(0)}x${b.height.toFixed(0)})`);
    continue;
  }

  // Paths with high Y (lower on screen) and near midline are pubis
  // The pubic symphysis region is near x≈200, y≈400-410
  if (b.midY > 395 && distFromMidline < 15) {
    pubisPaths.push(info);
    console.log(`Path ${info.index}: PUBIS (near midline, low position, midY=${b.midY.toFixed(1)}, dist=${distFromMidline.toFixed(1)})`);
    continue;
  }

  // Paths in the lower portion but more lateral
  if (b.midY > 370) {
    // Check if it's more associated with pubic or ischial area
    // The ischium is the posterior/inferior portion, roughly the "sit bones"
    // In the skeleton SVG, ischium paths tend to be the lower-lateral portions
    if (distFromMidline > 25 || b.midY > 405) {
      // Very lateral or very low = could be ischium
      // But we need to be more careful
      // Paths around the hip socket area (acetabulum) boundary are complex

      // If near the bottom and near midline, it's pubis
      if (distFromMidline < 20 && b.midY > 395) {
        pubisPaths.push(info);
        console.log(`Path ${info.index}: PUBIS (low, near midline midY=${b.midY.toFixed(1)}, dist=${distFromMidline.toFixed(1)})`);
      } else {
        ischiumPaths.push(info);
        console.log(`Path ${info.index}: ISCHIUM (low-lateral, midY=${b.midY.toFixed(1)}, dist=${distFromMidline.toFixed(1)})`);
      }
    } else {
      // Moderate position — could be ilium's lower part or pubis
      // The pubic rami connect ilium to pubic symphysis
      if (b.midY > 390 && distFromMidline < 20) {
        pubisPaths.push(info);
        console.log(`Path ${info.index}: PUBIS (moderate-low, near midline, midY=${b.midY.toFixed(1)}, dist=${distFromMidline.toFixed(1)})`);
      } else {
        iliumPaths.push(info);
        console.log(`Path ${info.index}: ILIUM (mid-level path, midY=${b.midY.toFixed(1)}, dist=${distFromMidline.toFixed(1)})`);
      }
    }
    continue;
  }

  // Upper paths are ilium
  iliumPaths.push(info);
  console.log(`Path ${info.index}: ILIUM (upper portion, midY=${b.midY.toFixed(1)})`);
}

console.log(`\nIlium: ${iliumPaths.length} paths`);
console.log(`Pubis: ${pubisPaths.length} paths`);
console.log(`Ischium: ${ischiumPaths.length} paths`);

// Now create the new rows
const pelvisIdx = csv.rows.findIndex(r => r[0] === 'pelvis');
const pelvisBase = [...pelvisRow]; // clone

// Helper to compute centroid x,y from paths
function computeCentroid(infos) {
  let totalX = 0, totalY = 0, count = 0;
  for (const info of infos) {
    totalX += info.bbox.midX;
    totalY += info.bbox.midY;
    count++;
  }
  return { x: totalX / count, y: totalY / count };
}

function makeBoneRow(id, name, alternates, paths, infos) {
  const centroid = computeCentroid(infos);
  const row = [...pelvisBase];
  row[0] = id;
  row[1] = name;
  row[2] = alternates;
  row[6] = paths;
  row[7] = centroid.x.toFixed(1);  // x
  row[8] = centroid.y.toFixed(1);  // y
  // Keep other fields from pelvis (label positions etc will need updating)
  // Set label positions to reasonable defaults
  row[9] = '29.1';  // label_x (left side)
  row[10] = centroid.y.toFixed(1);  // label_y
  row[11] = (centroid.x < MIDLINE ? centroid.x + 15 : centroid.x - 15).toFixed(1);  // anchor_x
  row[12] = centroid.y.toFixed(1);  // anchor_y
  return row;
}

const iliumRow = makeBoneRow(
  'ilium', 'Ilium', 'iliac bone|hip blade',
  iliumPaths.map(p => p.path).join('|'),
  iliumPaths
);

const pubisRow = makeBoneRow(
  'pubis', 'Pubis', 'pubic bone',
  pubisPaths.map(p => p.path).join('|'),
  pubisPaths
);

const ischiumRow = makeBoneRow(
  'ischium', 'Ischium', 'sit bone|ischial bone',
  ischiumPaths.map(p => p.path).join('|'),
  ischiumPaths
);

// Replace pelvis with the three new rows
csv.rows.splice(pelvisIdx, 1, iliumRow, pubisRow, ischiumRow);

const output = serializeCSV(csv);
writeFileSync(CSV_PATH, output);
console.log('\nPelvis split into ilium, pubis, ischium. CSV updated.');
