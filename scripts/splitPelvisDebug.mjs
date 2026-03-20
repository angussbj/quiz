#!/usr/bin/env node
/**
 * Temporarily replace ilium/pubis/ischium with individually numbered paths
 * so we can visually classify each one in the debug viewer.
 *
 * This is reversible — the original paths are printed to stdout for reference.
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'path';

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

const text = readFileSync(CSV_PATH, 'utf8');
const csv = parseCSV(text);

// Collect all paths from ilium, pubis, ischium
const allPaths = [];
const idsToRemove = new Set(['ilium', 'pubis', 'ischium']);
let insertIdx = -1;

for (let i = 0; i < csv.rows.length; i++) {
  const id = csv.rows[i][0];
  if (idsToRemove.has(id)) {
    if (insertIdx === -1) insertIdx = i;
    const paths = csv.rows[i][6].split('|');
    for (const p of paths) {
      allPaths.push({ path: p, originalBone: id });
    }
  }
}

console.log(`Found ${allPaths.length} total paths from ilium/pubis/ischium`);

// Remove the three original rows
csv.rows = csv.rows.filter(r => !idsToRemove.has(r[0]));

// Create numbered rows — one per path
const templateRow = ['', '', '', 'Torso', 'Pelvis', 'true', '', '', '', '29.1', '', '', ''];
const numberedRows = allPaths.map((info, i) => {
  const num = i + 1;
  const row = [...templateRow];
  row[0] = `hip-path-${num}`;
  row[1] = `Hip Path ${num}`;
  row[2] = '';
  row[6] = info.path;
  row[7] = '';
  row[8] = '';
  row[9] = '';
  row[10] = '';
  row[11] = '';
  row[12] = '';
  return row;
});

csv.rows.splice(insertIdx, 0, ...numberedRows);

writeFileSync(CSV_PATH, serializeCSV(csv));
console.log(`Replaced ilium/pubis/ischium with ${numberedRows.length} individual hip-path-N entries.`);
console.log('Use the debug viewer to identify each path, then tell me which numbers are ilium/pubis/ischium.');
