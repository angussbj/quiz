/**
 * Generate world-mountain-ranges.csv with ~63 major mountain ranges.
 *
 * Each range includes metadata (elevation, length, area, highest peak) and
 * an SVG polygon path in equirectangular projection (x = longitude, y = −latitude).
 *
 * Polygons are derived from DEM elevation data using flood-fill from a seed
 * point within each range. The algorithm:
 * 1. Load the ETOPO 2022 DEM and downsample to ~0.1° resolution (3600×1800)
 * 2. For each range, BFS flood-fill from the seed pixel where elevation >= threshold
 * 3. Extract the boundary using marching squares
 * 4. Simplify with Douglas-Peucker
 * 5. Convert to SVG path (x=lng, y=-lat, closed with Z)
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
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface RangeDefinition {
  readonly id: string;
  readonly name: string;
  readonly nameAlternates: string;
  readonly continent: string;
  readonly seed: readonly [number, number]; // [lng, lat]
  readonly threshold: number; // minimum elevation in meters
  readonly bounds: {
    readonly minLng: number;
    readonly maxLng: number;
    readonly minLat: number;
    readonly maxLat: number;
  };
  readonly latitude: number;
  readonly longitude: number;
  readonly peakElevationM: number;
  readonly lengthKm: number;
  readonly areaKm2: number;
  readonly highestPeak: string;
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
// Flood fill
// ------------------------------------------------------------------

/**
 * BFS flood-fill from a seed pixel. Returns a Set of pixel indices
 * where elevation >= threshold and within the bounding box.
 */
function floodFill(
  dem: Float32Array,
  seedPx: number,
  seedPy: number,
  threshold: number,
  boundsMinPx: number,
  boundsMaxPx: number,
  boundsMinPy: number,
  boundsMaxPy: number,
): Set<number> {
  const filled = new Set<number>();
  const seedIdx = seedPy * DS_WIDTH + seedPx;

  // Verify seed is above threshold
  if (dem[seedIdx] < threshold) {
    // Try to find a nearby pixel above threshold
    let bestIdx = seedIdx;
    let bestElev = dem[seedIdx];
    const searchRadius = 5;
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        const nx = seedPx + dx;
        const ny = seedPy + dy;
        if (nx < boundsMinPx || nx > boundsMaxPx || ny < boundsMinPy || ny > boundsMaxPy) continue;
        const idx = ny * DS_WIDTH + nx;
        if (dem[idx] > bestElev) {
          bestElev = dem[idx];
          bestIdx = idx;
        }
      }
    }
    if (bestElev < threshold) {
      return filled; // No pixel above threshold nearby
    }
    filled.add(bestIdx);
    const queue = [bestIdx];
    return bfs(dem, queue, filled, threshold, boundsMinPx, boundsMaxPx, boundsMinPy, boundsMaxPy);
  }

  filled.add(seedIdx);
  const queue = [seedIdx];
  return bfs(dem, queue, filled, threshold, boundsMinPx, boundsMaxPx, boundsMinPy, boundsMaxPy);
}

function bfs(
  dem: Float32Array,
  queue: Array<number>,
  filled: Set<number>,
  threshold: number,
  boundsMinPx: number,
  boundsMaxPx: number,
  boundsMinPy: number,
  boundsMaxPy: number,
): Set<number> {
  const dx4 = [1, -1, 0, 0];
  const dy4 = [0, 0, 1, -1];

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const py = Math.floor(idx / DS_WIDTH);
    const px = idx % DS_WIDTH;

    for (let d = 0; d < 4; d++) {
      const nx = px + dx4[d];
      const ny = py + dy4[d];

      if (nx < boundsMinPx || nx > boundsMaxPx || ny < boundsMinPy || ny > boundsMaxPy) continue;

      const nIdx = ny * DS_WIDTH + nx;
      if (filled.has(nIdx)) continue;
      if (dem[nIdx] < threshold) continue;

      filled.add(nIdx);
      queue.push(nIdx);
    }
  }

  return filled;
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
// Boundary extraction via marching squares
// ------------------------------------------------------------------

/**
 * Extract boundary polygons from a filled pixel set using marching squares.
 * Returns arrays of [lng, lat] coordinates for each closed contour.
 */
function extractBoundary(
  filled: Set<number>,
  boundsMinPx: number,
  boundsMaxPx: number,
  boundsMinPy: number,
  boundsMaxPy: number,
): Array<Array<readonly [number, number]>> {
  // Build a grid representation for marching squares
  // The grid has +1 width/height to capture all boundary edges
  const gridW = boundsMaxPx - boundsMinPx + 2;
  const gridH = boundsMaxPy - boundsMinPy + 2;
  const grid = new Uint8Array(gridW * gridH);

  for (const idx of filled) {
    const py = Math.floor(idx / DS_WIDTH) - boundsMinPy;
    const px = (idx % DS_WIDTH) - boundsMinPx;
    if (px >= 0 && px < gridW && py >= 0 && py < gridH) {
      grid[py * gridW + px] = 1;
    }
  }

  // Marching squares: for each 2x2 cell, compute the case and emit edges
  // Edge vertices are placed at cell corners (between grid cells)
  type Edge = readonly [number, number, number, number]; // x1, y1, x2, y2
  const edges: Array<Edge> = [];

  for (let cy = 0; cy < gridH - 1; cy++) {
    for (let cx = 0; cx < gridW - 1; cx++) {
      const tl = grid[cy * gridW + cx];
      const tr = grid[cy * gridW + cx + 1];
      const bl = grid[(cy + 1) * gridW + cx];
      const br = grid[(cy + 1) * gridW + cx + 1];
      const caseIndex = (tl << 3) | (tr << 2) | (br << 1) | bl;

      // Cell corners in local coordinates
      const top = cy;
      const bottom = cy + 1;
      const left = cx;
      const right = cx + 1;
      const midX = cx + 0.5;
      const midY = cy + 0.5;

      switch (caseIndex) {
        case 0: case 15: break; // all same
        case 1: edges.push([left, midY, midX, bottom]); break;
        case 2: edges.push([midX, bottom, right, midY]); break;
        case 3: edges.push([left, midY, right, midY]); break;
        case 4: edges.push([midX, top, right, midY]); break;
        case 5:
          edges.push([left, midY, midX, top]);
          edges.push([midX, bottom, right, midY]);
          break;
        case 6: edges.push([midX, top, midX, bottom]); break;
        case 7: edges.push([left, midY, midX, top]); break;
        case 8: edges.push([midX, top, left, midY]); break;
        case 9: edges.push([midX, top, midX, bottom]); break;
        case 10:
          edges.push([midX, top, right, midY]);
          edges.push([left, midY, midX, bottom]);
          break;
        case 11: edges.push([midX, top, right, midY]); break;
        case 12: edges.push([left, midY, right, midY]); break;
        case 13: edges.push([right, midY, midX, bottom]); break;
        case 14: edges.push([midX, bottom, left, midY]); break;
      }
    }
  }

  // Chain edges into closed polygons
  return chainEdges(edges, boundsMinPx, boundsMinPy);
}

/**
 * Chain edge segments into closed polygons by matching endpoints.
 * Converts from grid coordinates to geographic coordinates.
 */
function chainEdges(
  edges: ReadonlyArray<readonly [number, number, number, number]>,
  offsetPx: number,
  offsetPy: number,
): Array<Array<readonly [number, number]>> {
  if (edges.length === 0) return [];

  // Build adjacency map keyed by vertex position (quantized to avoid float issues)
  const key = (x: number, y: number): string => `${Math.round(x * 2)},${Math.round(y * 2)}`;

  const adjacency = new Map<string, Array<{ readonly edge: number; readonly otherKey: string; readonly otherX: number; readonly otherY: number }>>();
  const used = new Array<boolean>(edges.length).fill(false);

  for (let i = 0; i < edges.length; i++) {
    const [x1, y1, x2, y2] = edges[i];
    const k1 = key(x1, y1);
    const k2 = key(x2, y2);

    if (!adjacency.has(k1)) adjacency.set(k1, []);
    if (!adjacency.has(k2)) adjacency.set(k2, []);

    adjacency.get(k1)!.push({ edge: i, otherKey: k2, otherX: x2, otherY: y2 });
    adjacency.get(k2)!.push({ edge: i, otherKey: k1, otherX: x1, otherY: y1 });
  }

  const polygons: Array<Array<readonly [number, number]>> = [];

  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;

    const polygon: Array<readonly [number, number]> = [];
    const [startX, startY] = [edges[i][0], edges[i][1]];

    // Walk the chain
    let currentKey = key(startX, startY);
    used[i] = true;

    // Add start point
    const [sLng, sLat] = pixelToGeo(startX + offsetPx, startY + offsetPy);
    polygon.push([sLng, sLat]);

    // Follow to the other end of first edge
    const nextKey = key(edges[i][2], edges[i][3]);
    const [nLng, nLat] = pixelToGeo(edges[i][2] + offsetPx, edges[i][3] + offsetPy);
    polygon.push([nLng, nLat]);

    currentKey = nextKey;

    // Keep walking until we return to start or get stuck
    const startKey = key(startX, startY);
    let steps = 0;
    const maxSteps = edges.length + 1;

    while (currentKey !== startKey && steps < maxSteps) {
      steps++;
      const neighbors = adjacency.get(currentKey);
      if (!neighbors) break;

      let found = false;
      for (const neighbor of neighbors) {
        if (!used[neighbor.edge]) {
          used[neighbor.edge] = true;
          const [gLng, gLat] = pixelToGeo(neighbor.otherX + offsetPx, neighbor.otherY + offsetPy);
          polygon.push([gLng, gLat]);
          currentKey = neighbor.otherKey;
          found = true;
          break;
        }
      }
      if (!found) break;
    }

    if (polygon.length >= 3) {
      polygons.push(polygon);
    }
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
    seed: [84.0, 28.5],
    threshold: 2500,
    bounds: { minLng: 72, maxLng: 98, minLat: 26, maxLat: 31.5 },
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
    seed: [76.5, 36.0],
    threshold: 3500,
    bounds: { minLng: 74, maxLng: 80, minLat: 34.5, maxLat: 37.5 },
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
    seed: [70.5, 35.5],
    threshold: 2000,
    bounds: { minLng: 66, maxLng: 75, minLat: 33, maxLat: 37.5 },
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
    seed: [73.0, 38.5],
    threshold: 3000,
    bounds: { minLng: 70, maxLng: 76, minLat: 37, maxLat: 40 },
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
    seed: [80.0, 42.0],
    threshold: 2000,
    bounds: { minLng: 69, maxLng: 91, minLat: 40, maxLat: 44 },
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
    seed: [85.0, 36.5],
    threshold: 5000,
    bounds: { minLng: 74, maxLng: 98, minLat: 35, maxLat: 38 },
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
    seed: [87.0, 49.0],
    threshold: 1000,
    bounds: { minLng: 82, maxLng: 92, minLat: 46, maxLat: 52 },
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
    seed: [59.0, 60.0],
    threshold: 300,
    bounds: { minLng: 54, maxLng: 64, minLat: 50, maxLat: 69 },
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
    seed: [43.5, 42.5],
    threshold: 1000,
    bounds: { minLng: 36, maxLng: 51, minLat: 40, maxLat: 44.5 },
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
    seed: [49.0, 32.0],
    threshold: 1200,
    bounds: { minLng: 44, maxLng: 56, minLat: 26, maxLat: 37.5 },
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
    seed: [52.0, 36.0],
    threshold: 1500,
    bounds: { minLng: 48, maxLng: 57, minLat: 34.5, maxLat: 37.5 },
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
    seed: [75.0, 14.0],
    threshold: 400,
    bounds: { minLng: 72, maxLng: 78, minLat: 8, maxLat: 21.5 },
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
    seed: [79.5, 15.5],
    threshold: 300,
    bounds: { minLng: 77, maxLng: 83, minLat: 11, maxLat: 21 },
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
    seed: [137.5, 36.2],
    threshold: 800,
    bounds: { minLng: 136, maxLng: 139, minLat: 35, maxLat: 37.5 },
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
    seed: [88.5, 38.5],
    threshold: 4500,
    bounds: { minLng: 84, maxLng: 93, minLat: 37.5, maxLat: 40 },
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
    seed: [99.0, 28.5],
    threshold: 2500,
    bounds: { minLng: 96, maxLng: 102, minLat: 25, maxLat: 33 },
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
    seed: [127.0, 56.0],
    threshold: 600,
    bounds: { minLng: 120, maxLng: 134, minLat: 54.5, maxLat: 58 },
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
    seed: [130.0, 64.0],
    threshold: 600,
    bounds: { minLng: 125, maxLng: 135, minLat: 59, maxLat: 69 },
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
    seed: [143.0, 64.0],
    threshold: 600,
    bounds: { minLng: 136, maxLng: 150, minLat: 61, maxLat: 67 },
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
    seed: [135.5, 46.0],
    threshold: 400,
    bounds: { minLng: 133, maxLng: 138, minLat: 43, maxLat: 49 },
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
    seed: [10.0, 46.5],
    threshold: 800,
    bounds: { minLng: 5, maxLng: 16.5, minLat: 43.5, maxLat: 48.5 },
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
    seed: [0.7, 42.7],
    threshold: 700,
    bounds: { minLng: -2, maxLng: 3.5, minLat: 42, maxLat: 43.5 },
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
    seed: [24.6, 45.6],
    threshold: 400,
    bounds: { minLng: 17, maxLng: 27, minLat: 44.5, maxLat: 50 },
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
    seed: [13.0, 64.5],
    threshold: 500,
    bounds: { minLng: 4, maxLng: 21, minLat: 59, maxLat: 71 },
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
    seed: [13.0, 42.0],
    threshold: 400,
    bounds: { minLng: 8, maxLng: 17, minLat: 38, maxLat: 45 },
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
    seed: [17.0, 43.5],
    threshold: 500,
    bounds: { minLng: 13, maxLng: 21, minLat: 41, maxLat: 47 },
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
    seed: [25.0, 42.8],
    threshold: 500,
    bounds: { minLng: 21, maxLng: 29, minLat: 42, maxLat: 44 },
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
    seed: [20.8, 39.5],
    threshold: 500,
    bounds: { minLng: 19.5, maxLng: 22, minLat: 37.5, maxLat: 41 },
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
    seed: [-5.0, 57.5],
    threshold: 200,
    bounds: { minLng: -7, maxLng: -3, minLat: 56, maxLat: 59 },
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
    seed: [-3.2, 37.0],
    threshold: 1200,
    bounds: { minLng: -4, maxLng: -2.3, minLat: 36.7, maxLat: 37.3 },
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
    seed: [-5.0, 43.0],
    threshold: 600,
    bounds: { minLng: -7.5, maxLng: -2, minLat: 42.3, maxLat: 43.5 },
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
    seed: [24.5, 41.5],
    threshold: 600,
    bounds: { minLng: 23, maxLng: 26.5, minLat: 40.8, maxLat: 42.3 },
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
    seed: [-114.0, 47.0],
    threshold: 1500,
    bounds: { minLng: -122, maxLng: -104, minLat: 34, maxLat: 61 },
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
    seed: [-82.3, 35.7],
    threshold: 200,
    bounds: { minLng: -86, maxLng: -68, minLat: 33, maxLat: 49 },
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
    seed: [-119.5, 37.5],
    threshold: 1500,
    bounds: { minLng: -122, maxLng: -117, minLat: 35, maxLat: 40.5 },
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
    seed: [-121.8, 45.5],
    threshold: 800,
    bounds: { minLng: -124, maxLng: -120, minLat: 41, maxLat: 49.5 },
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
    seed: [-149.0, 62.5],
    threshold: 800,
    bounds: { minLng: -155, maxLng: -143, minLat: 60.5, maxLat: 64 },
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
    seed: [-153.0, 68.5],
    threshold: 500,
    bounds: { minLng: -164, maxLng: -142, minLat: 67, maxLat: 70 },
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
    seed: [-126.5, 55.0],
    threshold: 600,
    bounds: { minLng: -132, maxLng: -122, minLat: 50, maxLat: 60 },
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
    seed: [-107.0, 26.0],
    threshold: 1500,
    bounds: { minLng: -111, maxLng: -104, minLat: 21, maxLat: 32 },
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
    seed: [-100.0, 24.5],
    threshold: 1200,
    bounds: { minLng: -102, maxLng: -98, minLat: 20, maxLat: 29 },
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
    seed: [-98.5, 17.0],
    threshold: 1000,
    bounds: { minLng: -102, maxLng: -95, minLat: 15, maxLat: 19 },
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
    seed: [-70.0, -18.0],
    threshold: 2000,
    bounds: { minLng: -80, maxLng: -64, minLat: -55, maxLat: 12 },
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
    seed: [-49.0, -26.0],
    threshold: 300,
    bounds: { minLng: -50, maxLng: -43, minLat: -29, maxLat: -22 },
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
    seed: [-44.5, -22.5],
    threshold: 600,
    bounds: { minLng: -47, maxLng: -42, minLat: -24, maxLat: -21 },
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
    seed: [-63.0, 4.5],
    threshold: 500,
    bounds: { minLng: -68, maxLng: -57, minLat: 1, maxLat: 8 },
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
    seed: [-77.5, -9.2],
    threshold: 3500,
    bounds: { minLng: -78.5, maxLng: -76.5, minLat: -10.5, maxLat: -8 },
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
    seed: [-68.0, -16.0],
    threshold: 3800,
    bounds: { minLng: -69.5, maxLng: -66.5, minLat: -18, maxLat: -14.5 },
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
    seed: [-73.7, 10.7],
    threshold: 1000,
    bounds: { minLng: -74.5, maxLng: -72.5, minLat: 10, maxLat: 11.5 },
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
    seed: [-72.5, -45.5],
    threshold: 800,
    bounds: { minLng: -75, maxLng: -70, minLat: -52, maxLat: -40 },
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
    seed: [-1.0, 33.5],
    threshold: 800,
    bounds: { minLng: -10, maxLng: 10, minLat: 30, maxLat: 37 },
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
    seed: [38.0, 10.5],
    threshold: 1500,
    bounds: { minLng: 33, maxLng: 43, minLat: 6, maxLat: 16 },
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
    seed: [29.8, 0.2],
    threshold: 1500,
    bounds: { minLng: 29, maxLng: 30.5, minLat: -1, maxLat: 1.5 },
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
    seed: [28.5, -29.5],
    threshold: 1200,
    bounds: { minLng: 26, maxLng: 31, minLat: -32, maxLat: -28 },
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
    seed: [5.5, 23.0],
    threshold: 800,
    bounds: { minLng: 3, maxLng: 8, minLat: 21, maxLat: 25 },
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
    seed: [17.0, 21.0],
    threshold: 800,
    bounds: { minLng: 15, maxLng: 19.5, minLat: 19, maxLat: 22.5 },
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
    seed: [9.5, 6.0],
    threshold: 600,
    bounds: { minLng: 8, maxLng: 11.5, minLat: 4, maxLat: 8 },
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
    seed: [36.0, -1.5],
    threshold: 1500,
    bounds: { minLng: 33, maxLng: 39, minLat: -6, maxLat: 3 },
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
    seed: [148.0, -26.0],
    threshold: 300,
    bounds: { minLng: 141, maxLng: 153, minLat: -38, maxLat: -13 },
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
    seed: [170.0, -43.5],
    threshold: 300,
    bounds: { minLng: 167, maxLng: 173, minLat: -46, maxLat: -42 },
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
    seed: [138.0, -4.2],
    threshold: 1000,
    bounds: { minLng: 135, maxLng: 141, minLat: -5.5, maxLat: -3 },
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
    seed: [148.0, -8.0],
    threshold: 800,
    bounds: { minLng: 146, maxLng: 150, minLat: -10, maxLat: -6.5 },
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
    seed: [121.0, 23.5],
    threshold: 1000,
    bounds: { minLng: 120, maxLng: 122, minLat: 22, maxLat: 25.5 },
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

  const header = 'id,name,name_alternates,continent,paths,latitude,longitude,peak_elevation_m,length_km,area_km2,highest_peak';
  const rows: Array<string> = [header];

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < RANGES.length; i++) {
    const range = RANGES[i];
    console.log(`\n[${i + 1}/${RANGES.length}] ${range.name}...`);

    // Convert seed and bounds to pixel coordinates
    const [seedPx, seedPy] = geoToPixel(range.seed[0], range.seed[1]);
    const [boundsMinPx] = geoToPixel(range.bounds.minLng, 0);
    const [boundsMaxPx] = geoToPixel(range.bounds.maxLng, 0);
    const [, boundsMinPy] = geoToPixel(0, range.bounds.maxLat); // maxLat -> minPy (north is up)
    const [, boundsMaxPy] = geoToPixel(0, range.bounds.minLat); // minLat -> maxPy

    console.log(`  Seed pixel: (${seedPx}, ${seedPy}), elevation at seed: ${dem[seedPy * DS_WIDTH + seedPx].toFixed(0)}m`);
    console.log(`  Threshold: ${range.threshold}m, bounds: px(${boundsMinPx}-${boundsMaxPx}, ${boundsMinPy}-${boundsMaxPy})`);

    // Flood fill
    const filled = floodFill(dem, seedPx, seedPy, range.threshold, boundsMinPx, boundsMaxPx, boundsMinPy, boundsMaxPy);
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
    const polygons = extractBoundary(largest, boundsMinPx, boundsMaxPx, boundsMinPy, boundsMaxPy);
    console.log(`  Extracted ${polygons.length} boundary polygon(s)`);

    if (polygons.length === 0) {
      console.warn(`  WARNING: No boundary extracted for ${range.name}! Skipping.`);
      failCount++;
      continue;
    }

    // Simplify polygons and convert to SVG paths
    const epsilon = 0.15; // degrees
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
