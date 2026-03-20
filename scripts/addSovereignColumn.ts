/**
 * Add a 'sovereign' column to world-borders.csv.
 *
 * For sovereign countries (the 197 in world-capitals.csv), sovereign = the country name.
 * For territories/dependencies, sovereign = the parent sovereign country name.
 * For disputed or stateless territories, sovereign = blank.
 *
 * Usage: npx tsx scripts/addSovereignColumn.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// Territory → sovereign country mapping
// Sources: UN, CIA World Factbook, ISO 3166
const TERRITORY_SOVEREIGNS: Record<string, string> = {
  'Aland': 'Finland',
  'American Samoa': 'United States of America',
  'Anguilla': 'United Kingdom',
  'Aruba': 'Netherlands',
  'Bermuda': 'United Kingdom',
  'British Indian Ocean Territory': 'United Kingdom',
  'British Virgin Islands': 'United Kingdom',
  'Cayman Islands': 'United Kingdom',
  'Cook Islands': 'New Zealand',
  'Curaçao': 'Netherlands',
  'Falkland Islands': 'United Kingdom',
  'Faroe Islands': 'Denmark',
  'French Polynesia': 'France',
  'French Southern and Antarctic Lands': 'France',
  'Gibraltar': 'United Kingdom',
  'Greenland': 'Denmark',
  'Guam': 'United States of America',
  'Guernsey': 'United Kingdom',
  'Heard Island and McDonald Islands': 'Australia',
  'Hong Kong S.A.R.': 'China',
  'Isle of Man': 'United Kingdom',
  'Jersey': 'United Kingdom',
  'Macao S.A.R': 'China',
  'Montserrat': 'United Kingdom',
  'New Caledonia': 'France',
  'Niue': 'New Zealand',
  'Norfolk Island': 'Australia',
  'Northern Mariana Islands': 'United States of America',
  'Pitcairn Islands': 'United Kingdom',
  'Puerto Rico': 'United States of America',
  'Saint Barthelemy': 'France',
  'Saint Helena': 'United Kingdom',
  'Saint Martin': 'France',
  'Saint Pierre and Miquelon': 'France',
  'Sint Maarten': 'Netherlands',
  'South Georgia and the Islands': 'United Kingdom',
  'Turks and Caicos Islands': 'United Kingdom',
  'United States Virgin Islands': 'United States of America',
  'Wallis and Futuna': 'France',
};

// Disputed/no clear sovereign
const DISPUTED: ReadonlySet<string> = new Set([
  'Antarctica',
  'Western Sahara',
]);

function main() {
  // Load sovereign country names from capitals CSV
  const capitalsPath = resolve(__dirname, '../public/data/capitals/world-capitals.csv');
  const capitalsContent = readFileSync(capitalsPath, 'utf-8');
  const capitalsLines = capitalsContent.split('\n').filter((l) => l.trim());
  const sovereignNames = new Set<string>();
  for (let i = 1; i < capitalsLines.length; i++) {
    const fields = parseCsvLine(capitalsLines[i]);
    const country = fields[2]; // country column
    if (country) sovereignNames.add(country);
  }
  console.log(`Loaded ${sovereignNames.size} sovereign country names from capitals CSV`);

  // Process borders CSV
  const bordersPath = resolve(__dirname, '../public/data/borders/world-borders.csv');
  const bordersContent = readFileSync(bordersPath, 'utf-8');
  const bordersLines = bordersContent.split('\n');

  // Header: id,name,region,group,code,paths
  const header = bordersLines[0];
  const headerFields = header.split(',');
  const pathsIndex = headerFields.indexOf('paths');

  // Insert 'sovereign' before 'paths' (after 'code')
  const newHeaderFields = [
    ...headerFields.slice(0, pathsIndex),
    'sovereign',
    ...headerFields.slice(pathsIndex),
  ];
  const newLines: string[] = [newHeaderFields.join(',')];

  let matched = 0;
  let territories = 0;
  let disputed = 0;

  for (let i = 1; i < bordersLines.length; i++) {
    const line = bordersLines[i].trim();
    if (!line) continue;

    // Find the split point (after code, before paths)
    // Header: id,name,region,group,code,paths
    // We need to split at the 5th comma (pathsIndex)
    let commaCount = 0;
    let splitIndex = 0;
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') inQuotes = !inQuotes;
      if (line[j] === ',' && !inQuotes) {
        commaCount++;
        if (commaCount === pathsIndex) {
          splitIndex = j;
          break;
        }
      }
    }

    const prefix = line.slice(0, splitIndex);
    const pathsData = line.slice(splitIndex + 1);
    const prefixFields = parseCsvLine(prefix);
    const name = prefixFields[1]; // name column

    let sovereign: string;
    if (sovereignNames.has(name)) {
      sovereign = name;
      matched++;
    } else if (TERRITORY_SOVEREIGNS[name]) {
      sovereign = TERRITORY_SOVEREIGNS[name];
      territories++;
    } else if (DISPUTED.has(name)) {
      sovereign = '';
      disputed++;
    } else {
      console.warn(`  WARNING: No sovereign mapping for "${name}" — defaulting to blank`);
      sovereign = '';
      disputed++;
    }

    newLines.push(prefix + ',' + sovereign + ',' + pathsData);
  }

  writeFileSync(bordersPath, newLines.join('\n') + '\n');
  console.log(`\nSovereign: ${matched}, Territory: ${territories}, Disputed/blank: ${disputed}`);
  console.log('Done!');
}

main();
