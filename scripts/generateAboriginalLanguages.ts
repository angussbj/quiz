/**
 * Generate aboriginal-languages.csv from AUSTLANG + Wikidata.
 *
 * Aboriginal and Torres Strait Islander language varieties with an approximate
 * point location, sorted by how widely each is documented on Wikipedia (a
 * sorting aid for the "languages shown" range filter, NOT a ranking of
 * importance). Locations are approximate and language boundaries are contested.
 *
 * Sources (both fetched live, no manual download):
 *   - AUSTLANG (AIATSIS), CC BY 4.0 — names, alternate spellings, coordinates.
 *     via data.gov.au CKAN datastore (resource e9a9ea06-…).
 *     https://data.gov.au/data/dataset/austlang-dataset-001
 *   - Wikidata (CC0) — Wikipedia-edition count + article title, joined on
 *     property P1252 ("AUSTLANG code"). https://www.wikidata.org/wiki/Property:P1252
 *
 * Usage:
 *   npx tsx scripts/generateAboriginalLanguages.ts
 *
 * Output:
 *   public/data/languages/aboriginal-languages.csv
 *   Columns: id,name,region,latitude,longitude,name_alternates,wikipedia,prominence_rank
 *   - name: AUSTLANG spelling (default display); name_alternates: all other
 *     spellings incl. the Wikipedia form, pipe-separated (community-preferred
 *     spellings vary and evolve as languages are revived).
 *   - region: provisional, inferred from the AUSTLANG code letter prefix.
 *   - prominence_rank: 1 = most Wikipedia-documented; languages with no
 *     Wikipedia presence are appended alphabetically (included, not ranked).
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const CKAN_RESOURCE = 'e9a9ea06-d821-4b53-a05f-877409a1a19c';
const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'languages', 'aboriginal-languages.csv');

/** Provisional region labels, inferred from the AUSTLANG code letter prefix. */
const REGION_BY_PREFIX: Readonly<Record<string, string>> = {
  A: 'Western Desert (WA)',
  C: 'Central Desert',
  D: 'Darling (W NSW/SW Qld)',
  E: 'SE Queensland',
  G: 'Gulf Country',
  K: 'Kimberley (WA)',
  L: 'Lake Eyre / Central SA',
  N: 'Top End & Arnhem (NT)',
  P: 'Pidgins & Creoles',
  S: 'SE Australia',
  T: 'Tasmania',
  W: 'SW WA / Pilbara',
  Y: 'Cape York & Torres Strait',
};

interface AustlangRow {
  readonly language_code: string;
  readonly language_name: string;
  readonly language_synonym: string;
  readonly lat: string;
  readonly lng: string;
}

interface WikidataEntry {
  readonly label: string;
  readonly sitelinks: number;
  readonly articleTitle: string;
}

async function fetchAustlangWithCoordinates(): Promise<ReadonlyArray<AustlangRow>> {
  const sql = `SELECT language_code, language_name, language_synonym,` +
    ` approximate_latitude_of_language_variety AS lat,` +
    ` approximate_longitude_of_language_variety AS lng` +
    ` FROM "${CKAN_RESOURCE}" WHERE approximate_latitude_of_language_variety <> 0`;
  const response = await fetch(`https://data.gov.au/data/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`);
  const body = await response.json();
  return body.result.records;
}

async function fetchWikidataByAustlangCode(): Promise<Readonly<Record<string, WikidataEntry>>> {
  const query = `SELECT ?code ?label ?sitelinks ?article WHERE {
    ?item wdt:P1252 ?code .
    ?item wikibase:sitelinks ?sitelinks .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?item rdfs:label ?label. }
    OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . }
  }`;
  const response = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`, {
    headers: {Accept: 'application/sparql-results+json'},
  });
  const body = await response.json();
  const byCode: Record<string, WikidataEntry> = {};
  for (const binding of body.results.bindings) {
    const code = binding.code.value;
    const sitelinks = parseInt(binding.sitelinks.value, 10);
    if (byCode[code] && sitelinks <= byCode[code].sitelinks) continue;
    const articleUrl: string | undefined = binding.article?.value;
    let articleTitle = '';
    if (articleUrl) {
      const slug = articleUrl.split('/wiki/')[1];
      if (slug) articleTitle = decodeURIComponent(slug.replace(/_/g, ' '));
    }
    byCode[code] = {label: binding.label.value, sitelinks, articleTitle};
  }
  return byCode;
}

const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, '');

const slugify = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// AUSTLANG synonyms include junk that should never be an accepted answer: bare
// qualifier words (cause false matches, e.g. "Southern" -> Arrernte), meta
// strings, and colonial "<placename> tribe" labels.
const BARE_JUNK_ALTERNATES = new Set([
  'western', 'eastern', 'southern', 'northern', 'north', 'south', 'east', 'west',
  'central', 'upper', 'lower', 'none', 'etc', 'dialect', 'language', 'speech',
  'people', 'tribe', 'nation', 'group', 'mob', 'clan', 'horde', 'other', 'unknown',
  'various', 'the', 'sydney',
]);

function isJunkAlternate(alt: string): boolean {
  const n = normalise(alt);
  if (!n) return true;
  if (BARE_JUNK_ALTERNATES.has(n)) return true;
  if (n === 'otheraustralianindigenouslanguages') return true;
  if (/\stribe$/i.test(alt.trim())) return true; // "Adelaide tribe", "Broken Bay tribe", ...
  return false;
}

const escapeCsv = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

interface OutputRow {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly lat: string;
  readonly lng: string;
  readonly alternates: string;
  readonly wikipedia: string;
  readonly sitelinks: number;
}

function buildRows(
  austlang: ReadonlyArray<AustlangRow>,
  wikidata: Readonly<Record<string, WikidataEntry>>,
): ReadonlyArray<OutputRow> {
  return austlang.map((row) => {
    const entry = wikidata[row.language_code];
    // Drop AUSTLANG "(retired)" suffixes from the display name (e.g. "Flinders Island (retired)").
    const name = row.language_name.replace(/\s*\(retired\)\s*$/i, '').trim();
    const primary = normalise(name);

    // Candidate alternates: AUSTLANG synonyms (split on both | and ; — the source
    // glues some together with ;), the Wikipedia spelling, and each slash-variant
    // of the name ("Dharug / Darug" -> "Dharug", "Darug").
    const candidates: string[] = [];
    for (const synonym of (row.language_synonym ?? '').split('|')) {
      for (const part of synonym.split(';')) candidates.push(part.trim());
    }
    if (entry?.label) candidates.push(entry.label);
    for (const part of name.split('/')) candidates.push(part.trim());

    const seen = new Set<string>();
    const alternates = new Set<string>();
    for (const candidate of candidates) {
      if (!candidate || isJunkAlternate(candidate)) continue;
      const n = normalise(candidate);
      if (!n || n === primary || seen.has(n)) continue;
      seen.add(n);
      alternates.add(candidate);
    }
    // Accept the core of "<X> language" names (e.g. "Western Desert language" -> "Western Desert").
    const coreMatch = name.match(/^(.*\S)\s+language$/i);
    if (coreMatch) {
      const core = coreMatch[1].trim();
      if (normalise(core) && normalise(core) !== primary && !seen.has(normalise(core))) {
        alternates.add(core);
      }
    }

    const prefix = row.language_code.match(/^[A-Z]+/)?.[0] ?? '';
    return {
      id: slugify(`${row.language_code}-${name}`),
      name,
      region: REGION_BY_PREFIX[prefix] ?? prefix,
      lat: row.lat,
      lng: row.lng,
      alternates: [...alternates].join('|'),
      wikipedia: entry?.articleTitle ?? '',
      sitelinks: entry?.sitelinks ?? 0,
    };
  });
}

/** Documented languages first (by Wikipedia-edition count desc); the rest alphabetically. */
function rankByProminence(rows: ReadonlyArray<OutputRow>): ReadonlyArray<OutputRow> {
  const documented = rows.filter((r) => r.sitelinks > 0).sort((a, b) => b.sitelinks - a.sitelinks || a.name.localeCompare(b.name));
  const undocumented = rows.filter((r) => r.sitelinks === 0).sort((a, b) => a.name.localeCompare(b.name));
  return [...documented, ...undocumented];
}

async function main(): Promise<void> {
  const [austlang, wikidata] = await Promise.all([fetchAustlangWithCoordinates(), fetchWikidataByAustlangCode()]);
  const ranked = rankByProminence(buildRows(austlang, wikidata));

  const header = 'id,name,region,latitude,longitude,name_alternates,wikipedia,prominence_rank';
  const lines = ranked.map((row, index) =>
    [row.id, row.name, row.region, row.lat, row.lng, row.alternates, row.wikipedia, index + 1].map(escapeCsv).join(','),
  );

  mkdirSync(dirname(OUTPUT), {recursive: true});
  writeFileSync(OUTPUT, [header, ...lines].join('\n') + '\n');

  const documented = ranked.filter((r) => r.sitelinks > 0).length;
  console.log(`Wrote ${ranked.length} languages to ${OUTPUT} (${documented} with a Wikipedia signal, ${ranked.length - documented} without).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
