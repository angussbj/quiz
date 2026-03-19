/**
 * Computes initial label_position values for world-capitals.csv.
 *
 * Heuristic: for each city A, if any city B's dot falls in the approximate
 * area where A's right-side label would render, flip A to 'left'.
 *
 * Usage: npx tsx scripts/computeCityLabelPositions.ts
 *
 * Writes the updated CSV back to public/data/capitals/world-capitals.csv
 * with a new `label_position` column.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = resolve(__dirname, '../public/data/capitals/world-capitals.csv');

interface City {
  id: string;
  label: string;
  /** equirectangular x = longitude */
  x: number;
  /** equirectangular y = -latitude */
  y: number;
  rowIndex: number;
}

function parseCsv(text: string): string[][] {
  return text.trim().split('\n').map((line) => line.split(','));
}

function main() {
  const raw = readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(raw);
  const header = rows[0];

  // Find or add label_position column
  let posCol = header.indexOf('label_position');
  if (posCol === -1) {
    posCol = header.length;
    header.push('label_position');
    for (let i = 1; i < rows.length; i++) {
      rows[i].push('');
    }
  }

  const latCol = header.indexOf('latitude');
  const lngCol = header.indexOf('longitude');
  const idCol = header.indexOf('id');
  const cityCol = header.indexOf('city');

  // Build city list
  const cities: City[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const lat = parseFloat(row[latCol]);
    const lng = parseFloat(row[lngCol]);
    cities.push({
      id: row[idCol],
      label: row[cityCol],
      x: lng,
      y: -lat,
      rowIndex: i,
    });
  }

  // For each city, compute whether its right-side label would collide with
  // another city's dot. If so, flip to 'left'.
  //
  // The label extends to the right from the dot. Approximate the collision
  // zone in degree-space:
  //   - horizontal: [dot.x + gap, dot.x + gap + labelWidth]
  //   - vertical: [dot.y - halfHeight, dot.y + halfHeight]
  //
  // These are rough approximations calibrated for typical map zoom levels
  // on European/dense quizzes.
  const GAP = 0.4;           // gap between dot edge and label start (degrees)
  const CHAR_WIDTH = 0.35;   // approximate width per character (degrees)
  const HALF_HEIGHT = 0.6;   // half the label height (degrees)
  const DOT_RADIUS = 0.3;    // approximate dot radius for collision target

  const positions: Map<string, 'left' | 'right'> = new Map();

  for (const a of cities) {
    // Check if any city B's dot falls in A's right-label zone
    const labelLeft = a.x + GAP;
    const labelRight = a.x + GAP + a.label.length * CHAR_WIDTH;
    const labelTop = a.y - HALF_HEIGHT;
    const labelBottom = a.y + HALF_HEIGHT;

    let collides = false;
    for (const b of cities) {
      if (a.id === b.id) continue;
      // B's dot occupies [b.x - DOT_RADIUS, b.x + DOT_RADIUS] x [b.y - DOT_RADIUS, b.y + DOT_RADIUS]
      if (b.x + DOT_RADIUS >= labelLeft && b.x - DOT_RADIUS <= labelRight &&
          b.y + DOT_RADIUS >= labelTop && b.y - DOT_RADIUS <= labelBottom) {
        collides = true;
        break;
      }
    }

    if (collides) {
      positions.set(a.id, 'left');
    }
  }

  // Apply positions to CSV rows
  let flipped = 0;
  for (const [id, pos] of positions) {
    const city = cities.find((c) => c.id === id);
    if (city) {
      rows[city.rowIndex][posCol] = pos;
      flipped++;
    }
  }

  console.log(`Flipped ${flipped} cities to 'left':`);
  for (const [id] of positions) {
    const city = cities.find((c) => c.id === id);
    if (city) {
      console.log(`  ${city.label} (${id})`);
    }
  }

  // Write back
  const output = rows.map((row) => row.join(',')).join('\n') + '\n';
  writeFileSync(CSV_PATH, output, 'utf8');
  console.log(`\nUpdated ${CSV_PATH}`);
}

main();
