/**
 * Query Wikidata for river tributary relationships for the rivers in world-rivers.csv.
 *
 * Strategy: bulk-download all Wikidata P403 (mouth of the watercourse) pairs where
 * both entities are rivers, then filter locally to names found in our CSV.
 *
 * Ambiguity detection: if a tributary name maps to multiple different parent rivers
 * in Wikidata, it's flagged as AMBIGUOUS — likely a name collision between different
 * rivers. The geographically closest match (by Wikidata coordinates vs CSV coordinates)
 * is selected, but the flag prompts manual verification.
 *
 * Usage: node scripts/queryWikidataRiverRelations.mjs
 */

import { readFileSync } from 'fs';

const RIVERS_PATH = 'public/data/rivers/world-rivers.csv';
const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n');
  const cols = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const row = {};
    cols.forEach((col, idx) => { row[col] = values[idx] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Wikidata query ────────────────────────────────────────────────────────────

async function sparqlQuery(query) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RiverQuizDataScript/1.0 (quiz data enrichment)',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SPARQL ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.results.bindings;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rows = parseCSV(readFileSync(RIVERS_PATH, 'utf8'));

// Build lookup: name → CSV row (primary + alternates)
const csvNameToRow = new Map();
for (const row of rows) {
  const add = (name) => { if (name && !csvNameToRow.has(name)) csvNameToRow.set(name, row); };
  add(row.name);
  for (const alt of (row.name_alternates ?? '').split('|').map((s) => s.trim()).filter(Boolean)) {
    add(alt);
  }
}
console.log(`CSV: ${rows.length} rivers, ${csvNameToRow.size} names (incl. alternates)`);

// ── Step 1: bulk fetch all river→river P403 pairs with coordinates ─────────────
console.log('\nFetching all river→river P403 pairs from Wikidata (may take 20–40s)...');

// Fetch with coordinates so we can disambiguate name collisions geographically
const bulkQuery = `
SELECT DISTINCT ?tributaryLabel ?riverLabel ?tribLat ?tribLng WHERE {
  ?tributary wdt:P403 ?river .
  ?tributary wdt:P31 wd:Q4022 .
  ?river wdt:P31 wd:Q4022 .
  ?tributary rdfs:label ?tributaryLabel . FILTER(LANG(?tributaryLabel) = "en")
  ?river rdfs:label ?riverLabel . FILTER(LANG(?riverLabel) = "en")
  OPTIONAL {
    ?tributary wdt:P625 ?coord .
    BIND(geof:latitude(?coord) AS ?tribLat)
    BIND(geof:longitude(?coord) AS ?tribLng)
  }
}`;

let bindings;
try {
  bindings = await sparqlQuery(bulkQuery);
  console.log(`  Got ${bindings.length} pairs.`);
} catch (e) {
  console.error(`  Bulk query failed: ${e.message}`);
  console.log('  Falling back to query without coordinates...');
  const fallback = `
SELECT DISTINCT ?tributaryLabel ?riverLabel WHERE {
  ?tributary wdt:P403 ?river .
  ?tributary wdt:P31 wd:Q4022 .
  ?river wdt:P31 wd:Q4022 .
  ?tributary rdfs:label ?tributaryLabel . FILTER(LANG(?tributaryLabel) = "en")
  ?river rdfs:label ?riverLabel . FILTER(LANG(?riverLabel) = "en")
}`;
  bindings = await sparqlQuery(fallback);
  console.log(`  Got ${bindings.length} pairs (no coordinates).`);
}

// ── Step 2: check unmatched CSV rivers via label-lookup ────────────────────────
const step1TribNames = new Set(bindings.map((b) => b.tributaryLabel?.value));
const unclassifiedNotInStep1 = rows
  .filter((r) => !r.tributary_of && !r.distributary_of && !r.segment_of)
  .filter((r) => !step1TribNames.has(r.name));

if (unclassifiedNotInStep1.length > 0) {
  console.log(`\nRunning label-based fallback for ${unclassifiedNotInStep1.length} unmatched CSV rivers...`);
  const BATCH = 60;
  for (let i = 0; i < unclassifiedNotInStep1.length; i += BATCH) {
    const batch = unclassifiedNotInStep1.slice(i, i + BATCH);
    const labelList = batch.map((r) => `"${r.name.replace(/"/g, '\\"')}"@en`).join(' ');
    const batchQuery = `
SELECT DISTINCT ?tributaryLabel ?riverLabel ?tribLat ?tribLng WHERE {
  VALUES ?tributaryLabel { ${labelList} }
  ?tributary rdfs:label ?tributaryLabel .
  ?tributary wdt:P403 ?river .
  ?river rdfs:label ?riverLabel . FILTER(LANG(?riverLabel) = "en")
  OPTIONAL {
    ?tributary wdt:P625 ?coord .
    BIND(geof:latitude(?coord) AS ?tribLat)
    BIND(geof:longitude(?coord) AS ?tribLng)
  }
}`;
    try {
      const extra = await sparqlQuery(batchQuery);
      if (extra.length > 0) bindings.push(...extra);
    } catch (e) {
      process.stderr.write(`  Batch ${Math.floor(i / BATCH) + 1} failed: ${e.message}\n`);
    }
    if (i + BATCH < unclassifiedNotInStep1.length) {
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

// ── Step 3: group Wikidata results by tributary name → set of parent rivers ────
// key: tributaryLabel → Map<riverLabel, {tribLat, tribLng}[]>
const wikidataByTrib = new Map();
for (const b of bindings) {
  const tribName = b.tributaryLabel?.value ?? '';
  const riverName = b.riverLabel?.value ?? '';
  if (!tribName || !riverName) continue;
  if (!wikidataByTrib.has(tribName)) wikidataByTrib.set(tribName, new Map());
  const parents = wikidataByTrib.get(tribName);
  if (!parents.has(riverName)) parents.set(riverName, []);
  const lat = b.tribLat?.value !== undefined ? parseFloat(b.tribLat.value) : null;
  const lng = b.tribLng?.value !== undefined ? parseFloat(b.tribLng.value) : null;
  if (lat !== null && lng !== null) {
    parents.get(riverName).push({ lat, lng });
  }
}

// ── Step 4: filter to CSV matches and pick best parent per tributary ────────────
const results = [];

for (const [tribName, parentMap] of wikidataByTrib) {
  const tribRow = csvNameToRow.get(tribName);
  if (!tribRow) continue;
  if (tribRow.tributary_of || tribRow.distributary_of || tribRow.segment_of) continue;

  // Filter parent names to those in our CSV
  const csvParents = [...parentMap.entries()].filter(([rName]) => {
    const rRow = csvNameToRow.get(rName);
    return rRow && rRow.id !== tribRow.id;
  });
  if (csvParents.length === 0) continue;

  const isAmbiguous = csvParents.length > 1;

  // Pick best parent: if we have coordinates, use geographic proximity
  let chosenParent;
  const csvLat = parseFloat(tribRow.latitude ?? '0');
  const csvLng = parseFloat(tribRow.longitude ?? '0');
  const hasCsvCoords = tribRow.latitude && tribRow.longitude;

  if (isAmbiguous && hasCsvCoords) {
    // Score each parent by min distance from Wikidata coordinates to CSV coordinate
    let bestScore = Infinity;
    for (const [rName, coords] of csvParents) {
      if (coords.length > 0) {
        const minDist = Math.min(...coords.map(({ lat, lng }) => haversineKm(csvLat, csvLng, lat, lng)));
        if (minDist < bestScore) { bestScore = minDist; chosenParent = rName; }
      } else {
        // No coordinates for disambiguation; pick by Wikidata frequency (most coords = more data)
        if (!chosenParent) chosenParent = rName;
      }
    }
  }

  if (!chosenParent) chosenParent = csvParents[0][0];

  results.push({
    tribName: tribRow.name,
    riverName: csvNameToRow.get(chosenParent)?.name ?? chosenParent,
    tribRow,
    isAmbiguous,
    allParents: csvParents.map(([n]) => n),
  });
}

// Deduplicate by tributary CSV row id (in case alternates matched)
const dedupedById = new Map();
for (const r of results) {
  if (!dedupedById.has(r.tribRow.id)) dedupedById.set(r.tribRow.id, r);
}
const finalResults = [...dedupedById.values()].sort(
  (a, b) => Number(a.tribRow.scalerank) - Number(b.tribRow.scalerank) || a.tribName.localeCompare(b.tribName)
);

// ── Step 5: report ─────────────────────────────────────────────────────────────
const clean = finalResults.filter((r) => !r.isAmbiguous);
const ambiguous = finalResults.filter((r) => r.isAmbiguous);

console.log(`\nResults: ${clean.length} clean, ${ambiguous.length} ambiguous (multiple Wikidata matches)`);
console.log('');

if (clean.length > 0) {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(' CLEAN — single Wikidata match, add to TRIBUTARY_OF');
  console.log('══════════════════════════════════════════════════════════════════');
  let lastSR = -1;
  for (const { tribName, riverName, tribRow } of clean) {
    const sr = Number(tribRow.scalerank);
    if (sr !== lastSR) { console.log(`\n  [scalerank ${sr}]`); lastSR = sr; }
    console.log(`  '${tribName}': '${riverName}',`);
  }
  console.log('');
}

if (ambiguous.length > 0) {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(' AMBIGUOUS — multiple CSV names match, verify manually');
  console.log(' (closest geographic match shown first, alternatives in brackets)');
  console.log('══════════════════════════════════════════════════════════════════');
  let lastSR = -1;
  for (const { tribName, riverName, tribRow, allParents } of ambiguous) {
    const sr = Number(tribRow.scalerank);
    if (sr !== lastSR) { console.log(`\n  [scalerank ${sr}]`); lastSR = sr; }
    const others = allParents.filter((p) => p !== riverName);
    console.log(`  '${tribName}': '${riverName}',  // also matched: ${others.join(', ')}`);
  }
  console.log('');
}

console.log(`CSV rivers still unclassified: ${
  rows.filter((r) => !r.tributary_of && !r.distributary_of && !r.segment_of &&
    !finalResults.find((res) => res.tribRow.id === r.id)).length
} / ${rows.length}`);
