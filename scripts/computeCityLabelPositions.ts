/**
 * Computes initial label_position values for a city CSV file.
 *
 * Heuristic: for each city A, check collisions on both the right and left
 * sides. Pick the side with less overlap. When a neighbour's dot is in the
 * collision zone, also consider whether its label extends toward or away from
 * A — a label pointing toward A is worse than one pointing away.
 *
 * Usage: npx tsx scripts/computeCityLabelPositions.ts [csv-path] [--regions=Asia,Oceania]
 *
 * If no path is given, defaults to public/data/capitals/world-capitals.csv.
 * If --regions is given, only cities in those regions are reprocessed (others
 * are left untouched). Cities marked 'above' or 'below' are always preserved.
 *
 * Writes the updated CSV back in place with updated `label_position` column.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse args
let csvPath = resolve(__dirname, '../public/data/capitals/world-capitals.csv');
let regionFilter: Set<string> | undefined;

for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--regions=')) {
    regionFilter = new Set(arg.slice('--regions='.length).split(',').map((s) => s.trim()));
  } else {
    csvPath = resolve(arg);
  }
}

interface City {
  id: string;
  label: string;
  /** equirectangular x = longitude */
  x: number;
  /** equirectangular y = -latitude */
  y: number;
  rowIndex: number;
  region: string;
  /** Current label position ('' = right, 'left', 'above', 'below') */
  currentPosition: string;
}

function parseCsv(text: string): string[][] {
  return text.trim().split('\n').map((line) => line.split(','));
}

// Collision tuning constants (in degree-space, tuned for regional zoom levels)
const GAP = 0.5;           // gap between dot edge and label start
const CHAR_WIDTH = 0.45;   // approximate width per character
const HALF_HEIGHT = 0.8;   // half the label height
const DOT_RADIUS = 0.4;    // approximate dot radius for collision target

interface CollisionScore {
  /** Number of dots that collide with the label zone */
  dotCollisions: number;
  /** Sum of "badness" — closer collisions and labels pointing toward are worse */
  totalPenalty: number;
}

/**
 * Compute a collision score for placing city A's label on a given side.
 * Checks all other cities' dots against the label zone, and also considers
 * whether the neighbour's label extends toward A (making the overlap worse).
 */
function computeCollisionScore(
  a: City,
  side: 'left' | 'right',
  allCities: ReadonlyArray<City>,
  positionMap: ReadonlyMap<string, string>,
): CollisionScore {
  const labelWidth = a.label.length * CHAR_WIDTH;

  // Label zone bounds
  let labelLeft: number;
  let labelRight: number;
  if (side === 'right') {
    labelLeft = a.x + GAP;
    labelRight = a.x + GAP + labelWidth;
  } else {
    labelRight = a.x - GAP;
    labelLeft = a.x - GAP - labelWidth;
  }
  const labelTop = a.y - HALF_HEIGHT;
  const labelBottom = a.y + HALF_HEIGHT;

  let dotCollisions = 0;
  let totalPenalty = 0;

  for (const b of allCities) {
    if (a.id === b.id) continue;

    // Check if B's dot overlaps A's label zone
    const dotOverlapsX = b.x + DOT_RADIUS >= labelLeft && b.x - DOT_RADIUS <= labelRight;
    const dotOverlapsY = b.y + DOT_RADIUS >= labelTop && b.y - DOT_RADIUS <= labelBottom;

    if (!dotOverlapsX || !dotOverlapsY) continue;

    dotCollisions++;

    // Base penalty: inverse of horizontal distance (closer = worse)
    const hDist = Math.abs(b.x - a.x);
    const basePenalty = 1 / (hDist + 0.1);

    // Check if B's label extends toward A — that makes the overlap worse
    const bPos = positionMap.get(b.id) ?? '';
    const bSide = bPos === 'left' ? 'left' : 'right'; // above/below treated as right
    const bLabelPointsTowardA =
      (side === 'right' && bSide === 'left' && b.x > a.x) ||
      (side === 'left' && bSide === 'right' && b.x < a.x);

    // A label pointing toward means the text overlap is much worse
    const directionMultiplier = bLabelPointsTowardA ? 2.0 : 1.0;

    totalPenalty += basePenalty * directionMultiplier;
  }

  return { dotCollisions, totalPenalty };
}

function main() {
  const raw = readFileSync(csvPath, 'utf8');
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
  const regionCol = header.indexOf('region');

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
      region: regionCol >= 0 ? row[regionCol] : '',
      currentPosition: row[posCol] ?? '',
    });
  }

  // Build a mutable position map (used for neighbour label direction checks)
  const positionMap = new Map<string, string>();
  for (const city of cities) {
    positionMap.set(city.id, city.currentPosition);
  }

  // Determine which cities to process
  const citiesToProcess = cities.filter((c) => {
    // Never touch above/below
    if (c.currentPosition === 'above' || c.currentPosition === 'below') return false;
    // Filter by region if specified
    if (regionFilter && !regionFilter.has(c.region)) return false;
    return true;
  });

  if (regionFilter) {
    console.log(`Processing ${citiesToProcess.length} cities in regions: ${[...regionFilter].join(', ')}`);
    console.log(`Skipping ${cities.length - citiesToProcess.length} cities (other regions + above/below)\n`);
  }

  // Two-pass approach: first pass with current positions, then update and refine
  const newPositions = new Map<string, 'left' | ''>();

  for (const a of citiesToProcess) {
    const rightScore = computeCollisionScore(a, 'right', cities, positionMap);
    const leftScore = computeCollisionScore(a, 'left', cities, positionMap);

    // Pick the side with fewer collisions; break ties with total penalty
    let bestSide: 'left' | '';
    if (rightScore.dotCollisions === 0 && leftScore.dotCollisions === 0) {
      bestSide = ''; // default to right when no collisions
    } else if (rightScore.dotCollisions !== leftScore.dotCollisions) {
      bestSide = rightScore.dotCollisions <= leftScore.dotCollisions ? '' : 'left';
    } else {
      bestSide = rightScore.totalPenalty <= leftScore.totalPenalty ? '' : 'left';
    }

    newPositions.set(a.id, bestSide);
    // Update the position map so subsequent cities see the new position
    positionMap.set(a.id, bestSide);
  }

  // Apply positions to CSV rows
  let flippedToLeft = 0;
  let flippedToRight = 0;
  const flippedCities: Array<{ label: string; id: string; from: string; to: string }> = [];

  for (const city of citiesToProcess) {
    const newPos = newPositions.get(city.id) ?? '';
    const oldPos = rows[city.rowIndex][posCol];
    rows[city.rowIndex][posCol] = newPos;

    if (oldPos !== newPos) {
      const fromLabel = oldPos === 'left' ? 'left' : 'right';
      const toLabel = newPos === 'left' ? 'left' : 'right';
      flippedCities.push({ label: city.label, id: city.id, from: fromLabel, to: toLabel });
      if (newPos === 'left') flippedToLeft++;
      else flippedToRight++;
    }
  }

  console.log(`Changes: ${flippedToLeft} → left, ${flippedToRight} → right`);
  for (const { label, id, from, to } of flippedCities) {
    console.log(`  ${label} (${id}): ${from} → ${to}`);
  }

  // Write back
  const output = rows.map((row) => row.join(',')).join('\n') + '\n';
  writeFileSync(csvPath, output, 'utf8');
  console.log(`\nUpdated ${csvPath}`);
}

main();
