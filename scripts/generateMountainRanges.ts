/**
 * Generate world-mountain-ranges.csv with ~63 major mountain ranges.
 *
 * Each range includes metadata (elevation, length, area, highest peak) and
 * an SVG polygon path in equirectangular projection (x = longitude, y = −latitude).
 *
 * Polygons are derived from DEM elevation data using flood-fill from seed
 * points within each range. The algorithm:
 * 1. Load the ETOPO 2022 DEM and downsample to ~0.1° resolution (3600×1800)
 * 2. Compute Voronoi partition from seed groups (multiple seeds per range)
 * 3. For each range, BFS flood-fill from the highest-elevation seed pixel
 * 4. Extract the boundary using Moore boundary tracing
 * 5. Simplify with Douglas-Peucker
 * 6. Convert to SVG path (x=lng, y=-lat, closed with Z)
 *
 * Usage:
 *   npx tsx scripts/generateMountainRanges.ts
 *
 * Input:
 *   scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Output:
 *   public/data/mountains/world-mountain-ranges.csv
 */

import { fromFile } from 'geotiff';
import type { GeoTIFFImage } from 'geotiff';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface RangeDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameAlternates: string;
  readonly continent: string;
  readonly seeds: ReadonlyArray<readonly [number, number]>; // [[lng, lat], ...]
  readonly threshold: number; // minimum elevation in meters
  /** Bridge radius in pixels (at 0.1° resolution). During flood-fill, pixels
   *  within this radius of already-flooded pixels are candidates (if above threshold).
   *  After flood-fill, the result is dilated by this radius for smoother edges.
   *  Default: 0 (standard 4-connected flood-fill). */
  readonly radius?: number;
  readonly latitude: number;
  readonly longitude: number;
  readonly peakElevationM: number;
  readonly lengthKm: number;
  readonly areaKm2: number;
  readonly highestPeak: string;
}

// ------------------------------------------------------------------
// WikiData peak integration
// ------------------------------------------------------------------

/**
 * Map WikiData range labels (and known sub-range labels) to our range IDs.
 * Sub-ranges are mapped to the parent range so their peaks contribute seeds.
 */
const WIKIDATA_RANGE_MAP: Readonly<Record<string, string>> = {
  // ---- Asia ----
  'Himalayas': 'himalayas',
  'Annapurna': 'himalayas',
  'Nanga Parbat': 'himalayas',
  'Nun-Kun Massif': 'himalayas',
  'Karakoram': 'karakoram',
  'Hindu Kush': 'hindu-kush',
  'Pamir Mountains': 'pamir-mountains',
  'Tianshan Mountains': 'tian-shan',
  'Kunlun Mountains': 'kunlun-mountains',
  'Altai Mountains': 'altai-mountains',
  'Ural Mountains': 'ural-mountains',
  'Caucasus Mountains': 'caucasus',
  'Zagros Mountains': 'zagros-mountains',
  'Western Ghats': 'western-ghats',
  'Nilgiri Mountains': 'western-ghats',
  'Hengduan Mountains': 'hengduan-mountains',
  'Sikhote-Alin': 'sikhote-alin',
  'Stanovoy Highlands': 'stanovoy-range',
  'Huangshan': 'hengduan-mountains',

  // ---- Europe ----
  'Alps': 'alps',
  'Pennine Alps': 'alps',
  'Lepontine Alps': 'alps',
  'Silvretta Alps': 'alps',
  'Graian Alps': 'alps',
  'Cottian Alps': 'alps',
  'Gailtal Alps': 'alps',
  'Julian Alps': 'alps',
  'Dolomites': 'alps',
  'Alpi Biellesi': 'alps',
  'Lechquellen Mountains': 'alps',
  'Bregenz Forest Mountains': 'alps',
  'Eastern Alps': 'alps',
  'Monte Rosa Massif': 'alps',
  'Schober group': 'alps',
  'Odle Group': 'alps',
  'Latemar': 'alps',
  'Rax': 'alps',
  'Schneeberg': 'alps',
  'Watzmann': 'alps',
  'Dents du Midi': 'alps',
  'Diablerets': 'alps',
  'Churfirsten': 'alps',
  'Mount Pilatus': 'alps',
  'Pyrenees': 'pyrenees',
  'Carpathians': 'carpathians',
  'Scandinavian Mountains': 'scandinavian-mountains',
  'Apennines': 'apennines',
  'Dinaric Alps': 'dinaric-alps',
  'Balkan Mountains': 'balkan-mountains',
  'Scottish Highlands': 'scottish-highlands',
  'Rhodope Mountains': 'rhodope-mountains',
  'Pennines': 'scottish-highlands',
  'Jura Mountains': 'alps',
  'Sierra de Guadarrama': 'cantabrian-mountains',
  'Sistema Central': 'cantabrian-mountains',

  // ---- North America ----
  'Rocky Mountains': 'rocky-mountains',
  'Appalachian Mountains': 'appalachian-mountains',
  'Blue Ridge Mountains': 'appalachian-mountains',
  'Green Mountains': 'appalachian-mountains',
  'Cascade Range': 'cascade-range',
  'Alaska Range': 'alaska-range',
  'Saint Elias Mountains': 'coast-mountains',
  'Sierra Madre Oriental': 'sierra-madre-oriental',
  'Sierra Madre de Chiapas': 'sierra-madre-del-sur',
  'Laurentian Mountains': 'appalachian-mountains',
  'Santa Catalina Mountains': 'rocky-mountains',
  'Abajo Mountains': 'rocky-mountains',

  // ---- South America ----
  'Andes': 'andes',
  'Cordillera Central': 'andes',
  'Cordillera Oriental': 'andes',
  'Chilean Coast Range': 'andes',
  'Sierra Nevada de Santa Marta': 'sierra-nevada-de-santa-marta',
  'Brazilian Highlands': 'serra-da-mantiqueira',

  // ---- Africa ----
  'Atlas Mountains': 'atlas-mountains',
  'Rwenzori Mountains': 'rwenzori-mountains',
  'Drakensberg': 'drakensberg',
  'Hoggar Mountains': 'hoggar-mountains',
  'Aïr Mountains': 'hoggar-mountains',
  'Mitumba Mountains': 'east-african-rift-mountains',
  'Mount Kenya': 'east-african-rift-mountains',
  'Mount Kilimanjaro': 'east-african-rift-mountains',

  // ---- Other European ranges mapped to nearby parents ----
  'Bavarian Forest': 'carpathians',
  'Bohemian Forest': 'carpathians',
  'Ore Mountains': 'carpathians',
  'Sudetes': 'carpathians',
  'Fichtel Mountains': 'carpathians',
  'Harz': 'scandinavian-mountains',
  'Black Forest': 'alps',
};

/**
 * "Sierra Nevada" is ambiguous (exists in both USA and Spain).
 * Disambiguate using peak longitude.
 */
function resolveSierraNevada(lng: number): string | undefined {
  if (lng < -100) return 'sierra-nevada-usa';
  if (lng > -10) return 'sierra-nevada-spain';
  return undefined;
}

interface WikidataPeak {
  readonly lng: number;
  readonly lat: number;
  readonly elevation: number;
}

/**
 * Load WikiData mountain peaks JSON and match to our range IDs.
 * Returns a map from range ID to an array of peak coordinates.
 * Peaks are spatially subsampled (one per 0.5° grid cell, highest wins)
 * and capped at MAX_PEAKS_PER_RANGE.
 */
function loadWikidataPeaks(filePath: string): ReadonlyMap<string, ReadonlyArray<readonly [number, number]>> {
  if (!existsSync(filePath)) {
    console.log('WikiData peaks file not found, using manual seeds only.');
    return new Map();
  }

  console.log(`Loading WikiData peaks from ${filePath}...`);
  const raw = JSON.parse(readFileSync(filePath, 'utf-8')) as {
    readonly results: {
      readonly bindings: ReadonlyArray<{
        readonly rangeLabel?: { readonly value: string };
        readonly peakLabel?: { readonly value: string };
        readonly lat?: { readonly value: string };
        readonly lon?: { readonly value: string };
        readonly elev?: { readonly value: string };
      }>;
    };
  };

  // Group peaks by our range ID
  const peaksByRange = new Map<string, Array<WikidataPeak>>();
  let matchedCount = 0;
  let unmatchedCount = 0;

  for (const binding of raw.results.bindings) {
    const rangeLabel = binding.rangeLabel?.value;
    if (!rangeLabel || !binding.lon?.value || !binding.lat?.value) continue;
    const lng = parseFloat(binding.lon.value);
    const lat = parseFloat(binding.lat.value);
    const elevation = binding.elev?.value ? parseFloat(binding.elev.value) : 0;

    if (isNaN(lng) || isNaN(lat)) continue;

    let rangeId = WIKIDATA_RANGE_MAP[rangeLabel];

    // Handle "Sierra Nevada" ambiguity
    if (!rangeId && rangeLabel === 'Sierra Nevada') {
      rangeId = resolveSierraNevada(lng);
    }

    if (!rangeId) {
      unmatchedCount++;
      continue;
    }

    matchedCount++;
    let arr = peaksByRange.get(rangeId);
    if (!arr) {
      arr = [];
      peaksByRange.set(rangeId, arr);
    }
    arr.push({ lng, lat, elevation });
  }

  console.log(`  Matched ${matchedCount} peaks to our ranges, ${unmatchedCount} unmatched.`);

  // Spatially subsample: one peak per 0.5° grid cell (highest elevation wins),
  // then prioritize outermost (convex hull) peaks to define the range boundary,
  // filling remaining slots with highest-elevation interior peaks.
  const CELL_SIZE = 0.5; // degrees
  const MAX_PEAKS_PER_RANGE = 50;

  const result = new Map<string, ReadonlyArray<readonly [number, number]>>();

  for (const [rangeId, peaks] of peaksByRange) {
    // Grid cells: key = "gridX,gridY", value = best peak
    const cells = new Map<string, WikidataPeak>();
    for (const peak of peaks) {
      const gx = Math.floor(peak.lng / CELL_SIZE);
      const gy = Math.floor(peak.lat / CELL_SIZE);
      const key = `${gx},${gy}`;
      const existing = cells.get(key);
      if (!existing || peak.elevation > existing.elevation) {
        cells.set(key, peak);
      }
    }

    const gridPeaks = Array.from(cells.values());

    if (gridPeaks.length <= MAX_PEAKS_PER_RANGE) {
      // Few enough peaks — use all of them
      result.set(rangeId, gridPeaks.map(p => [p.lng, p.lat] as const));
      continue;
    }

    // Compute convex hull to find outermost peaks (they define the boundary shape)
    const hullIndices = convexHull(gridPeaks.map(p => [p.lng, p.lat]));
    const hullSet = new Set(hullIndices);

    // Always include hull peaks, then fill with highest-elevation interior peaks
    const hullPeaks = gridPeaks.filter((_, i) => hullSet.has(i));
    const interiorPeaks = gridPeaks
      .filter((_, i) => !hullSet.has(i))
      .sort((a, b) => b.elevation - a.elevation);

    const selected = [...hullPeaks];
    const remaining = MAX_PEAKS_PER_RANGE - selected.length;
    if (remaining > 0) {
      selected.push(...interiorPeaks.slice(0, remaining));
    }

    if (selected.length > 0) {
      result.set(rangeId, selected.map(p => [p.lng, p.lat] as const));
    }
  }

  console.log(`  Subsampled peaks for ${result.size} ranges (max ${MAX_PEAKS_PER_RANGE} per range, ${CELL_SIZE}° grid).`);
  for (const [rangeId, peaks] of result) {
    console.log(`    ${rangeId}: ${peaks.length} seed(s)`);
  }

  return result;
}

// ------------------------------------------------------------------
// Convex hull (Andrew's monotone chain)
// ------------------------------------------------------------------

/** Returns indices of points on the convex hull in counter-clockwise order. */
function convexHull(points: ReadonlyArray<readonly [number, number]>): ReadonlyArray<number> {
  const n = points.length;
  if (n <= 2) return points.map((_, i) => i);

  // Sort indices by x, then by y
  const indices = Array.from({ length: n }, (_, i) => i);
  indices.sort((a, b) => {
    const dx = points[a][0] - points[b][0];
    return dx !== 0 ? dx : points[a][1] - points[b][1];
  });

  const cross = (o: number, a: number, b: number): number =>
    (points[a][0] - points[o][0]) * (points[b][1] - points[o][1]) -
    (points[a][1] - points[o][1]) * (points[b][0] - points[o][0]);

  // Build lower hull
  const lower: Array<number> = [];
  for (const idx of indices) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], idx) <= 0) {
      lower.pop();
    }
    lower.push(idx);
  }

  // Build upper hull
  const upper: Array<number> = [];
  for (let i = indices.length - 1; i >= 0; i--) {
    const idx = indices[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], idx) <= 0) {
      upper.pop();
    }
    upper.push(idx);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

// ------------------------------------------------------------------
// Downsampled DEM
// ------------------------------------------------------------------

const DS_WIDTH = 3600;
const DS_HEIGHT = 1800;

/** Downsample full DEM to DS_WIDTH × DS_HEIGHT using max-pooling. */
function downsampleDem(
  raster: Float32Array,
  fullWidth: number,
  fullHeight: number,
): Float32Array {
  const ds = new Float32Array(DS_WIDTH * DS_HEIGHT);
  const scaleX = fullWidth / DS_WIDTH;
  const scaleY = fullHeight / DS_HEIGHT;

  for (let dy = 0; dy < DS_HEIGHT; dy++) {
    for (let dx = 0; dx < DS_WIDTH; dx++) {
      // Average the pixels in this block
      const srcX0 = Math.floor(dx * scaleX);
      const srcX1 = Math.min(fullWidth, Math.floor((dx + 1) * scaleX));
      const srcY0 = Math.floor(dy * scaleY);
      const srcY1 = Math.min(fullHeight, Math.floor((dy + 1) * scaleY));

      let sum = 0;
      let count = 0;
      for (let sy = srcY0; sy < srcY1; sy++) {
        for (let sx = srcX0; sx < srcX1; sx++) {
          sum += raster[sy * fullWidth + sx];
          count++;
        }
      }
      ds[dy * DS_WIDTH + dx] = count > 0 ? sum / count : 0;
    }
  }
  return ds;
}

/** Convert geographic coordinates to downsampled pixel coordinates. */
function geoToPixel(lng: number, lat: number): readonly [number, number] {
  const px = Math.round((lng + 180) / 360 * DS_WIDTH);
  const py = Math.round((90 - lat) / 180 * DS_HEIGHT);
  return [
    Math.max(0, Math.min(DS_WIDTH - 1, px)),
    Math.max(0, Math.min(DS_HEIGHT - 1, py)),
  ];
}

/** Convert downsampled pixel coordinates to geographic coordinates. */
function pixelToGeo(px: number, py: number): readonly [number, number] {
  const lng = (px / DS_WIDTH) * 360 - 180;
  const lat = 90 - (py / DS_HEIGHT) * 180;
  return [lng, lat];
}

// ------------------------------------------------------------------
// Voronoi partition
// ------------------------------------------------------------------

/**
 * Compute a Voronoi partition of the DEM grid from seed groups.
 * Each seed group contains 1+ seed pixels that all map to the same range index.
 * A pixel's nearest seed (by Euclidean distance) determines which range it belongs to.
 * Returns a Uint16Array where voronoi[y * DS_WIDTH + x] = range index.
 */
function computeVoronoi(
  seedGroups: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): Uint16Array {
  // Flatten seed groups into a list of (px, py, rangeIndex) for fast iteration
  const flatSeeds: Array<{ readonly px: number; readonly py: number; readonly rangeIndex: number }> = [];
  for (let g = 0; g < seedGroups.length; g++) {
    for (const [px, py] of seedGroups[g]) {
      flatSeeds.push({ px, py, rangeIndex: g });
    }
  }

  const voronoi = new Uint16Array(DS_WIDTH * DS_HEIGHT);
  for (let y = 0; y < DS_HEIGHT; y++) {
    for (let x = 0; x < DS_WIDTH; x++) {
      let bestDist = Infinity;
      let bestIdx = 0;
      for (let s = 0; s < flatSeeds.length; s++) {
        const dx = x - flatSeeds[s].px;
        const dy = y - flatSeeds[s].py;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = flatSeeds[s].rangeIndex;
        }
      }
      voronoi[y * DS_WIDTH + x] = bestIdx;
    }
    if (y % 200 === 0) process.stdout.write(`  row ${y}/${DS_HEIGHT}\r`);
  }
  return voronoi;
}

// ------------------------------------------------------------------
// Flood fill
// ------------------------------------------------------------------

/**
 * BFS flood-fill from a seed pixel with Voronoi partitioning and optional bridge radius.
 *
 * Pixels can only join the flood if they're in the same Voronoi cell as
 * the range (i.e., closer to this range's seed than any other range's seed).
 * This naturally partitions connected elevated regions between adjacent ranges.
 *
 * When radius>0: each filled pixel reaches out to all pixels within
 * `radius` distance (bridging gaps between peaks). After flood-fill,
 * the result is dilated by `radius` for smoother polygon edges.
 */
function floodFill(
  dem: Float32Array,
  voronoi: Uint16Array,
  rangeIndex: number,
  seedPx: number,
  seedPy: number,
  threshold: number,
  radius: number,
): Set<number> {
  const filled = new Set<number>();
  const seedIdx = seedPy * DS_WIDTH + seedPx;

  // Verify seed is above threshold
  if (dem[seedIdx] < threshold) {
    // Try to find a nearby pixel above threshold within our Voronoi cell
    let bestIdx = seedIdx;
    let bestElev = dem[seedIdx];
    const searchRadius = Math.max(5, radius);
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = seedPx + dx;
        const ny = seedPy + dy;
        if (nx < 0 || nx >= DS_WIDTH || ny < 0 || ny >= DS_HEIGHT) continue;
        const idx = ny * DS_WIDTH + nx;
        if (voronoi[idx] !== rangeIndex) continue;
        if (dem[idx] > bestElev) {
          bestElev = dem[idx];
          bestIdx = idx;
        }
      }
    }
    if (bestElev < threshold) {
      return filled;
    }
    filled.add(bestIdx);
  } else {
    filled.add(seedIdx);
  }

  // Pre-compute the neighbor offset list for the given radius
  const offsets = buildOffsets(radius);

  // BFS — constrained to Voronoi cell
  const queue = Array.from(filled);
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const py = Math.floor(idx / DS_WIDTH);
    const px = idx % DS_WIDTH;

    for (const [dx, dy] of offsets) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= DS_WIDTH || ny < 0 || ny >= DS_HEIGHT) continue;
      const nIdx = ny * DS_WIDTH + nx;
      if (filled.has(nIdx)) continue;
      if (voronoi[nIdx] !== rangeIndex) continue; // Voronoi constraint
      if (dem[nIdx] < threshold) continue;
      filled.add(nIdx);
      queue.push(nIdx);
    }
  }

  // Dilate the filled region by `radius` (dilation ignores Voronoi — expands into foothills)
  if (radius > 0) {
    return dilate(filled, radius);
  }

  return filled;
}

/**
 * Build the list of (dx, dy) offsets for a given radius.
 * radius=0 → 4-connected neighbors.
 * radius>0 → all pixels within Euclidean distance `radius`.
 */
function buildOffsets(radius: number): ReadonlyArray<readonly [number, number]> {
  if (radius <= 0) {
    return [[1, 0], [-1, 0], [0, 1], [0, -1]];
  }
  const offsets: Array<readonly [number, number]> = [];
  const r2 = radius * radius;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (dx * dx + dy * dy <= r2) {
        offsets.push([dx, dy]);
      }
    }
  }
  return offsets;
}

/**
 * Morphological dilation: expand a filled region by `radius` pixels.
 * Every pixel within `radius` of any filled pixel becomes filled.
 */
function dilate(
  filled: Set<number>,
  radius: number,
): Set<number> {
  const dilated = new Set(filled);
  const r2 = radius * radius;

  for (const idx of filled) {
    const py = Math.floor(idx / DS_WIDTH);
    const px = idx % DS_WIDTH;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const nx = px + dx;
        const ny = py + dy;
        if (nx < 0 || nx >= DS_WIDTH || ny < 0 || ny >= DS_HEIGHT) continue;
        const nIdx = ny * DS_WIDTH + nx;
        dilated.add(nIdx);
      }
    }
  }

  return dilated;
}

// ------------------------------------------------------------------
// Keep only the largest connected component
// ------------------------------------------------------------------

function largestComponent(filled: Set<number>): Set<number> {
  if (filled.size === 0) return filled;

  const visited = new Set<number>();
  let largestSet = new Set<number>();

  for (const idx of filled) {
    if (visited.has(idx)) continue;

    // BFS to find this component
    const component = new Set<number>();
    const queue = [idx];
    component.add(idx);
    visited.add(idx);

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const py = Math.floor(cur / DS_WIDTH);
      const px = cur % DS_WIDTH;

      const dx4 = [1, -1, 0, 0];
      const dy4 = [0, 0, 1, -1];

      for (let d = 0; d < 4; d++) {
        const nx = px + dx4[d];
        const ny = py + dy4[d];
        const nIdx = ny * DS_WIDTH + nx;

        if (!filled.has(nIdx) || visited.has(nIdx)) continue;

        visited.add(nIdx);
        component.add(nIdx);
        queue.push(nIdx);
      }
    }

    if (component.size > largestSet.size) {
      largestSet = component;
    }
  }

  return largestSet;
}

// ------------------------------------------------------------------
// Boundary extraction via Moore boundary tracing
// ------------------------------------------------------------------

// Moore neighborhood: 8 directions clockwise from up-left
// Index 0=up-left, 1=up, 2=up-right, 3=right, 4=down-right, 5=down, 6=down-left, 7=left
const MOORE_DX = [-1, 0, 1, 1, 1, 0, -1, -1] as const;
const MOORE_DY = [-1, -1, -1, 0, 1, 1, 1, 0] as const;

/**
 * Find all connected components in a binary grid (4-connected).
 * Returns components above the minimum pixel count.
 */
function findComponents(
  grid: Uint8Array,
  gridW: number,
  gridH: number,
  minSize: number,
): Array<Set<number>> {
  const visited = new Uint8Array(gridW * gridH);
  const components: Array<Set<number>> = [];

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = y * gridW + x;
      if (grid[idx] === 0 || visited[idx]) continue;

      // BFS for this component
      const component = new Set<number>();
      const queue = [idx];
      visited[idx] = 1;
      component.add(idx);

      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        const cy = Math.floor(cur / gridW);
        const cx = cur % gridW;

        for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + ddx;
          const ny = cy + ddy;
          if (nx < 0 || nx >= gridW || ny < 0 || ny >= gridH) continue;
          const nIdx = ny * gridW + nx;
          if (grid[nIdx] === 0 || visited[nIdx]) continue;
          visited[nIdx] = 1;
          component.add(nIdx);
          queue.push(nIdx);
        }
      }

      if (component.size >= minSize) {
        components.push(component);
      }
    }
  }

  return components;
}

/**
 * Trace the boundary of a single connected component using Moore boundary tracing.
 * Returns boundary pixel coordinates in grid-local space as [x, y] pairs.
 */
function mooreBoundaryTrace(
  grid: Uint8Array,
  gridW: number,
  gridH: number,
  component: Set<number>,
): Array<readonly [number, number]> {
  // Find topmost-leftmost filled pixel as start
  let startX = gridW;
  let startY = gridH;
  for (const idx of component) {
    const y = Math.floor(idx / gridW);
    const x = idx % gridW;
    if (y < startY || (y === startY && x < startX)) {
      startY = y;
      startX = x;
    }
  }

  const isFilled = (x: number, y: number): boolean => {
    if (x < 0 || x >= gridW || y < 0 || y >= gridH) return false;
    return grid[y * gridW + x] === 1;
  };

  const boundary: Array<readonly [number, number]> = [[startX, startY]];

  // We entered the start pixel from above (since it's topmost), so we were facing down.
  // In Moore tracing, we start checking from the cell we came from.
  // We came from (startX, startY-1) which is direction index 1 (up).
  // We start scanning clockwise from the direction AFTER the backtrack direction.
  // Backtrack = up (index 1), so start scanning from index 2 (up-right).
  let curX = startX;
  let curY = startY;
  // The direction we came from. Start pixel was entered from above, so backtrack is "up" = index 1.
  let backtrackDir = 1;

  const maxSteps = component.size * 4 + 10;
  let steps = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    steps++;
    if (steps > maxSteps) break;

    // Scan clockwise starting from (backtrackDir + 1) % 8
    let found = false;
    for (let i = 0; i < 8; i++) {
      const dir = (backtrackDir + 1 + i) % 8;
      const nx = curX + MOORE_DX[dir];
      const ny = curY + MOORE_DY[dir];

      if (isFilled(nx, ny)) {
        // Move to this cell
        curX = nx;
        curY = ny;
        // Backtrack direction is the opposite of the direction we just moved
        backtrackDir = (dir + 4) % 8;

        if (curX === startX && curY === startY) {
          // Returned to start — boundary complete
          return boundary;
        }

        boundary.push([curX, curY]);
        found = true;
        break;
      }
    }

    if (!found) {
      // Isolated pixel or stuck
      break;
    }
  }

  return boundary;
}

/**
 * Extract boundary polygons from a filled pixel set using Moore boundary tracing.
 * Returns arrays of [lng, lat] coordinates for each closed contour.
 * Traces all connected components above a minimum size (10 pixels).
 */
function extractBoundary(
  filled: Set<number>,
  boundsMinPx: number,
  boundsMaxPx: number,
  boundsMinPy: number,
  boundsMaxPy: number,
): Array<Array<readonly [number, number]>> {
  // Build a grid representation with 1px padding on all sides
  const gridW = boundsMaxPx - boundsMinPx + 3;
  const gridH = boundsMaxPy - boundsMinPy + 3;
  const grid = new Uint8Array(gridW * gridH);

  for (const idx of filled) {
    const py = Math.floor(idx / DS_WIDTH) - boundsMinPy + 1; // +1 for padding
    const px = (idx % DS_WIDTH) - boundsMinPx + 1;
    if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
      grid[py * gridW + px] = 1;
    }
  }

  // Find all connected components above minimum size
  const MIN_COMPONENT_SIZE = 10;
  const components = findComponents(grid, gridW, gridH, MIN_COMPONENT_SIZE);

  const polygons: Array<Array<readonly [number, number]>> = [];

  for (const component of components) {
    // Build a component-only grid for tracing
    const compGrid = new Uint8Array(gridW * gridH);
    for (const idx of component) {
      compGrid[idx] = 1;
    }

    const boundaryPixels = mooreBoundaryTrace(compGrid, gridW, gridH, component);
    if (boundaryPixels.length < 3) continue;

    // Convert boundary pixel coordinates to geographic coordinates
    // Undo the padding offset (+1) and add the global bounds offset
    const geoPoints: Array<readonly [number, number]> = boundaryPixels.map(([bx, by]) => {
      const globalPx = bx - 1 + boundsMinPx; // -1 for padding
      const globalPy = by - 1 + boundsMinPy;
      return pixelToGeo(globalPx, globalPy);
    });

    polygons.push(geoPoints);
  }

  return polygons;
}

// ------------------------------------------------------------------
// Douglas-Peucker simplification
// ------------------------------------------------------------------

function douglasPeucker(
  points: ReadonlyArray<readonly [number, number]>,
  epsilon: number,
): Array<readonly [number, number]> {
  if (points.length <= 2) return [...points];

  // Find the point with the maximum distance from the line between first and last
  let maxDist = 0;
  let maxIdx = 0;

  const [x1, y1] = points[0];
  const [x2, y2] = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], [x1, y1], [x2, y2]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
}

function perpendicularDistance(
  point: readonly [number, number],
  lineStart: readonly [number, number],
  lineEnd: readonly [number, number],
): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }

  const num = Math.abs(dy * px - dx * py + x2 * y1 - y2 * x1);
  return num / Math.sqrt(lengthSq);
}

// ------------------------------------------------------------------
// SVG path generation
// ------------------------------------------------------------------

function polygonToSvgPath(polygon: ReadonlyArray<readonly [number, number]>): string {
  if (polygon.length < 3) throw new Error('Polygon needs at least 3 vertices');

  const parts: Array<string> = [];
  for (let i = 0; i < polygon.length; i++) {
    const [lng, lat] = polygon[i];
    const x = Math.round(lng * 10) / 10;
    const y = Math.round(-lat * 10) / 10;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// ------------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------------

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('|') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// Mountain range definitions
// ------------------------------------------------------------------

const RANGES: ReadonlyArray<RangeDefinition> = [
  // ======================== ASIA (20) ========================
  {
    id: 'himalayas',
    name: 'Himalayas',
    nameAlternates: 'Himalaya|The Himalayas',
    continent: 'Asia',
    seeds: [[76, 34], [80, 30], [84, 28.5], [88, 28], [92, 28]],
    threshold: 3000,
    radius: 3,
    latitude: 28.5,
    longitude: 84.0,
    peakElevationM: 8849,
    lengthKm: 2400,
    areaKm2: 595000,
    highestPeak: 'Everest',
  },
  {
    id: 'karakoram',
    name: 'Karakoram',
    nameAlternates: 'Karakorum',
    continent: 'Asia',
    seeds: [[76.5, 36.0]],
    threshold: 3500,
    latitude: 36.0,
    longitude: 76.5,
    peakElevationM: 8611,
    lengthKm: 500,
    areaKm2: 77000,
    highestPeak: 'K2',
  },
  {
    id: 'hindu-kush',
    name: 'Hindu Kush',
    nameAlternates: 'Hindukush',
    continent: 'Asia',
    seeds: [[70.5, 35.5]],
    threshold: 2000,
    latitude: 35.5,
    longitude: 70.5,
    peakElevationM: 7708,
    lengthKm: 800,
    areaKm2: 115000,
    highestPeak: 'Tirich Mir',
  },
  {
    id: 'pamir-mountains',
    name: 'Pamir Mountains',
    nameAlternates: 'Pamirs|Roof of the World',
    continent: 'Asia',
    seeds: [[73.0, 38.5]],
    threshold: 3000,
    latitude: 38.5,
    longitude: 73.0,
    peakElevationM: 7495,
    lengthKm: 400,
    areaKm2: 120000,
    highestPeak: 'Ismoil Somoni Peak',
  },
  {
    id: 'tian-shan',
    name: 'Tian Shan',
    nameAlternates: 'Tien Shan|Celestial Mountains',
    continent: 'Asia',
    seeds: [[80.0, 42.0]],
    threshold: 2000,
    latitude: 42.0,
    longitude: 80.0,
    peakElevationM: 7439,
    lengthKm: 2500,
    areaKm2: 450000,
    highestPeak: 'Jengish Chokusu',
  },
  {
    id: 'kunlun-mountains',
    name: 'Kunlun Mountains',
    nameAlternates: 'Kunlun Shan|Kunlun Range',
    continent: 'Asia',
    seeds: [[78, 36], [82, 36.5], [87, 36.5], [92, 37]],
    threshold: 5000,
    radius: 3,
    latitude: 35.5,
    longitude: 85.0,
    peakElevationM: 7167,
    lengthKm: 3000,
    areaKm2: 340000,
    highestPeak: 'Liushi Shan',
  },
  {
    id: 'altai-mountains',
    name: 'Altai Mountains',
    nameAlternates: 'Altay Mountains',
    continent: 'Asia',
    seeds: [[87.0, 49.0]],
    threshold: 1000,
    latitude: 49.0,
    longitude: 87.0,
    peakElevationM: 4506,
    lengthKm: 2000,
    areaKm2: 300000,
    highestPeak: 'Belukha',
  },
  {
    id: 'ural-mountains',
    name: 'Ural Mountains',
    nameAlternates: 'Urals|Ural Range',
    continent: 'Asia',
    seeds: [[59, 52], [59, 58], [60, 64]],
    threshold: 300,
    latitude: 60.0,
    longitude: 59.0,
    peakElevationM: 1895,
    lengthKm: 2500,
    areaKm2: 220000,
    highestPeak: 'Mount Narodnaya',
  },
  {
    id: 'caucasus',
    name: 'Caucasus',
    nameAlternates: 'Caucasus Mountains|Greater Caucasus',
    continent: 'Asia',
    seeds: [[43.5, 42.5]],
    threshold: 1000,
    latitude: 42.5,
    longitude: 43.5,
    peakElevationM: 5642,
    lengthKm: 1200,
    areaKm2: 160000,
    highestPeak: 'Mount Elbrus',
  },
  {
    id: 'zagros-mountains',
    name: 'Zagros Mountains',
    nameAlternates: 'Zagros Range',
    continent: 'Asia',
    seeds: [[49.0, 32.0]],
    threshold: 1200,
    latitude: 32.0,
    longitude: 49.0,
    peakElevationM: 4409,
    lengthKm: 1600,
    areaKm2: 240000,
    highestPeak: 'Dena',
  },
  {
    id: 'elburz-mountains',
    name: 'Elburz Mountains',
    nameAlternates: 'Alborz|Alborz Mountains',
    continent: 'Asia',
    seeds: [[52.0, 36.0]],
    threshold: 1500,
    latitude: 36.0,
    longitude: 52.0,
    peakElevationM: 5610,
    lengthKm: 900,
    areaKm2: 60000,
    highestPeak: 'Damavand',
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats',
    nameAlternates: 'Sahyadri|Western Ghat Mountains',
    continent: 'Asia',
    seeds: [[75.0, 14.0]],
    threshold: 400,
    latitude: 14.0,
    longitude: 75.0,
    peakElevationM: 2695,
    lengthKm: 1600,
    areaKm2: 160000,
    highestPeak: 'Anamudi',
  },
  {
    id: 'eastern-ghats',
    name: 'Eastern Ghats',
    nameAlternates: 'Eastern Ghat Mountains',
    continent: 'Asia',
    seeds: [[79.5, 15.5]],
    threshold: 300,
    latitude: 15.5,
    longitude: 79.5,
    peakElevationM: 1680,
    lengthKm: 1300,
    areaKm2: 75000,
    highestPeak: 'Jindhagada Peak',
  },
  {
    id: 'japanese-alps',
    name: 'Japanese Alps',
    nameAlternates: 'Nihon Alps',
    continent: 'Asia',
    seeds: [[137.5, 36.2]],
    threshold: 800,
    latitude: 36.2,
    longitude: 137.5,
    peakElevationM: 3190,
    lengthKm: 200,
    areaKm2: 12000,
    highestPeak: 'Mount Hotaka',
  },
  {
    id: 'altun-mountains',
    name: 'Altun Mountains',
    nameAlternates: 'Altun Shan|Astin Tagh',
    continent: 'Asia',
    seeds: [[88.5, 38.5]],
    threshold: 4500,
    radius: 2,
    latitude: 38.0,
    longitude: 88.5,
    peakElevationM: 6161,
    lengthKm: 800,
    areaKm2: 60000,
    highestPeak: 'Ulugh Muztagh',
  },
  {
    id: 'hengduan-mountains',
    name: 'Hengduan Mountains',
    nameAlternates: 'Hengduan Shan',
    continent: 'Asia',
    seeds: [[99.0, 28.5]],
    threshold: 2500,
    latitude: 28.5,
    longitude: 99.0,
    peakElevationM: 7556,
    lengthKm: 900,
    areaKm2: 125000,
    highestPeak: 'Minya Konka',
  },
  {
    id: 'stanovoy-range',
    name: 'Stanovoy Range',
    nameAlternates: 'Stanovoi Range|Stanovoy Mountains',
    continent: 'Asia',
    seeds: [[127.0, 56.0]],
    threshold: 600,
    latitude: 56.0,
    longitude: 127.0,
    peakElevationM: 2412,
    lengthKm: 700,
    areaKm2: 95000,
    highestPeak: 'Stanovoy Peak',
  },
  {
    id: 'verkhoyansk-range',
    name: 'Verkhoyansk Range',
    nameAlternates: 'Verkhoyansk Mountains',
    continent: 'Asia',
    seeds: [[130.0, 64.0]],
    threshold: 600,
    latitude: 64.0,
    longitude: 130.0,
    peakElevationM: 2389,
    lengthKm: 1200,
    areaKm2: 180000,
    highestPeak: 'Mus-Khaya',
  },
  {
    id: 'chersky-range',
    name: 'Chersky Range',
    nameAlternates: 'Chersky Mountains|Cherskiy Range',
    continent: 'Asia',
    seeds: [[143.0, 64.0]],
    threshold: 600,
    latitude: 64.0,
    longitude: 143.0,
    peakElevationM: 3003,
    lengthKm: 1500,
    areaKm2: 220000,
    highestPeak: 'Pobeda Peak',
  },
  {
    id: 'sikhote-alin',
    name: 'Sikhote-Alin',
    nameAlternates: 'Sikhote Alin Mountains',
    continent: 'Asia',
    seeds: [[135.5, 46.0]],
    threshold: 400,
    latitude: 46.0,
    longitude: 135.5,
    peakElevationM: 2090,
    lengthKm: 1200,
    areaKm2: 116000,
    highestPeak: 'Gora Tordoki-Yani',
  },

  // ======================== EUROPE (12) ========================
  {
    id: 'alps',
    name: 'Alps',
    nameAlternates: 'European Alps|The Alps',
    continent: 'Europe',
    seeds: [[10.0, 46.5]],
    threshold: 800,
    radius: 2,
    latitude: 46.5,
    longitude: 10.0,
    peakElevationM: 4809,
    lengthKm: 1200,
    areaKm2: 200000,
    highestPeak: 'Mont Blanc',
  },
  {
    id: 'pyrenees',
    name: 'Pyrenees',
    nameAlternates: 'Pirineos|Pyrenees Mountains',
    continent: 'Europe',
    seeds: [[0.7, 42.7]],
    threshold: 700,
    latitude: 42.7,
    longitude: 0.7,
    peakElevationM: 3404,
    lengthKm: 491,
    areaKm2: 55000,
    highestPeak: 'Aneto',
  },
  {
    id: 'carpathians',
    name: 'Carpathians',
    nameAlternates: 'Carpathian Mountains',
    continent: 'Europe',
    seeds: [[24, 46], [22, 48], [26, 45]],
    threshold: 400,
    latitude: 47.5,
    longitude: 22.0,
    peakElevationM: 2655,
    lengthKm: 1500,
    areaKm2: 190000,
    highestPeak: 'Gerlach',
  },
  {
    id: 'scandinavian-mountains',
    name: 'Scandinavian Mountains',
    nameAlternates: 'Scandes|Scandinavian Range',
    continent: 'Europe',
    seeds: [[14, 62], [16, 66], [18, 69]],
    threshold: 500,
    latitude: 64.5,
    longitude: 13.0,
    peakElevationM: 2469,
    lengthKm: 1700,
    areaKm2: 230000,
    highestPeak: 'Galdhopiggen',
  },
  {
    id: 'apennines',
    name: 'Apennines',
    nameAlternates: 'Apennine Mountains|Appennini',
    continent: 'Europe',
    seeds: [[13.0, 42.0]],
    threshold: 400,
    latitude: 42.0,
    longitude: 13.0,
    peakElevationM: 2912,
    lengthKm: 1200,
    areaKm2: 100000,
    highestPeak: 'Corno Grande',
  },
  {
    id: 'dinaric-alps',
    name: 'Dinaric Alps',
    nameAlternates: 'Dinarides|Dinaric Mountains',
    continent: 'Europe',
    seeds: [[17.0, 43.5]],
    threshold: 500,
    latitude: 43.5,
    longitude: 17.0,
    peakElevationM: 2694,
    lengthKm: 645,
    areaKm2: 75000,
    highestPeak: 'Maja Jezerca',
  },
  {
    id: 'balkan-mountains',
    name: 'Balkan Mountains',
    nameAlternates: 'Stara Planina|Balkans',
    continent: 'Europe',
    seeds: [[25.0, 42.8]],
    threshold: 500,
    latitude: 42.8,
    longitude: 25.0,
    peakElevationM: 2376,
    lengthKm: 560,
    areaKm2: 40000,
    highestPeak: 'Botev Peak',
  },
  {
    id: 'pindus-mountains',
    name: 'Pindus Mountains',
    nameAlternates: 'Pindos|Pindus Range',
    continent: 'Europe',
    seeds: [[20.8, 39.5]],
    threshold: 500,
    latitude: 39.5,
    longitude: 20.8,
    peakElevationM: 2637,
    lengthKm: 250,
    areaKm2: 18000,
    highestPeak: 'Smolikas',
  },
  {
    id: 'scottish-highlands',
    name: 'Scottish Highlands',
    nameAlternates: 'Highlands|Scottish Highland Mountains',
    continent: 'Europe',
    seeds: [[-5.0, 57.5]],
    threshold: 200,
    latitude: 57.5,
    longitude: -5.0,
    peakElevationM: 1345,
    lengthKm: 250,
    areaKm2: 26000,
    highestPeak: 'Ben Nevis',
  },
  {
    id: 'sierra-nevada-spain',
    name: 'Sierra Nevada',
    nameAlternates: 'Sierra Nevada Spain',
    continent: 'Europe',
    seeds: [[-3.2, 37.0]],
    threshold: 1200,
    latitude: 37.0,
    longitude: -3.2,
    peakElevationM: 3479,
    lengthKm: 80,
    areaKm2: 2100,
    highestPeak: 'Mulhacen',
  },
  {
    id: 'cantabrian-mountains',
    name: 'Cantabrian Mountains',
    nameAlternates: 'Cordillera Cantabrica',
    continent: 'Europe',
    seeds: [[-5.0, 43.0]],
    threshold: 600,
    latitude: 43.0,
    longitude: -5.0,
    peakElevationM: 2650,
    lengthKm: 480,
    areaKm2: 36000,
    highestPeak: 'Picos de Europa',
  },
  {
    id: 'rhodope-mountains',
    name: 'Rhodope Mountains',
    nameAlternates: 'Rhodopes|Rodopi',
    continent: 'Europe',
    seeds: [[24.5, 41.5]],
    threshold: 600,
    latitude: 41.5,
    longitude: 24.5,
    peakElevationM: 2191,
    lengthKm: 240,
    areaKm2: 18000,
    highestPeak: 'Golyam Perelik',
  },

  // ======================== NORTH AMERICA (10) ========================
  {
    id: 'rocky-mountains',
    name: 'Rocky Mountains',
    nameAlternates: 'Rockies|The Rockies',
    continent: 'North America',
    seeds: [[-110, 40], [-114, 45], [-115, 50]],
    threshold: 1500,
    latitude: 47.0,
    longitude: -114.0,
    peakElevationM: 4401,
    lengthKm: 4800,
    areaKm2: 990000,
    highestPeak: 'Mount Elbert',
  },
  {
    id: 'appalachian-mountains',
    name: 'Appalachian Mountains',
    nameAlternates: 'Appalachians|The Appalachians',
    continent: 'North America',
    seeds: [[-82, 36], [-79, 38], [-76, 41]],
    threshold: 200,
    latitude: 40.0,
    longitude: -77.0,
    peakElevationM: 2037,
    lengthKm: 2400,
    areaKm2: 480000,
    highestPeak: 'Mount Mitchell',
  },
  {
    id: 'sierra-nevada-usa',
    name: 'Sierra Nevada',
    nameAlternates: 'Sierra Nevada USA|Sierras',
    continent: 'North America',
    seeds: [[-119.5, 37.5]],
    threshold: 1500,
    latitude: 37.5,
    longitude: -119.5,
    peakElevationM: 4421,
    lengthKm: 640,
    areaKm2: 63000,
    highestPeak: 'Mount Whitney',
  },
  {
    id: 'cascade-range',
    name: 'Cascade Range',
    nameAlternates: 'Cascades|Cascade Mountains',
    continent: 'North America',
    seeds: [[-121.8, 45.5]],
    threshold: 800,
    latitude: 45.5,
    longitude: -121.8,
    peakElevationM: 4392,
    lengthKm: 1100,
    areaKm2: 85000,
    highestPeak: 'Mount Rainier',
  },
  {
    id: 'alaska-range',
    name: 'Alaska Range',
    nameAlternates: 'Alaska Range Mountains',
    continent: 'North America',
    seeds: [[-149.0, 62.5]],
    threshold: 800,
    latitude: 62.5,
    longitude: -149.0,
    peakElevationM: 6190,
    lengthKm: 650,
    areaKm2: 78000,
    highestPeak: 'Denali',
  },
  {
    id: 'brooks-range',
    name: 'Brooks Range',
    nameAlternates: 'Brooks Range Mountains',
    continent: 'North America',
    seeds: [[-153.0, 68.5]],
    threshold: 500,
    latitude: 68.5,
    longitude: -153.0,
    peakElevationM: 2736,
    lengthKm: 1100,
    areaKm2: 180000,
    highestPeak: 'Mount Isto',
  },
  {
    id: 'coast-mountains',
    name: 'Coast Mountains',
    nameAlternates: 'Coast Range BC',
    continent: 'North America',
    seeds: [[-126.5, 55.0]],
    threshold: 600,
    latitude: 55.0,
    longitude: -126.5,
    peakElevationM: 4042,
    lengthKm: 1600,
    areaKm2: 220000,
    highestPeak: 'Mount Waddington',
  },
  {
    id: 'sierra-madre-occidental',
    name: 'Sierra Madre Occidental',
    nameAlternates: 'Western Sierra Madre',
    continent: 'North America',
    seeds: [[-107.0, 26.0]],
    threshold: 1500,
    latitude: 26.0,
    longitude: -107.0,
    peakElevationM: 3250,
    lengthKm: 1250,
    areaKm2: 190000,
    highestPeak: 'Cerro Mohinora',
  },
  {
    id: 'sierra-madre-oriental',
    name: 'Sierra Madre Oriental',
    nameAlternates: 'Eastern Sierra Madre',
    continent: 'North America',
    seeds: [[-100.0, 24.5]],
    threshold: 1200,
    latitude: 24.5,
    longitude: -100.0,
    peakElevationM: 3700,
    lengthKm: 1000,
    areaKm2: 130000,
    highestPeak: 'Cerro San Rafael',
  },
  {
    id: 'sierra-madre-del-sur',
    name: 'Sierra Madre del Sur',
    nameAlternates: 'Southern Sierra Madre',
    continent: 'North America',
    seeds: [[-98.5, 17.0]],
    threshold: 1000,
    latitude: 17.0,
    longitude: -98.5,
    peakElevationM: 3703,
    lengthKm: 1000,
    areaKm2: 95000,
    highestPeak: 'Cerro Teotepec',
  },

  // ======================== SOUTH AMERICA (8) ========================
  {
    id: 'andes',
    name: 'Andes',
    nameAlternates: 'Andes Mountains|Cordillera de los Andes',
    continent: 'South America',
    seeds: [[-70, -15], [-70, -25], [-70, -35], [-72, -45]],
    threshold: 2000,
    latitude: -18.0,
    longitude: -70.0,
    peakElevationM: 6961,
    lengthKm: 7000,
    areaKm2: 3370000,
    highestPeak: 'Aconcagua',
  },
  {
    id: 'serra-do-mar',
    name: 'Serra do Mar',
    nameAlternates: 'Sea Mountain Range',
    continent: 'South America',
    seeds: [[-49.0, -26.0]],
    threshold: 300,
    latitude: -25.0,
    longitude: -47.0,
    peakElevationM: 2316,
    lengthKm: 1500,
    areaKm2: 52000,
    highestPeak: 'Pico Parana',
  },
  {
    id: 'serra-da-mantiqueira',
    name: 'Serra da Mantiqueira',
    nameAlternates: 'Mantiqueira Mountains',
    continent: 'South America',
    seeds: [[-44.5, -22.5]],
    threshold: 600,
    latitude: -22.5,
    longitude: -44.5,
    peakElevationM: 2798,
    lengthKm: 500,
    areaKm2: 30000,
    highestPeak: 'Pedra da Mina',
  },
  {
    id: 'guiana-highlands',
    name: 'Guiana Highlands',
    nameAlternates: 'Guiana Shield|Guyana Highlands',
    continent: 'South America',
    seeds: [[-63.0, 4.5]],
    threshold: 500,
    latitude: 4.5,
    longitude: -63.0,
    peakElevationM: 2810,
    lengthKm: 1300,
    areaKm2: 450000,
    highestPeak: 'Mount Roraima',
  },
  {
    id: 'cordillera-blanca',
    name: 'Cordillera Blanca',
    nameAlternates: 'White Range',
    continent: 'South America',
    seeds: [[-77.5, -9.2]],
    threshold: 3500,
    latitude: -9.2,
    longitude: -77.5,
    peakElevationM: 6768,
    lengthKm: 180,
    areaKm2: 6500,
    highestPeak: 'Huascaran',
  },
  {
    id: 'cordillera-real',
    name: 'Cordillera Real',
    nameAlternates: 'Royal Range|Cordillera Real Bolivia',
    continent: 'South America',
    seeds: [[-68.0, -16.0]],
    threshold: 3800,
    latitude: -16.0,
    longitude: -68.0,
    peakElevationM: 6438,
    lengthKm: 200,
    areaKm2: 10000,
    highestPeak: 'Illimani',
  },
  {
    id: 'sierra-nevada-de-santa-marta',
    name: 'Sierra Nevada de Santa Marta',
    nameAlternates: 'Sierra Nevada Santa Marta',
    continent: 'South America',
    seeds: [[-73.7, 10.7]],
    threshold: 1000,
    latitude: 10.7,
    longitude: -73.7,
    peakElevationM: 5775,
    lengthKm: 170,
    areaKm2: 17000,
    highestPeak: 'Pico Cristobal Colon',
  },
  {
    id: 'patagonian-andes',
    name: 'Patagonian Andes',
    nameAlternates: 'Andes Patagonicos',
    continent: 'South America',
    seeds: [[-72.5, -45.5]],
    threshold: 800,
    latitude: -45.5,
    longitude: -72.5,
    peakElevationM: 3405,
    lengthKm: 1200,
    areaKm2: 240000,
    highestPeak: 'Monte San Valentin',
  },

  // ======================== AFRICA (8) ========================
  {
    id: 'atlas-mountains',
    name: 'Atlas Mountains',
    nameAlternates: 'Atlas Range|The Atlas',
    continent: 'Africa',
    seeds: [[-1.0, 33.5]],
    threshold: 800,
    latitude: 33.5,
    longitude: -1.0,
    peakElevationM: 4167,
    lengthKm: 2500,
    areaKm2: 775000,
    highestPeak: 'Toubkal',
  },
  {
    id: 'ethiopian-highlands',
    name: 'Ethiopian Highlands',
    nameAlternates: 'Ethiopian Plateau|Abyssinian Highlands',
    continent: 'Africa',
    seeds: [[38.0, 10.5]],
    threshold: 1500,
    latitude: 10.5,
    longitude: 38.0,
    peakElevationM: 4550,
    lengthKm: 1000,
    areaKm2: 530000,
    highestPeak: 'Ras Dashen',
  },
  {
    id: 'rwenzori-mountains',
    name: 'Rwenzori Mountains',
    nameAlternates: 'Ruwenzori|Mountains of the Moon',
    continent: 'Africa',
    seeds: [[29.8, 0.2]],
    threshold: 1500,
    latitude: 0.2,
    longitude: 29.8,
    peakElevationM: 5109,
    lengthKm: 120,
    areaKm2: 4000,
    highestPeak: 'Mount Stanley',
  },
  {
    id: 'drakensberg',
    name: 'Drakensberg',
    nameAlternates: 'Drakensberg Mountains|uKhahlamba',
    continent: 'Africa',
    seeds: [[28.5, -29.5]],
    threshold: 1200,
    latitude: -29.5,
    longitude: 28.5,
    peakElevationM: 3482,
    lengthKm: 1000,
    areaKm2: 60000,
    highestPeak: 'Thabana Ntlenyana',
  },
  {
    id: 'hoggar-mountains',
    name: 'Hoggar Mountains',
    nameAlternates: 'Ahaggar|Ahaggar Mountains',
    continent: 'Africa',
    seeds: [[5.5, 23.0]],
    threshold: 800,
    latitude: 23.0,
    longitude: 5.5,
    peakElevationM: 2918,
    lengthKm: 500,
    areaKm2: 55000,
    highestPeak: 'Mount Tahat',
  },
  {
    id: 'tibesti-mountains',
    name: 'Tibesti Mountains',
    nameAlternates: 'Tibesti Massif',
    continent: 'Africa',
    seeds: [[17.0, 21.0]],
    threshold: 800,
    latitude: 21.0,
    longitude: 17.0,
    peakElevationM: 3445,
    lengthKm: 300,
    areaKm2: 100000,
    highestPeak: 'Emi Koussi',
  },
  {
    id: 'cameroon-highlands',
    name: 'Cameroon Highlands',
    nameAlternates: 'Cameroon Line|Cameroon Volcanic Line',
    continent: 'Africa',
    seeds: [[9.5, 6.0]],
    threshold: 600,
    latitude: 6.0,
    longitude: 9.5,
    peakElevationM: 4095,
    lengthKm: 500,
    areaKm2: 45000,
    highestPeak: 'Mount Cameroon',
  },
  {
    id: 'east-african-rift-mountains',
    name: 'East African Rift Mountains',
    nameAlternates: 'East African Mountains|Rift Valley Mountains',
    continent: 'Africa',
    seeds: [[36.0, -1.5]],
    threshold: 1500,
    latitude: -1.5,
    longitude: 36.0,
    peakElevationM: 5895,
    lengthKm: 800,
    areaKm2: 120000,
    highestPeak: 'Kilimanjaro',
  },

  // ======================== OCEANIA (5) ========================
  {
    id: 'great-dividing-range',
    name: 'Great Dividing Range',
    nameAlternates: 'Great Divide|Eastern Highlands Australia',
    continent: 'Oceania',
    seeds: [[149, -33], [148, -37], [146, -41]],
    threshold: 300,
    latitude: -26.0,
    longitude: 148.0,
    peakElevationM: 2228,
    lengthKm: 3500,
    areaKm2: 520000,
    highestPeak: 'Kosciuszko',
  },
  {
    id: 'southern-alps-nz',
    name: 'Southern Alps',
    nameAlternates: 'Ka Tiritiri o te Moana|New Zealand Alps',
    continent: 'Oceania',
    seeds: [[170.0, -43.5]],
    threshold: 400,
    radius: 5,
    latitude: -43.5,
    longitude: 170.0,
    peakElevationM: 3724,
    lengthKm: 500,
    areaKm2: 36000,
    highestPeak: 'Aoraki/Mount Cook',
  },
  {
    id: 'maoke-mountains',
    name: 'Maoke Mountains',
    nameAlternates: 'Sudirman Range|Snow Mountains',
    continent: 'Oceania',
    seeds: [[138.0, -4.2]],
    threshold: 1000,
    latitude: -4.2,
    longitude: 138.0,
    peakElevationM: 4884,
    lengthKm: 600,
    areaKm2: 50000,
    highestPeak: 'Puncak Jaya',
  },
  {
    id: 'owen-stanley-range',
    name: 'Owen Stanley Range',
    nameAlternates: 'Owen Stanley Mountains',
    continent: 'Oceania',
    seeds: [[148.0, -8.0]],
    threshold: 800,
    latitude: -8.0,
    longitude: 148.0,
    peakElevationM: 4072,
    lengthKm: 300,
    areaKm2: 25000,
    highestPeak: 'Mount Victoria',
  },
  {
    id: 'central-range-taiwan',
    name: 'Central Range',
    nameAlternates: 'Central Mountain Range|Taiwan Central Range',
    continent: 'Oceania',
    seeds: [[121.0, 23.5]],
    threshold: 1000,
    latitude: 23.5,
    longitude: 121.0,
    peakElevationM: 3952,
    lengthKm: 340,
    areaKm2: 11000,
    highestPeak: 'Jade Mountain',
  },
];

// ------------------------------------------------------------------
// DEM reading
// ------------------------------------------------------------------

async function readFullDem(image: GeoTIFFImage): Promise<{ readonly raster: Float32Array; readonly width: number; readonly height: number }> {
  const width = image.getWidth();
  const height = image.getHeight();
  console.log(`  Reading full DEM (${width}×${height})...`);
  const rasterData = await image.readRasters({ window: [0, 0, width, height] });
  const raster = rasterData[0] as Float32Array;
  console.log(`  DEM loaded (${(raster.byteLength / 1024 / 1024).toFixed(0)} MB)`);
  return { raster, width, height };
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main(): Promise<void> {
  const sourcePath = resolve('scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif');
  console.log(`Reading DEM from ${sourcePath}...`);

  const tiff = await fromFile(sourcePath);
  const image = await tiff.getImage();
  const { raster, width, height } = await readFullDem(image);

  console.log(`\nDownsampling DEM from ${width}×${height} to ${DS_WIDTH}×${DS_HEIGHT}...`);
  const dem = downsampleDem(raster, width, height);
  console.log('  Done.');

  // Load WikiData peaks to use as seeds (falls back to manual seeds when unavailable)
  const wikidataPeaksPath = resolve('scripts/source-data/wikidata-mountain-peaks.json');
  const wikidataPeaks = loadWikidataPeaks(wikidataPeaksPath);

  // Build seed groups: use WikiData peaks when available, otherwise manual seeds.
  // When WikiData peaks exist, they replace the manual seeds entirely — the manual
  // seeds were approximations that the real peak data supersedes.
  console.log('\nBuilding seed groups...');
  const seedGroups: Array<ReadonlyArray<readonly [number, number]>> = [];
  for (const range of RANGES) {
    const wdSeeds = wikidataPeaks.get(range.id);
    if (wdSeeds && wdSeeds.length > 0) {
      seedGroups.push(wdSeeds.map(([lng, lat]) => geoToPixel(lng, lat)));
      console.log(`  ${range.name}: ${wdSeeds.length} WikiData seed(s)`);
    } else {
      seedGroups.push(range.seeds.map(s => geoToPixel(s[0], s[1])));
      console.log(`  ${range.name}: ${range.seeds.length} manual seed(s)`);
    }
  }

  // Compute Voronoi partition: each pixel is assigned to its nearest range seed.
  // Ranges with multiple seeds get a larger Voronoi cell (all seeds map to same index).
  console.log('\nComputing Voronoi partition from seed points...');
  const voronoi = computeVoronoi(seedGroups);
  console.log('  Done.');

  const header = 'id,name,name_alternates,continent,paths,latitude,longitude,peak_elevation_m,length_km,area_km2,highest_peak';
  const rows: Array<string> = [header];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < RANGES.length; i++) {
    const range = RANGES[i];
    console.log(`\n[${i + 1}/${RANGES.length}] ${range.name}...`);

    // Pick the seed with the highest elevation for flood-fill start
    // Use the actual seed group (which may be WikiData peaks or manual seeds)
    const seeds = seedGroups[i];
    let bestSeedPx = 0;
    let bestSeedPy = 0;
    let bestSeedElev = -Infinity;
    for (const [px, py] of seeds) {
      const elev = dem[py * DS_WIDTH + px];
      if (elev > bestSeedElev) {
        bestSeedElev = elev;
        bestSeedPx = px;
        bestSeedPy = py;
      }
    }
    console.log(`  Seed pixel: (${bestSeedPx}, ${bestSeedPy}), elevation at seed: ${bestSeedElev.toFixed(0)}m (${seeds.length} seed(s))`);
    const radius = range.radius ?? 0;
    console.log(`  Threshold: ${range.threshold}m, radius: ${radius}px`);

    // Flood fill constrained by Voronoi partition
    const filled = floodFill(dem, voronoi, i, bestSeedPx, bestSeedPy, range.threshold, radius);
    console.log(`  Flood fill: ${filled.size} pixels`);

    if (filled.size === 0) {
      console.warn(`  WARNING: No pixels filled for ${range.name}! Skipping.`);
      failCount++;
      continue;
    }

    // Keep largest connected component
    const largest = largestComponent(filled);
    if (largest.size < filled.size) {
      console.log(`  Largest component: ${largest.size} pixels (dropped ${filled.size - largest.size} disconnected)`);
    }

    // Extract boundary
    // Compute tight bounds from the filled pixels for boundary extraction
    let fMinPx = DS_WIDTH, fMaxPx = 0, fMinPy = DS_HEIGHT, fMaxPy = 0;
    for (const idx of largest) {
      const py = Math.floor(idx / DS_WIDTH);
      const px = idx % DS_WIDTH;
      if (px < fMinPx) fMinPx = px;
      if (px > fMaxPx) fMaxPx = px;
      if (py < fMinPy) fMinPy = py;
      if (py > fMaxPy) fMaxPy = py;
    }
    const polygons = extractBoundary(largest, fMinPx, fMaxPx, fMinPy, fMaxPy);
    console.log(`  Extracted ${polygons.length} boundary polygon(s)`);

    if (polygons.length === 0) {
      console.warn(`  WARNING: No boundary extracted for ${range.name}! Skipping.`);
      failCount++;
      continue;
    }

    // Simplify polygons and convert to SVG paths
    const epsilon = 0.05; // degrees (~5.5km at equator)
    const svgPaths: Array<string> = [];

    for (const poly of polygons) {
      const simplified = douglasPeucker(poly, epsilon);
      if (simplified.length >= 3) {
        svgPaths.push(polygonToSvgPath(simplified));
      }
    }

    if (svgPaths.length === 0) {
      console.warn(`  WARNING: All polygons simplified to nothing for ${range.name}!`);
      failCount++;
      continue;
    }

    // Take the longest path (most vertices = most detail = main outline)
    // Plus any secondary paths that are significant (>20% of main)
    svgPaths.sort((a, b) => b.length - a.length);
    const mainPath = svgPaths[0];
    const significantPaths = [mainPath];
    for (let j = 1; j < svgPaths.length; j++) {
      if (svgPaths[j].length > mainPath.length * 0.2) {
        significantPaths.push(svgPaths[j]);
      }
    }

    const pathStr = significantPaths.join('|');
    console.log(`  SVG path: ${pathStr.length} chars, ${significantPaths.length} path(s)`);

    const fields = [
      range.id,
      escapeCSVField(range.name),
      escapeCSVField(range.nameAlternates),
      range.continent,
      escapeCSVField(pathStr),
      range.latitude.toFixed(1),
      range.longitude.toFixed(1),
      String(range.peakElevationM),
      String(range.lengthKm),
      String(range.areaKm2),
      escapeCSVField(range.highestPeak),
    ];
    rows.push(fields.join(','));
    successCount++;
  }

  const csv = rows.join('\n') + '\n';

  const outPath = resolve('public/data/mountains/world-mountain-ranges.csv');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, csv, 'utf-8');

  console.log(`\nWrote ${successCount} mountain ranges to ${outPath}`);
  console.log(`CSV size: ${csv.length} bytes`);
  if (failCount > 0) {
    console.warn(`${failCount} range(s) failed to generate polygons`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
