/**
 * Generate world-capitals.csv from source data.
 *
 * Reads mledoze/countries metadata and dr5hn/cities coordinates,
 * cross-references them, and outputs a CSV with 197 countries
 * (194 UN members + Taiwan, Kosovo, Palestine).
 *
 * Usage:
 *   npx tsx scripts/generateWorldCapitals.ts
 *
 * Input:
 *   scripts/source-data/countries.json  (mledoze/countries)
 *   scripts/source-data/cities.csv      (dr5hn/countries-states-cities-database)
 *
 * Output:
 *   public/data/capitals/world-capitals.csv
 *
 * Source files are gitignored (too large). Download before running:
 *   curl -L https://raw.githubusercontent.com/mledoze/countries/master/countries.json -o scripts/source-data/countries.json
 *   curl -L https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv -o scripts/source-data/cities.csv
 *
 * To update the data:
 *   1. Download fresh source files (see above)
 *   2. Re-run this script
 *   3. Check the diff and commit
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface CountryEntry {
  readonly cca2: string;
  readonly name: { readonly common: string };
  readonly capital?: ReadonlyArray<string>;
  readonly region: string;
  readonly subregion?: string;
  readonly unMember: boolean;
}

// ------------------------------------------------------------------
// Manual coordinate overrides for capitals not in the cities DB
// or with incorrect matches (e.g., Copenhagen matching a US town).
// ------------------------------------------------------------------

const COORDINATE_OVERRIDES: Readonly<Record<string, { readonly lat: number; readonly lng: number }>> = {
  'AG': { lat: 17.1175, lng: -61.8456 },   // Saint John's, Antigua
  'AR': { lat: -34.6037, lng: -58.3816 },  // Buenos Aires
  'CO': { lat: 4.7110, lng: -74.0721 },    // Bogotá
  'DK': { lat: 55.6761, lng: 12.5683 },    // Copenhagen (fixes US match)
  'FM': { lat: 6.9147, lng: 158.1611 },    // Palikir
  'GD': { lat: 12.0564, lng: -61.7485 },   // St. George's
  'ID': { lat: -6.2088, lng: 106.8456 },   // Jakarta
  'IS': { lat: 64.1466, lng: -21.9426 },   // Reykjavik
  'KI': { lat: 1.4518, lng: 173.0000 },    // South Tarawa
  'KN': { lat: 17.3026, lng: -62.7177 },   // Basseterre
  'KZ': { lat: 51.1694, lng: 71.4491 },    // Astana
  'MC': { lat: 43.7384, lng: 7.4246 },     // Monaco
  'MD': { lat: 47.0105, lng: 28.8638 },    // Chișinău
  'MG': { lat: -18.8792, lng: 47.5079 },   // Antananarivo
  'MH': { lat: 7.0897, lng: 171.3803 },    // Majuro
  'MM': { lat: 19.7633, lng: 96.0785 },    // Naypyidaw
  'MR': { lat: 18.0735, lng: -15.9582 },   // Nouakchott
  'MV': { lat: 4.1755, lng: 73.5093 },     // Malé
  'PA': { lat: 8.9936, lng: -79.5197 },    // Panama City
  'PH': { lat: 14.5995, lng: 120.9842 },   // Manila
  'PS': { lat: 31.9038, lng: 35.2034 },    // Ramallah
  'PW': { lat: 7.5006, lng: 134.6242 },    // Ngerulmud
  'PY': { lat: -25.2637, lng: -57.5759 },  // Asunción
  'RS': { lat: 44.7866, lng: 20.4489 },    // Belgrade
  'SM': { lat: 43.9424, lng: 12.4578 },    // San Marino
  'SS': { lat: 4.8517, lng: 31.5825 },     // Juba
  'TO': { lat: -21.2087, lng: -175.2013 }, // Nuku'alofa
  'TW': { lat: 25.0330, lng: 121.5654 },   // Taipei
  'VA': { lat: 41.9029, lng: 12.4534 },    // Vatican City
  'VN': { lat: 21.0285, lng: 105.8542 },   // Hanoi
  'VU': { lat: -17.7334, lng: 168.3273 },  // Port Vila
  'XK': { lat: 42.6629, lng: 21.1655 },    // Pristina
  'YE': { lat: 15.3694, lng: 44.1910 },    // Sana'a
};

// ------------------------------------------------------------------
// Capital display name overrides (when the dataset name is awkward)
// ------------------------------------------------------------------

const CAPITAL_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  'SM': 'San Marino', // Dataset says "City of San Marino"
};

// ------------------------------------------------------------------
// Alternate city names for fuzzy matching in quizzes
// ------------------------------------------------------------------

const ALTERNATE_NAMES: Readonly<Record<string, string>> = {
  'AL': 'Tiranë|Tirane',
  'AM': 'Jerevan|Erevan',
  'AT': 'Wien',
  'AZ': 'Bakı',
  'BD': 'Dacca',
  'BE': 'Bruxelles|Brussel',
  'BR': 'Brasília',
  'CH': 'Berne',
  'CN': 'Peking',
  'CO': 'Bogotá',
  'CY': 'Lefkosia|Lefkoşa',
  'CZ': 'Praha',
  'DK': 'Kobenhavn|København',
  'EG': 'Al-Qahirah|Al Qahirah',
  'ET': 'Addis Abeba',
  'FI': 'Helsingfors',
  'GE': 'Tiflis',
  'GR': 'Athina|Athinai',
  'IE': 'Baile Atha Cliath',
  'IL': 'Yerushalayim',
  'IN': 'Nai Dilli|Nayi Dilli',
  'IQ': 'Bagdad',
  'IR': 'Teheran|Tehrān',
  'IS': 'Reykjavík',
  'IT': 'Roma',
  'JP': 'Tōkyō|Tokio',
  'KR': 'Soul',
  'LK': 'Sri Jayawardenepura Kotte|Jayawardenepura',
  'LU': 'Lëtzebuerg',
  'MD': 'Kishinev',
  'MM': 'Nay Pyi Taw',
  'MX': 'Ciudad de Mexico|Ciudad de México',
  'MY': 'KL',
  'PL': 'Warszawa',
  'PS': 'Ram Allah',
  'PT': 'Lisboa',
  'PY': 'Asunción',
  'RO': 'București|Bucuresti',
  'RS': 'Beograd',
  'RU': 'Moskva|Moskwa',
  'SA': 'Ar Riyad|Er Riad',
  'SM': 'City of San Marino',
  'TH': 'Krung Thep',
  'TR': 'Angora',
  'TW': 'Taibei',
  'UA': 'Kiev',
  'US': 'Washington D.C.|Washington DC',
  'XK': 'Prishtina|Prishtinë',
};

// ------------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------------

function parseCsvLine(line: string): ReadonlyArray<string> {
  const result: Array<string> = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
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

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('|') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const scriptDir = dirname(new URL(import.meta.url).pathname);
const sourceDir = resolve(scriptDir, 'source-data');
const outputDir = resolve(scriptDir, '..', 'public', 'data', 'capitals');

// Load country metadata
const countriesPath = resolve(sourceDir, 'countries.json');
const countries: ReadonlyArray<CountryEntry> = JSON.parse(readFileSync(countriesPath, 'utf8'));

// Load cities for coordinate lookup
const citiesPath = resolve(sourceDir, 'cities.csv');
let cityCoords: Map<string, { lat: number; lng: number }>;

if (existsSync(citiesPath)) {
  const citiesText = readFileSync(citiesPath, 'utf8');
  const cityLines = citiesText.split('\n');
  cityCoords = new Map();
  for (let i = 1; i < cityLines.length; i++) {
    const cols = parseCsvLine(cityLines[i]);
    if (cols[1] && cols[6]) {
      const key = `${cols[1]}|${cols[6]}`;
      if (!cityCoords.has(key)) {
        cityCoords.set(key, { lat: parseFloat(cols[8]), lng: parseFloat(cols[9]) });
      }
    }
  }
} else {
  console.warn('cities.csv not found — using coordinate overrides only.');
  console.warn('Download from: https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv');
  cityCoords = new Map();
}

// Filter: UN members + Taiwan + Kosovo + Palestine
const included = countries.filter((c) =>
  c.capital && c.capital.length > 0 &&
  (c.unMember === true || ['TW', 'XK', 'PS'].includes(c.cca2)),
);

interface OutputRow {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  region: string;
  subregion: string;
  cityAlternates: string;
}

const rows: Array<OutputRow> = [];
const missing: Array<string> = [];

for (const c of included) {
  const cc = c.cca2;
  let capital = c.capital![0];

  if (CAPITAL_NAME_OVERRIDES[cc]) {
    capital = CAPITAL_NAME_OVERRIDES[cc];
  }

  let lat: number | undefined;
  let lng: number | undefined;

  const override = COORDINATE_OVERRIDES[cc];
  if (override) {
    lat = override.lat;
    lng = override.lng;
  } else {
    const cityKey = `${c.capital![0]}|${cc}`;
    const coords = cityCoords.get(cityKey);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  if (lat === undefined || lng === undefined) {
    missing.push(`${c.name.common} | ${capital} | ${cc}`);
    continue;
  }

  const id = capital
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  rows.push({
    id,
    city: capital,
    country: c.name.common,
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    region: c.region,
    subregion: c.subregion ?? '',
    cityAlternates: ALTERNATE_NAMES[cc] ?? '',
  });
}

rows.sort((a, b) => a.region.localeCompare(b.region) || a.country.localeCompare(b.country));

// Build CSV
const header = 'id,city,country,latitude,longitude,region,subregion,city_alternates';
const csvRows = rows.map((r) => {
  const fields = [r.id, r.city, r.country, String(r.latitude), String(r.longitude), r.region, r.subregion, r.cityAlternates];
  return fields.map(escapeCsvField).join(',');
});

const csv = header + '\n' + csvRows.join('\n') + '\n';

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const outputPath = resolve(outputDir, 'world-capitals.csv');
writeFileSync(outputPath, csv);

console.log(`Written ${rows.length} countries to ${outputPath}`);
if (missing.length > 0) {
  console.warn(`Missing coordinates (${missing.length}):`);
  missing.forEach((m) => console.warn(`  ${m}`));
}
