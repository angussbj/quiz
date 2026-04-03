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
 * Compute the signed distance from a point to the nearest edge of an SVG path polygon.
 * Positive = inside, negative = outside. Larger positive values mean further from edges.
 */
export function computeDistanceToEdge(d: string, point: ViewBoxPosition): number {
  const points = parsePathPoints(d);
  if (points.length < 3) return 0;
  const polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    points.map((p) => [p.x, p.y] as const),
  ];
  return pointToPolygonDistance(point.x, point.y, polygon);
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
