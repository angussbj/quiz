#!/usr/bin/env node
/**
 * Generate Wikipedia slug guesses for all quiz CSVs.
 *
 * Strategy: for each entity, generate a ranked list of slug candidates
 * (type-specific heuristics), then validate each against the Wikipedia
 * REST API until one hits. Write the first valid slug to the CSV.
 *
 * Usage:
 *   node scripts/generateWikipediaSlugs.mjs              # generate + validate + write
 *   node scripts/generateWikipediaSlugs.mjs --dry-run     # validate only, don't write
 *   node scripts/generateWikipediaSlugs.mjs --check-only  # just check existing wikipedia columns
 *   node scripts/generateWikipediaSlugs.mjs --file borders/world-borders.csv  # single file
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('public/data');
const DRY_RUN = process.argv.includes('--dry-run');
const CHECK_ONLY = process.argv.includes('--check-only');
const FILE_FILTER = (() => {
  const idx = process.argv.indexOf('--file');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

// ─── CSV config ───────────────────────────────────────────────────────────────

// Each entry: { nameColumn, type, extraColumns? }
// type determines which slug-candidate strategy to use
const CSV_CONFIG = {
  'bones-3d/bones.csv': { nameColumn: 'name', type: 'bone' },
  'borders/world-borders.csv': { nameColumn: 'name', type: 'country' },
  'capitals/world-capitals.csv': { nameColumn: 'city', type: 'city', extraColumns: ['country'] },
  'cities/largest-cities.csv': { nameColumn: 'city', type: 'city', extraColumns: ['country'] },
  'history/ancient/ancient-civilizations.csv': { nameColumn: 'civilization', type: 'generic' },
  'history/ancient/geological-eras.csv': { nameColumn: 'era', type: 'generic' },
  'history/ancient/major-empires.csv': { nameColumn: 'empire', type: 'empire' },
  'history/ancient/roman-emperors.csv': { nameColumn: 'emperor', type: 'person' },
  'history/culture/art-movements.csv': { nameColumn: 'movement', type: 'generic' },
  'history/leaders/cultural-leaders.csv': { nameColumn: 'figure', type: 'person' },
  'history/leaders/military-leaders.csv': { nameColumn: 'leader', type: 'person' },
  'history/leaders/political-leaders.csv': { nameColumn: 'leader', type: 'person' },
  'history/leaders/religious-leaders.csv': { nameColumn: 'leader', type: 'person' },
  'history/modern/modern-history.csv': { nameColumn: 'event', type: 'event' },
  'history/modern/ww1-timeline.csv': { nameColumn: 'event', type: 'event' },
  'history/modern/ww2-timeline.csv': { nameColumn: 'event', type: 'event' },
  'history/music/composers.csv': { nameColumn: 'composer', type: 'person' },
  'history/science/pandemics.csv': { nameColumn: 'pandemic', type: 'generic' },
  'history/science/scientific-discoveries.csv': { nameColumn: 'discovery', type: 'generic' },
  'history/science/species-evolution-all.csv': { nameColumn: 'species', type: 'species' },
  'history/science/species-evolution-major.csv': { nameColumn: 'species', type: 'species' },
  'history/space/space-milestones.csv': { nameColumn: 'event', type: 'event' },
  'history/technology/major-inventions.csv': { nameColumn: 'invention', type: 'generic' },
  'rivers/world-rivers.csv': { nameColumn: 'name', type: 'river' },
  'science/biology/human-bones.csv': { nameColumn: 'name', type: 'bone' },
  'science/chemistry/periodic-table.csv': { nameColumn: 'name', type: 'element' },
  'subdivisions/brazil.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Brazil' },
  'subdivisions/china.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'China' },
  'subdivisions/india.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'India' },
  'subdivisions/indonesia.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Indonesia' },
  'subdivisions/japan.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Japan' },
  'subdivisions/mexico.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Mexico' },
  'subdivisions/nigeria.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Nigeria' },
  'subdivisions/russia.csv': { nameColumn: 'name', type: 'subdivision', extraColumns: [], country: 'Russia' },
  'subdivisions/united-states.csv': { nameColumn: 'name', type: 'us-state' },
};

const SKIP = new Set([
  'lakes/large-lakes.csv',
  'lakes/medium-lakes.csv',
  'rivers/world-lakes-debug.csv',
]);

// ─── CSV parsing ──────────────────────────────────────────────────────────────

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

// ─── Slug candidate generators ───────────────────────────────────────────────

function slug(s) { return s.replace(/ /g, '_'); }

function generateCandidates(name, type, row, config) {
  const s = slug(name);
  switch (type) {
    case 'country':
      return [s, s + '_(country)'];
    case 'city':
      return [s, s + ',_' + slug(row?.['country'] ?? ''), s + '_(city)'];
    case 'river':
      return [s + '_River', s + '_(river)', s];
    case 'bone':
      return [s + '_(bone)', s + '_(anatomy)', s];
    case 'element':
      return [s, s + '_(element)'];
    case 'us-state':
      return [s, s + '_(U.S._state)', s + '_(state)'];
    case 'subdivision':
      return [s, s + '_(' + slug(config?.country ?? '') + ')'];
    case 'empire':
      return [s, s + '_(empire)'];
    case 'person':
      return [s];
    case 'species':
      return [s];
    case 'event':
      return [s];
    case 'generic':
    default:
      return [s];
  }
}

// ─── Wikipedia API ────────────────────────────────────────────────────────────

const CONCURRENCY = 3;
const DELAY_MS = 300;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function checkSlug(slugStr, retries = 2) {
  if (!slugStr) return { valid: false };
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slugStr)}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'QuizApp/1.0 (educational)' } });
      if (res.ok) {
        const data = await res.json();
        if (data.type === 'disambiguation') {
          return { valid: false, disambiguation: true, resolvedTitle: data.title };
        }
        return { valid: true, resolvedTitle: data.title };
      }
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      return { valid: false };
    } catch {
      if (attempt < retries) { await sleep(1000 * (attempt + 1)); continue; }
      return { valid: false };
    }
  }
  return { valid: false };
}

/**
 * Try each candidate slug in order; return the first valid one.
 */
async function findValidSlug(candidates) {
  for (const candidate of candidates) {
    if (!candidate || candidate.includes('undefined')) continue;
    const result = await checkSlug(candidate);
    if (result.valid) return { slug: candidate, resolvedTitle: result.resolvedTitle };
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let totalValid = 0;
  let totalInvalid = 0;
  const allMisses = [];

  for (const [csvRelPath, config] of Object.entries(CSV_CONFIG)) {
    if (SKIP.has(csvRelPath)) continue;
    if (FILE_FILTER && csvRelPath !== FILE_FILTER) continue;
    const csvPath = path.join(DATA_DIR, csvRelPath);
    if (!fs.existsSync(csvPath)) { console.log(`⚠ Skipping missing: ${csvRelPath}`); continue; }

    console.log(`\n━━━ ${csvRelPath} ━━━`);

    const text = fs.readFileSync(csvPath, 'utf-8');
    const parsed = parseCSV(text);
    const headers = parsed[0];
    const objects = csvToObjects(parsed);
    const hasWikipediaColumn = headers.includes('wikipedia');

    if (CHECK_ONLY && !hasWikipediaColumn) { console.log('  No wikipedia column — skip'); continue; }

    // Build work items
    const items = objects.map((row, idx) => {
      const name = row[config.nameColumn] ?? '';
      const existing = hasWikipediaColumn ? row['wikipedia'] : '';
      return { idx, name, existing, row };
    });

    // For CHECK_ONLY, validate existing; otherwise generate candidates for items without a valid slug
    const toValidate = CHECK_ONLY
      ? items.filter(it => it.existing)
      : items;

    console.log(`  Processing ${toValidate.length} entries...`);

    let valid = 0;
    let invalid = 0;
    const results = new Map(); // idx → resolvedSlug

    for (let i = 0; i < toValidate.length; i += CONCURRENCY) {
      const batch = toValidate.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async (item) => {
        // If we already have a valid slug from a previous run, just validate it
        if (item.existing && !CHECK_ONLY) {
          const check = await checkSlug(item.existing);
          if (check.valid) return { item, resolvedSlug: check.resolvedTitle.replace(/ /g, '_') };
        }

        if (CHECK_ONLY) {
          const check = await checkSlug(item.existing);
          return { item, resolvedSlug: check.valid ? check.resolvedTitle.replace(/ /g, '_') : null };
        }

        // Generate candidates and try each
        const candidates = generateCandidates(item.name, config.type, item.row, config);
        const found = await findValidSlug(candidates);
        return { item, resolvedSlug: found ? found.resolvedTitle.replace(/ /g, '_') : null };
      }));

      for (const { item, resolvedSlug } of batchResults) {
        if (resolvedSlug) {
          results.set(item.idx, resolvedSlug);
          valid++;
        } else {
          invalid++;
          const candidates = generateCandidates(item.name, config.type, item.row, config);
          allMisses.push({ file: csvRelPath, name: item.name, tried: candidates.join(', ') });
        }
      }

      const done = Math.min(i + CONCURRENCY, toValidate.length);
      process.stderr.write(`\r  ${done}/${toValidate.length} (${valid} valid)`);
      if (i + CONCURRENCY < toValidate.length) await sleep(DELAY_MS);
    }
    process.stderr.write('\n');
    console.log(`  ✓ ${valid} valid, ✗ ${invalid} invalid`);
    totalValid += valid;
    totalInvalid += invalid;

    // Write CSV
    if (!DRY_RUN && !CHECK_ONLY) {
      const updatedHeaders = hasWikipediaColumn ? headers : [...headers, 'wikipedia'];
      for (let idx = 0; idx < objects.length; idx++) {
        const resolved = results.get(idx);
        if (resolved) {
          objects[idx]['wikipedia'] = resolved;
        } else if (!objects[idx]['wikipedia']) {
          // Leave empty for misses so we can fill them later
          objects[idx]['wikipedia'] = '';
        }
      }
      const csvOut = objectsToCSV(updatedHeaders, objects);
      fs.writeFileSync(csvPath, csvOut);
      console.log(`  Wrote ${csvPath}`);
    }
  }

  console.log(`\n━━━ Summary ━━━`);
  console.log(`Valid: ${totalValid}, Invalid: ${totalInvalid}`);

  if (allMisses.length > 0) {
    console.log(`\nMisses (${allMisses.length}):`);
    for (const miss of allMisses) {
      console.log(`  ${miss.file}: "${miss.name}" [tried: ${miss.tried}]`);
    }
    // Write misses to a file for the AI agent to process
    const missesPath = path.resolve('scripts/wikipedia-misses.json');
    fs.writeFileSync(missesPath, JSON.stringify(allMisses, null, 2));
    console.log(`\nMisses written to ${missesPath}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
