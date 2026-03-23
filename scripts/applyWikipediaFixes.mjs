#!/usr/bin/env node
/**
 * Validate wikipedia-fixes.json slugs against the Wikipedia titles dump,
 * then apply valid fixes to the CSV files.
 *
 * Usage:
 *   node scripts/applyWikipediaFixes.mjs              # validate + apply
 *   node scripts/applyWikipediaFixes.mjs --dry-run     # validate only
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import os from 'os';

const DATA_DIR = path.resolve('public/data');
const DRY_RUN = process.argv.includes('--dry-run');
const TITLES_DUMP = path.join(os.homedir(), 'Downloads', 'enwiki-latest-all-titles-in-ns0.gz');

// ─── CSV parsing (same as generateWikipediaSlugs.mjs) ────────────────────────

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const len = text.length;

  function parseField() {
    if (i >= len || text[i] === '\n' || text[i] === '\r') return '';
    if (text[i] === '"') {
      i++;
      let field = '';
      while (i < len) {
        if (text[i] === '"') {
          if (i + 1 < len && text[i + 1] === '"') { field += '"'; i += 2; }
          else { i++; break; }
        } else { field += text[i]; i++; }
      }
      return field;
    }
    let field = '';
    while (i < len && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
      field += text[i]; i++;
    }
    return field;
  }

  while (i < len) {
    const row = [];
    while (true) {
      row.push(parseField());
      if (i < len && text[i] === ',') { i++; continue; }
      break;
    }
    if (i < len && text[i] === '\r') i++;
    if (i < len && text[i] === '\n') i++;
    rows.push(row);
  }
  while (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows;
}

function csvToObjects(parsed) {
  const headers = parsed[0];
  return parsed.slice(1).map(row => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = row[i] ?? '';
    return obj;
  });
}

function objectsToCSV(headers, objects) {
  function esc(val) {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) return '"' + val.replace(/"/g, '""') + '"';
    return val;
  }
  const lines = [headers.map(esc).join(',')];
  for (const obj of objects) lines.push(headers.map(h => esc(obj[h] ?? '')).join(','));
  return lines.join('\n') + '\n';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const fixes = JSON.parse(fs.readFileSync('scripts/wikipedia-fixes.json', 'utf-8'));
  console.log(`Loaded ${fixes.length} fixes`);

  // Collect unique slugs to validate
  const slugsToCheck = new Set();
  for (const fix of fixes) {
    if (fix.slug) slugsToCheck.add(fix.slug);
  }
  console.log(`${slugsToCheck.size} unique slugs to validate`);

  // Validate against titles dump
  if (!fs.existsSync(TITLES_DUMP)) {
    console.error(`Wikipedia titles dump not found at ${TITLES_DUMP}`);
    process.exit(1);
  }

  console.log('Streaming Wikipedia titles dump...');
  const validSlugs = new Set();
  const gunzip = zlib.createGunzip();
  const stream = fs.createReadStream(TITLES_DUMP).pipe(gunzip);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineCount = 0;
  let matchCount = 0;
  let skippedHeader = false;
  for await (const line of rl) {
    if (!skippedHeader) { skippedHeader = true; continue; }
    lineCount++;
    if (slugsToCheck.has(line)) {
      validSlugs.add(line);
      matchCount++;
    }
    if (lineCount % 2_000_000 === 0) {
      process.stderr.write(`\r  ${(lineCount / 1_000_000).toFixed(0)}M titles scanned, ${matchCount} matches`);
    }
  }
  process.stderr.write(`\r  ${(lineCount / 1_000_000).toFixed(1)}M titles scanned, ${matchCount} matches\n`);

  const invalidSlugs = [...slugsToCheck].filter(s => !validSlugs.has(s));
  console.log(`\nValid: ${validSlugs.size}, Invalid: ${invalidSlugs.length}`);
  if (invalidSlugs.length > 0) {
    console.log('Invalid slugs:');
    for (const s of invalidSlugs) console.log(`  ${s}`);
  }

  // Group fixes by file
  const fixesByFile = new Map();
  let applied = 0;
  let skipped = 0;
  for (const fix of fixes) {
    if (!fix.slug || !validSlugs.has(fix.slug)) {
      skipped++;
      continue;
    }
    if (!fixesByFile.has(fix.file)) fixesByFile.set(fix.file, []);
    fixesByFile.get(fix.file).push(fix);
  }

  console.log(`\nApplying ${fixes.length - skipped} valid fixes across ${fixesByFile.size} files (${skipped} skipped)`);

  // Apply fixes to each CSV
  for (const [csvRelPath, fileFixes] of fixesByFile) {
    const csvPath = path.join(DATA_DIR, csvRelPath);
    if (!fs.existsSync(csvPath)) {
      console.log(`  SKIP ${csvRelPath} (file not found)`);
      continue;
    }

    const text = fs.readFileSync(csvPath, 'utf-8');
    const parsed = parseCSV(text);
    const headers = parsed[0];
    const objects = csvToObjects(parsed);

    // Build name→slug lookup from fixes
    const nameToSlug = new Map();
    for (const fix of fileFixes) {
      nameToSlug.set(fix.name, fix.slug);
    }

    // Find matching rows and apply
    let fileApplied = 0;
    for (const obj of objects) {
      // Try all columns to find the name match
      for (const [key, val] of Object.entries(obj)) {
        if (nameToSlug.has(val) && (!obj.wikipedia || obj.wikipedia === '')) {
          obj.wikipedia = nameToSlug.get(val);
          fileApplied++;
          break;
        }
      }
    }

    applied += fileApplied;
    console.log(`  ${csvRelPath}: ${fileApplied}/${fileFixes.length} applied`);

    if (!DRY_RUN && fileApplied > 0) {
      const csvOut = objectsToCSV(headers, objects);
      fs.writeFileSync(csvPath, csvOut);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Applied: ${applied}, Skipped (invalid slug): ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
