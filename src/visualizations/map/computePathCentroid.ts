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
  if (points.length < 3) return boundingBoxCenter(points);

  const centroid = polygonCentroid(points);
  if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y)) {
    return boundingBoxCenter(points);
  }
  return centroid;
}

function parsePathPoints(d: string): ReadonlyArray<ViewBoxPosition> {
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
  if (Math.abs(area) < 1e-10) return boundingBoxCenter(points);
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

function boundingBoxCenter(points: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
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
