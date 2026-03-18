/**
 * Fixes country_code alignment in world-capitals.csv.
 *
 * The CSV has a `code` column (ISO 3166-1 alpha-2) that was added by a
 * previous agent, but rows missing `country_alternates` have the code
 * shifted into the wrong column. This script:
 * 1. Parses the CSV properly
 * 2. Detects misaligned codes (short code in country_alternates, empty code)
 * 3. Rewrites the CSV with correct field alignment
 * 4. Renames `code` to `country_code` for clarity
 * 5. Validates all codes have matching flag SVGs
 *
 * Usage: npx tsx scripts/addCountryCodes.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseCsv } from '../src/quiz-definitions/parseCsv.ts';

const ROOT = join(import.meta.dirname, '..');
const CAPITALS_PATH = join(ROOT, 'public/data/capitals/world-capitals.csv');
const FLAGS_DIR = join(ROOT, 'public/flags');

const csvText = readFileSync(CAPITALS_PATH, 'utf-8');
const rows = parseCsv(csvText);

// Fix misaligned rows: if `code` is empty and `country_alternates` looks
// like a 2-letter code, move it to `code`.
for (const row of rows) {
  const alternates = row['country_alternates'] ?? '';
  const code = row['code'] ?? '';

  if (!code && alternates.length === 2 && /^[a-z]{2}$/.test(alternates)) {
    row['code'] = alternates;
    row['country_alternates'] = '';
  }
}

// Rename `code` → `country_code`
for (const row of rows) {
  row['country_code'] = row['code'] ?? '';
  delete row['code'];
}

// Validate
const missingFlags: string[] = [];
const noCodes: string[] = [];
for (const row of rows) {
  if (!row['country_code']) {
    noCodes.push(row['country']);
    continue;
  }
  const flagPath = join(FLAGS_DIR, `${row['country_code']}.svg`);
  if (!existsSync(flagPath)) {
    missingFlags.push(`${row['country']} (${row['country_code']})`);
  }
}

if (noCodes.length > 0) {
  console.error('Countries with no code:', noCodes);
  process.exit(1);
}

if (missingFlags.length > 0) {
  console.error('Missing flag SVGs:', missingFlags);
  process.exit(1);
}

// Write fixed CSV
const headers = ['id', 'city', 'country', 'latitude', 'longitude', 'region', 'subregion', 'city_alternates', 'country_alternates', 'country_code'];

function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('|')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const lines = [headers.join(',')];
for (const row of rows) {
  const fields = headers.map((h) => escapeField(row[h] ?? ''));
  lines.push(fields.join(','));
}

writeFileSync(CAPITALS_PATH, lines.join('\n') + '\n');
console.log(`Fixed and wrote ${rows.length} rows. Column renamed: code → country_code.`);
console.log('All country codes have matching flag SVGs.');
