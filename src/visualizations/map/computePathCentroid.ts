import type { ViewBoxPosition } from '../VisualizationElement';

/**
 * Compute the centroid (center of mass) of an SVG path.
 * Parses M/L/Z commands, computes the polygon centroid using the
 * shoelace formula. Falls back to bounding box center for degenerate paths.
 *
 * Note: The polygon centroid is biased toward jagged coastlines with many
 * points. See feature task "Label Placement Optimization" for planned
 * improvements using pole of inaccessibility.
 */
export function computePathCentroid(d: string): ViewBoxPosition {
  const points = parsePathPoints(d);
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length < 3) return boundingBoxCenterFromPoints(points);

  const centroid = polygonCentroid(points);
  if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y)) {
    return boundingBoxCenterFromPoints(points);
  }
  return centroid;
}

export function parsePathPoints(d: string): ReadonlyArray<ViewBoxPosition> {
  const points: ViewBoxPosition[] = [];
  const regex = /([MLZ])\s*([-\d.]+)?\s*([-\d.]+)?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1].toUpperCase();
    if ((cmd === 'M' || cmd === 'L') && match[2] && match[3]) {
      points.push({ x: parseFloat(match[2]), y: parseFloat(match[3]) });
    }
  }
  return points;
}

function polygonCentroid(points: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) return boundingBoxCenterFromPoints(points);
  cx /= (6 * area);
  cy /= (6 * area);
  return { x: cx, y: cy };
}

/** Compute the approximate area of an SVG path polygon (absolute value). */
export function computePathArea(d: string): number {
  const points = parsePathPoints(d);
  if (points.length < 3) return 0;
  return Math.abs(shoelaceArea(points));
}

function shoelaceArea(points: ReadonlyArray<ViewBoxPosition>): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
}

function boundingBoxCenterFromPoints(points: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

/** Compute the bounding box center of an SVG path. Returns null for empty paths. */
export function computeBoundingBoxCenter(d: string): ViewBoxPosition | null {
  const points = parsePathPoints(d);
  if (points.length === 0) return null;
  return boundingBoxCenterFromPoints(points);
}

/**
 * Compute the pole of inaccessibility (center of the largest inscribed circle)
 * using the polylabel quadtree algorithm. Returns null for degenerate paths.
 * Based on Mapbox's polylabel: https://github.com/mapbox/polylabel
 */
export function computePolylabel(d: string, precision: number = 0.01): ViewBoxPosition | null {
  const points = parsePathPoints(d);
  if (points.length < 3) return null;

  const polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    points.map((p) => [p.x, p.y] as const),
  ];

  const result = polylabel(polygon, precision);
  return { x: result[0], y: result[1] };
}

/**
 * Compute the center of the largest axis-aligned rectangle that fits inside
 * an SVG path polygon. Uses a grid rasterization + histogram approach.
 * Returns null for degenerate paths.
 */
export function computeLargestInscribedRectCenter(d: string): ViewBoxPosition | null {
  const points = parsePathPoints(d);
  if (points.length < 3) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  if (width === 0 || height === 0) return null;

  const GRID = 40;
  const cellW = width / GRID;
  const cellH = height / GRID;
  const ring = points.map((p) => [p.x, p.y] as const);

  // Build binary grid: true if cell center is inside the polygon.
  const grid: ReadonlyArray<ReadonlyArray<boolean>> = Array.from({ length: GRID }, (_, r) =>
    Array.from({ length: GRID }, (_, c) =>
      isPointInsideRing(minX + (c + 0.5) * cellW, minY + (r + 0.5) * cellH, ring),
    ),
  );

  // Build heights matrix: for each cell, how many consecutive "inside" cells
  // extend upward (including this one). Used for the histogram algorithm.
  const heights: number[][] = [];
  for (let r = 0; r < GRID; r++) {
    const row: number[] = [];
    for (let c = 0; c < GRID; c++) {
      row.push(grid[r][c] ? (r > 0 ? heights[r - 1][c] + 1 : 1) : 0);
    }
    heights.push(row);
  }

  // Find largest rectangle using the "largest rectangle in histogram" algorithm.
  let bestArea = 0;
  let bestLeft = 0;
  let bestRight = 0;
  let bestTop = 0;
  let bestBottom = 0;

  for (let r = 0; r < GRID; r++) {
    const h = heights[r];
    const stack: number[] = [];
    for (let c = 0; c <= GRID; c++) {
      const curH = c < GRID ? h[c] : 0;
      while (stack.length > 0 && h[stack[stack.length - 1]] > curH) {
        const idx = stack.pop()!;
        const rectH = h[idx];
        const rectW = stack.length > 0 ? c - stack[stack.length - 1] - 1 : c;
        const area = rectH * rectW;
        if (area > bestArea) {
          bestArea = area;
          bestRight = c - 1;
          bestLeft = stack.length > 0 ? stack[stack.length - 1] + 1 : 0;
          bestBottom = r;
          bestTop = r - rectH + 1;
        }
      }
      stack.push(c);
    }
  }

  if (bestArea === 0) return null;

  const centerX = minX + ((bestLeft + bestRight) / 2 + 0.5) * cellW;
  const centerY = minY + ((bestTop + bestBottom) / 2 + 0.5) * cellH;
  return { x: centerX, y: centerY };
}

function isPointInsideRing(
  x: number, y: number,
  ring: ReadonlyArray<readonly [number, number]>,
): boolean {
  let inside = false;
  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Approximate character width relative to line height. Matches the 0.6 factor
 * used in computeDimensions for text width estimation.
 */
const CHAR_WIDTH_RATIO = 0.6;

/** Line height relative to font size. Matches computeDimensions. */
const LINE_HEIGHT_RATIO = 1.3;

/** Max characters per line before wrapping. Must match splitNameIntoLines. */
const TEXT_CLEARANCE_MAX_CHARS_PER_LINE = 12;

/**
 * Estimate how the label name will be split into lines — simplified version of
 * splitNameIntoLines from computeLabelPlacements.ts (duplicated to avoid a
 * circular dependency between the two modules).
 */
function estimateLineCount(name: string): { readonly lineCount: number; readonly longestLine: number } {
  if (name.length <= TEXT_CLEARANCE_MAX_CHARS_PER_LINE) {
    return { lineCount: 1, longestLine: name.length };
  }
  const words = name.split(' ');
  let lineCount = 1;
  let longestLine = 0;
  let currentLength = 0;
  for (const word of words) {
    const addedLength = currentLength > 0 ? 1 + word.length : word.length;
    if (currentLength > 0 && currentLength + addedLength > TEXT_CLEARANCE_MAX_CHARS_PER_LINE) {
      if (currentLength > longestLine) longestLine = currentLength;
      lineCount++;
      currentLength = word.length;
    } else {
      currentLength += addedLength;
    }
  }
  if (currentLength > longestLine) longestLine = currentLength;
  return { lineCount, longestLine };
}

/**
 * Estimate how well a text label fits inside a polygon when centered at a point.
 *
 * Raycasts in 4 directions from the center to find the polygon boundary, then
 * subtracts the estimated text half-dimensions to get the gap between each edge
 * of the text rectangle and the polygon boundary. Returns the minimum gap —
 * negative means the text overflows the shape.
 *
 * The text dimensions are estimated from the label name using the same character
 * width ratio and line wrapping rules as the actual renderer, scaled relative to
 * the polygon's bounding box height so that edge rays land at realistic positions.
 */
export function computeTextClearance(d: string, point: ViewBoxPosition, name: string): number {
  const points = parsePathPoints(d);
  if (points.length < 3) return 0;

  const { lineCount, longestLine } = estimateLineCount(name);

  // Scale text dimensions relative to the polygon's bounding box height.
  // At typical zoom the rendered font is roughly 25–35% of the polygon height;
  // using 30% keeps the edge rays inside the polygon so they can detect narrow
  // regions near the text's top/bottom edges.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const bboxHeight = maxY - minY;
  const unitSize = bboxHeight > 0 ? bboxHeight * 0.3 : 1;
  const textHalfWidth = (longestLine * CHAR_WIDTH_RATIO * unitSize) / 2;
  const textHalfHeight = (lineCount * LINE_HEIGHT_RATIO * unitSize) / 2;

  const ring = points.map((p) => [p.x, p.y] as const);

  // Cast horizontal rays at the top, center, and bottom of the text rectangle.
  // A single center ray can be fooled by irregular coastlines (e.g. Massachusetts)
  // where the polygon is wide at the center y but very narrow at the text edges.
  // Each ray computes left/right clearance independently. If an edge ray finds no
  // crossings (that text edge is outside the polygon), it's skipped — this lets
  // the center row still discriminate while edge rows add constraint when they can.
  const horizontalRayYs = [point.y - textHalfHeight, point.y, point.y + textHalfHeight];

  let minHorizontalClearance = Infinity;

  for (const rayY of horizontalRayYs) {
    let leftDist = Infinity;
    let rightDist = Infinity;
    for (let i = 0, len = ring.length; i < len; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % len];
      if (a[1] === b[1]) continue;
      const minY = Math.min(a[1], b[1]);
      const maxY = Math.max(a[1], b[1]);
      if (rayY >= minY && rayY < maxY) {
        const t = (rayY - a[1]) / (b[1] - a[1]);
        const ix = a[0] + t * (b[0] - a[0]);
        const dx = ix - point.x;
        if (dx > 0 && dx < rightDist) rightDist = dx;
        if (dx < 0 && -dx < leftDist) leftDist = -dx;
      }
    }
    // Skip rays that don't find crossings in both directions (text edge outside polygon).
    if (!Number.isFinite(leftDist) || !Number.isFinite(rightDist)) continue;
    const clearance = Math.min(leftDist - textHalfWidth, rightDist - textHalfWidth);
    if (clearance < minHorizontalClearance) minHorizontalClearance = clearance;
  }

  // Vertical raycasting from center x (for top/bottom clearance).
  let topDist = Infinity;
  let bottomDist = Infinity;
  for (let i = 0, len = ring.length; i < len; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % len];
    if (a[0] === b[0]) continue;
    const minX = Math.min(a[0], b[0]);
    const maxX = Math.max(a[0], b[0]);
    if (point.x >= minX && point.x < maxX) {
      const t = (point.x - a[0]) / (b[0] - a[0]);
      const iy = a[1] + t * (b[1] - a[1]);
      const dy = iy - point.y;
      if (dy > 0 && dy < bottomDist) bottomDist = dy;
      if (dy < 0 && -dy < topDist) topDist = -dy;
    }
  }

  if (!Number.isFinite(topDist) || !Number.isFinite(bottomDist)) return 0;
  // If no horizontal ray found valid crossings, only vertical clearance applies.
  if (!Number.isFinite(minHorizontalClearance)) {
    return Math.min(topDist - textHalfHeight, bottomDist - textHalfHeight);
  }

  return Math.min(
    minHorizontalClearance,
    topDist - textHalfHeight,
    bottomDist - textHalfHeight,
  );
}

/** Signed distance from point to polygon (negative = inside). */
function pointToPolygonDistance(
  x: number, y: number,
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): number {
  let inside = false;
  let minDistSq = Infinity;

  for (const ring of polygon) {
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const a = ring[i];
      const b = ring[j];

      if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) {
        inside = !inside;
      }

      const distSq = pointToSegmentDistanceSq(x, y, a, b);
      if (distSq < minDistSq) minDistSq = distSq;
    }
  }

  return (inside ? 1 : -1) * Math.sqrt(minDistSq);
}

function pointToSegmentDistanceSq(
  px: number, py: number,
  a: readonly [number, number],
  b: readonly [number, number],
): number {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];

  if (dx !== 0 || dy !== 0) {
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
    dx = a[0] + t * dx - px;
    dy = a[1] + t * dy - py;
  } else {
    dx = a[0] - px;
    dy = a[1] - py;
  }

  return dx * dx + dy * dy;
}

interface Cell {
  readonly x: number;
  readonly y: number;
  readonly halfSize: number;
  readonly distance: number;
  readonly maxDistance: number;
}

function createCell(
  x: number, y: number, halfSize: number,
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): Cell {
  const distance = pointToPolygonDistance(x, y, polygon);
  return { x, y, halfSize, distance, maxDistance: distance + halfSize * Math.SQRT2 };
}

function polylabel(
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  precision: number,
): readonly [number, number] {
  // Find bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of polygon[0]) {
    if (point[0] < minX) minX = point[0];
    if (point[1] < minY) minY = point[1];
    if (point[0] > maxX) maxX = point[0];
    if (point[1] > maxY) maxY = point[1];
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return [(minX + maxX) / 2, (minY + maxY) / 2];

  const initialHalfSize = cellSize / 2;

  // Insertion-sort priority queue — acceptable for simplified polygons computed once at load time.
  const queue: Cell[] = [];
  const enqueue = (cell: Cell) => {
    // Insert sorted by maxDistance descending
    let i = queue.length;
    while (i > 0 && queue[i - 1].maxDistance < cell.maxDistance) i--;
    queue.splice(i, 0, cell);
  };

  // Cover polygon with initial cells
  for (let x = minX; x < maxX; x += cellSize) {
    for (let y = minY; y < maxY; y += cellSize) {
      enqueue(createCell(x + initialHalfSize, y + initialHalfSize, initialHalfSize, polygon));
    }
  }

  // Best cell so far — start with centroid
  let bestCell = createCell(
    (minX + maxX) / 2, (minY + maxY) / 2, 0, polygon,
  );

  // Also try the polygon centroid (shoelace)
  const centroidCell = getCentroidCell(polygon);
  if (centroidCell.distance > bestCell.distance) bestCell = centroidCell;

  while (queue.length > 0) {
    const cell = queue.shift()!;

    // Update best cell if this cell is better
    if (cell.distance > bestCell.distance) bestCell = cell;

    // If this cell can't contain a better solution, skip
    if (cell.maxDistance - bestCell.distance <= precision) continue;

    // Subdivide
    const childHalfSize = cell.halfSize / 2;
    enqueue(createCell(cell.x - childHalfSize, cell.y - childHalfSize, childHalfSize, polygon));
    enqueue(createCell(cell.x + childHalfSize, cell.y - childHalfSize, childHalfSize, polygon));
    enqueue(createCell(cell.x - childHalfSize, cell.y + childHalfSize, childHalfSize, polygon));
    enqueue(createCell(cell.x + childHalfSize, cell.y + childHalfSize, childHalfSize, polygon));
  }

  return [bestCell.x, bestCell.y];
}

function getCentroidCell(
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): Cell {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const ring = polygon[0];

  for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const cross = a[0] * b[1] - b[0] * a[1];
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
    area += cross;
  }

  area /= 2;
  if (Math.abs(area) < 1e-10) {
    return createCell(ring[0][0], ring[0][1], 0, polygon);
  }

  return createCell(cx / (6 * area), cy / (6 * area), 0, polygon);
}
