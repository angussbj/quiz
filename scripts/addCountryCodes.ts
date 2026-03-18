/**
 * Add ISO alpha-2 country codes to world-capitals.csv and world-borders.csv.
 *
 * Usage: npx tsx scripts/addCountryCodes.ts
 *
 * Downloads the mledoze/countries JSON to get authoritative codes,
 * then matches by country name and writes updated CSVs.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COUNTRIES_URL = 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json';

interface MledozeCountry {
  name: { common: string; official: string };
  cca2: string;
}

async function main() {
  console.log('Fetching country data from mledoze/countries...');
  const response = await fetch(COUNTRIES_URL);
  const countries: MledozeCountry[] = await response.json();

  // Build name → lowercase alpha-2 mapping (common + official names)
  const nameToCode = new Map<string, string>();
  for (const c of countries) {
    const code = c.cca2.toLowerCase();
    nameToCode.set(c.name.common.toLowerCase(), code);
    nameToCode.set(c.name.official.toLowerCase(), code);
  }

  // Manual overrides for names that don't match exactly
  const overrides: Record<string, string> = {
    'ivory coast': 'ci',
    'côte d\'ivoire': 'ci',
    'democratic republic of the congo': 'cd',
    'republic of the congo': 'cg',
    'congo': 'cg',
    'eswatini': 'sz',
    'swaziland': 'sz',
    'myanmar': 'mm',
    'burma': 'mm',
    'türkiye': 'tr',
    'turkey': 'tr',
    'timor-leste': 'tl',
    'east timor': 'tl',
    'czech republic': 'cz',
    'czechia': 'cz',
    'north macedonia': 'mk',
    'vatican city': 'va',
    'united states': 'us',
    'united kingdom': 'gb',
    'south korea': 'kr',
    'north korea': 'kp',
    'taiwan': 'tw',
    'palestine': 'ps',
    'kosovo': 'xk',
    'micronesia': 'fm',
    'são tomé and príncipe': 'st',
    'sao tome and principe': 'st',
    'cape verde': 'cv',
    'cabo verde': 'cv',
  };

  for (const [name, code] of Object.entries(overrides)) {
    nameToCode.set(name, code);
  }

  function lookupCode(countryName: string): string {
    const lower = countryName.toLowerCase().trim();
    const code = nameToCode.get(lower);
    if (code) return code;

    // Try partial match
    for (const [name, c] of nameToCode) {
      if (name.includes(lower) || lower.includes(name)) return c;
    }
    console.warn(`  WARNING: No code found for "${countryName}"`);
    return '';
  }

  // Process world-capitals.csv
  const capitalsPath = resolve(__dirname, '../public/data/capitals/world-capitals.csv');
  const capitalsContent = readFileSync(capitalsPath, 'utf-8');
  const capitalsLines = capitalsContent.split('\n');
  const capitalsHeader = capitalsLines[0];

  console.log('\nProcessing world-capitals.csv...');
  const newCapitalsLines = [capitalsHeader + ',code'];
  let matched = 0;
  let unmatched = 0;

  for (let i = 1; i < capitalsLines.length; i++) {
    const line = capitalsLines[i].trim();
    if (!line) continue;

    // Parse CSV (simple — no quoted fields with commas in capitals data)
    const parts = line.split(',');
    const country = parts[2]; // country column
    const code = lookupCode(country);
    if (code) matched++;
    else unmatched++;

    newCapitalsLines.push(line + ',' + code);
  }

  writeFileSync(capitalsPath, newCapitalsLines.join('\n') + '\n');
  console.log(`  Capitals: ${matched} matched, ${unmatched} unmatched`);

  // Process world-borders.csv
  const bordersPath = resolve(__dirname, '../public/data/borders/world-borders.csv');
  const bordersContent = readFileSync(bordersPath, 'utf-8');
  const bordersLines = bordersContent.split('\n');

  console.log('\nProcessing world-borders.csv...');
  // Header: id,name,region,group,paths
  // New: id,name,region,group,code,paths (insert code before paths)
  const bordersHeader = bordersLines[0];
  const headerParts = bordersHeader.split(',');
  const pathsIndex = headerParts.indexOf('paths');

  const newBordersLines: string[] = [];
  // Insert 'code' before 'paths' in header
  const newHeaderParts = [...headerParts.slice(0, pathsIndex), 'code', ...headerParts.slice(pathsIndex)];
  newBordersLines.push(newHeaderParts.join(','));

  let bMatched = 0;
  let bUnmatched = 0;

  for (let i = 1; i < bordersLines.length; i++) {
    const line = bordersLines[i].trim();
    if (!line) continue;

    // Borders CSV has quoted fields (paths contain commas in coordinates? No, paths use spaces)
    // But paths might be quoted if they contain commas. Let's handle quoted fields.
    // Actually border paths use spaces not commas, but the CSV might quote the paths field.
    // Let's check: the format is id,name,region,group,"path data with spaces"
    // We need to find the first 4 fields, then everything after is paths

    // Find the 4th comma (before paths)
    let commaCount = 0;
    let splitIndex = 0;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === ',' && commaCount < pathsIndex) {
        commaCount++;
        if (commaCount === pathsIndex) {
          splitIndex = j;
          break;
        }
      }
    }

    const prefix = line.slice(0, splitIndex);
    const pathsData = line.slice(splitIndex + 1);
    const prefixParts = prefix.split(',');
    const name = prefixParts[1]; // name column
    const code = lookupCode(name);
    if (code) bMatched++;
    else bUnmatched++;

    newBordersLines.push(prefix + ',' + code + ',' + pathsData);
  }

  writeFileSync(bordersPath, newBordersLines.join('\n') + '\n');
  console.log(`  Borders: ${bMatched} matched, ${bUnmatched} unmatched`);
  console.log('\nDone!');
}

main().catch(console.error);
