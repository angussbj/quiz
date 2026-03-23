#!/usr/bin/env node
/**
 * Generate Wikipedia slug guesses for all quiz CSVs.
 *
 * Strategy:
 * 1. Collect all candidate slugs across all CSVs (small set, ~20K)
 * 2. Stream through the Wikipedia titles dump once, marking which candidates exist
 * 3. For each entity, pick the first valid candidate and write it to the CSV
 *
 * Prerequisites:
 *   Download the titles dump:
 *   curl -o ~/Downloads/enwiki-latest-all-titles-in-ns0.gz \
 *     https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz
 *
 * Usage:
 *   node scripts/generateWikipediaSlugs.mjs              # generate + validate + write
 *   node scripts/generateWikipediaSlugs.mjs --dry-run     # validate only, don't write
 *   node scripts/generateWikipediaSlugs.mjs --file borders/world-borders.csv  # single file
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import os from 'os';

const DATA_DIR = path.resolve('public/data');
const DRY_RUN = process.argv.includes('--dry-run');
const FILE_FILTER = (() => {
  const idx = process.argv.indexOf('--file');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

const TITLES_DUMP = path.join(os.homedir(), 'Downloads', 'enwiki-latest-all-titles-in-ns0.gz');

// ─── CSV config ───────────────────────────────────────────────────────────────

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
  'subdivisions/brazil.csv': { nameColumn: 'name', type: 'subdivision', country: 'Brazil' },
  'subdivisions/china.csv': { nameColumn: 'name', type: 'subdivision', country: 'China' },
  'subdivisions/india.csv': { nameColumn: 'name', type: 'subdivision', country: 'India' },
  'subdivisions/indonesia.csv': { nameColumn: 'name', type: 'subdivision', country: 'Indonesia' },
  'subdivisions/japan.csv': { nameColumn: 'name', type: 'subdivision', country: 'Japan' },
  'subdivisions/mexico.csv': { nameColumn: 'name', type: 'subdivision', country: 'Mexico' },
  'subdivisions/nigeria.csv': { nameColumn: 'name', type: 'subdivision', country: 'Nigeria' },
  'subdivisions/russia.csv': { nameColumn: 'name', type: 'subdivision', country: 'Russia' },
  'subdivisions/united-states.csv': { nameColumn: 'name', type: 'us-state' },
};

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

/**
 * Strip side designation and numbers from bone names to get the generic article.
 * "Parietal bone (right)" → "Parietal bone"
 * "Cervical vertebra (C3)" → "Cervical vertebrae"
 * "Rib 5 (right)" → "Rib"
 * "Metatarsal 3 (left)" → "Metatarsal bones"
 */
function boneCandidates(name) {
  const s = slug(name);
  const candidates = [s + '_(bone)', s + '_(anatomy)', s];

  // Strip (left)/(right) and try base name
  const sideStripped = name.replace(/\s*\((left|right)\)\s*$/i, '').trim();
  if (sideStripped !== name) {
    const base = slug(sideStripped);
    candidates.push(base + '_(bone)', base + '_(anatomy)', base);
  }

  // Strip numbered parts: "Cervical vertebra (C3)" → "Cervical vertebrae"
  const numberedMatch = name.match(/^(.+?)\s*\([A-Z]?\d+\)\s*$/);
  if (numberedMatch) {
    const base = slug(numberedMatch[1]);
    candidates.push(base, base + 'e', base + 's'); // try singular + plural
  }

  // Strip trailing numbers: "Metatarsal 3 (left)" → "Metatarsal"
  const trailingNum = sideStripped.match(/^(.+?)\s+\d+$/);
  if (trailingNum) {
    const base = slug(trailingNum[1]);
    candidates.push(base + '_bones', base + '_(bone)', base + '_(anatomy)', base);
  }

  // For teeth: "Upper medial incisor (right)" → "Incisor"
  const toothMatch = sideStripped.match(/(?:Upper|Lower)\s+(?:medial|lateral|first|second|third)?\s*(incisor|canine|premolar|molar)/i);
  if (toothMatch) {
    const toothType = slug(toothMatch[1].charAt(0).toUpperCase() + toothMatch[1].slice(1));
    candidates.push(toothType + '_(tooth)', toothType);
  }

  // For phalanges: "Proximal phalanx of toe 3 (left)" → "Phalanx_bone"
  if (name.includes('phalanx')) {
    candidates.push('Phalanx_bone');
  }

  return [...new Set(candidates)]; // deduplicate
}

function generateCandidates(name, type, row, config) {
  const s = slug(name);
  switch (type) {
    case 'country':
      return [s, s + '_(country)'];
    case 'city': {
      const country = slug(row?.['country'] ?? '');
      // Also try just the city name without province suffix (Chinese cities like "Ji nan Shandong")
      const cityOnly = name.split(' ').length > 2 ? slug(name.split(' ').slice(0, -1).join(' ')) : null;
      const candidates = [s, s + ',_' + country, s + '_(city)', s + '_(' + country + ')'];
      if (cityOnly) candidates.push(cityOnly, cityOnly + ',_' + country, cityOnly + '_(city)');
      return candidates;
    }
    case 'river':
      return [s + '_River', s + '_(river)', s, s + '_river'];
    case 'bone':
      return boneCandidates(name);
    case 'element':
      return [s, s + '_(element)'];
    case 'us-state':
      return [s, s + '_(U.S._state)', s + '_(state)'];
    case 'subdivision': {
      const country = slug(config?.country ?? '');
      return [s, s + '_(' + country + ')', s + '_(state)', s + '_(province)'];
    }
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(TITLES_DUMP)) {
    console.error(`Wikipedia titles dump not found at ${TITLES_DUMP}`);
    console.error('Download: curl -o ~/Downloads/enwiki-latest-all-titles-in-ns0.gz https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz');
    process.exit(1);
  }

  // Phase 1: Collect all candidate slugs across all CSVs
  console.log('Phase 1: Collecting candidate slugs from all CSVs...');

  /** @type {Map<string, {csvRelPath: string, headers: string[], objects: object[], parsed: string[][]}>} */
  const csvData = new Map();
  /** Set of all candidate slugs + existing slugs to check */
  const allCandidates = new Set();
  /** Map: candidate slug → array of { csvRelPath, idx, priority } */
  const candidateIndex = new Map();

  for (const [csvRelPath, config] of Object.entries(CSV_CONFIG)) {
    if (FILE_FILTER && csvRelPath !== FILE_FILTER) continue;
    const csvPath = path.join(DATA_DIR, csvRelPath);
    if (!fs.existsSync(csvPath)) continue;

    const text = fs.readFileSync(csvPath, 'utf-8');
    const parsed = parseCSV(text);
    const headers = parsed[0];
    const objects = csvToObjects(parsed);
    const hasWikipediaColumn = headers.includes('wikipedia');
    csvData.set(csvRelPath, { headers, objects, parsed, config, hasWikipediaColumn });

    for (let idx = 0; idx < objects.length; idx++) {
      const row = objects[idx];
      const name = row[config.nameColumn] ?? '';
      if (!name) continue;

      // Check existing slug
      const existing = hasWikipediaColumn ? row['wikipedia'] : '';
      if (existing) {
        allCandidates.add(existing);
        if (!candidateIndex.has(existing)) candidateIndex.set(existing, []);
        candidateIndex.get(existing).push({ csvRelPath, idx, priority: -1 }); // -1 = existing
      }

      // Generate candidates
      const candidates = generateCandidates(name, config.type, row, config);
      for (let p = 0; p < candidates.length; p++) {
        const c = candidates[p];
        if (!c || c.includes('undefined')) continue;
        allCandidates.add(c);
        if (!candidateIndex.has(c)) candidateIndex.set(c, []);
        candidateIndex.get(c).push({ csvRelPath, idx, priority: p });
      }
    }
  }

  console.log(`  ${allCandidates.size} unique candidate slugs to check`);

  // Phase 2: Stream through titles dump, marking which candidates exist
  console.log('Phase 2: Streaming Wikipedia titles dump...');
  const validTitles = new Set();
  const gunzip = zlib.createGunzip();
  const stream = fs.createReadStream(TITLES_DUMP).pipe(gunzip);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let lineCount = 0;
  let matchCount = 0;
  let skippedHeader = false;
  for await (const line of rl) {
    if (!skippedHeader) { skippedHeader = true; continue; }
    lineCount++;
    if (allCandidates.has(line)) {
      validTitles.add(line);
      matchCount++;
    }
    if (lineCount % 2_000_000 === 0) {
      process.stderr.write(`\r  ${(lineCount / 1_000_000).toFixed(0)}M titles scanned, ${matchCount} matches`);
    }
  }
  process.stderr.write(`\r  ${(lineCount / 1_000_000).toFixed(1)}M titles scanned, ${matchCount} matches\n`);

  // Phase 3: Resolve slugs and write CSVs
  console.log('Phase 3: Resolving slugs and writing CSVs...');

  let totalValid = 0;
  let totalInvalid = 0;
  const allMisses = [];

  for (const [csvRelPath, { headers, objects, config, hasWikipediaColumn }] of csvData) {
    console.log(`\n--- ${csvRelPath} ---`);

    let valid = 0;
    let invalid = 0;
    const results = new Map();

    for (let idx = 0; idx < objects.length; idx++) {
      const row = objects[idx];
      const name = row[config.nameColumn] ?? '';
      if (!name) continue;

      // Check existing slug first
      const existing = hasWikipediaColumn ? row['wikipedia'] : '';
      if (existing && validTitles.has(existing)) {
        results.set(idx, existing);
        valid++;
        continue;
      }

      // Try candidates in priority order
      const candidates = generateCandidates(name, config.type, row, config);
      let found = null;
      for (const c of candidates) {
        if (!c || c.includes('undefined')) continue;
        if (validTitles.has(c)) {
          found = c;
          break;
        }
      }

      if (found) {
        results.set(idx, found);
        valid++;
      } else {
        invalid++;
        allMisses.push({ file: csvRelPath, name, tried: candidates.join(', ') });
      }
    }

    console.log(`  ${valid} valid, ${invalid} invalid`);
    totalValid += valid;
    totalInvalid += invalid;

    if (!DRY_RUN) {
      const updatedHeaders = hasWikipediaColumn ? headers : [...headers, 'wikipedia'];
      for (let idx = 0; idx < objects.length; idx++) {
        const resolved = results.get(idx);
        if (resolved) {
          objects[idx]['wikipedia'] = resolved;
        } else if (!objects[idx]['wikipedia']) {
          objects[idx]['wikipedia'] = '';
        }
      }
      const csvPath = path.join(DATA_DIR, csvRelPath);
      const csvOut = objectsToCSV(updatedHeaders, objects);
      fs.writeFileSync(csvPath, csvOut);
      console.log(`  Wrote ${csvPath}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Valid: ${totalValid}, Invalid: ${totalInvalid}`);

  if (allMisses.length > 0) {
    console.log(`\nMisses (${allMisses.length}):`);
    for (const miss of allMisses) {
      console.log(`  ${miss.file}: "${miss.name}" [tried: ${miss.tried}]`);
    }
    const missesPath = path.resolve('scripts/wikipedia-misses.json');
    fs.writeFileSync(missesPath, JSON.stringify(allMisses, null, 2));
    console.log(`\nMisses written to ${missesPath}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
