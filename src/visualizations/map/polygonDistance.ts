import type { ViewBoxPosition } from '../VisualizationElement';

/**
 * Parse an SVG path `d` string into closed subpaths.
 * Each subpath is a sequence of points forming a closed polygon.
 * Handles M (moveto), L (lineto), and Z (closepath) commands.
 * Multiple subpaths are separated by M commands.
 */
function parseSubpaths(svgPathData: string): ReadonlyArray<ReadonlyArray<ViewBoxPosition>> {
  const subpaths: Array<Array<ViewBoxPosition>> = [];
  // Split into tokens: M, L, Z, and coordinate pairs
  const tokens = svgPathData.match(/[MLZmlz]|(-?\d+(?:\.\d+)?)/g);
  if (!tokens) return subpaths;

  let current: Array<ViewBoxPosition> = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === 'M' || token === 'm') {
      if (current.length > 0) {
        subpaths.push(current);
        current = [];
      }
      i++;
    } else if (token === 'L' || token === 'l') {
      i++;
    } else if (token === 'Z' || token === 'z') {
      if (current.length > 0) {
        subpaths.push(current);
        current = [];
      }
      i++;
    } else {
      // Coordinate pair: x followed by y
      const x = parseFloat(token);
      const nextToken = tokens[i + 1];
      if (nextToken !== undefined && /^-?\d+(?:\.\d+)?$/.test(nextToken)) {
        const y = parseFloat(nextToken);
        current.push({ x, y });
        i += 2;
      } else {
        i++;
      }
    }
  }
  if (current.length > 0) {
    subpaths.push(current);
  }
  return subpaths;
}

/**
 * Test whether a point is inside a closed polygon using the ray casting algorithm.
 * The polygon is assumed to be closed (last point connects back to first).
 */
function pointInSubpath(point: ViewBoxPosition, poly: ReadonlyArray<ViewBoxPosition>): boolean {
  const n = poly.length;
  if (n < 3) return false;
  let inside = false;
  let j = n - 1;
  for (let i = 0; i < n; i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    // Check if the ray from point rightward crosses edge (j→i)
    if ((yi > point.y) !== (yj > point.y) &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

/**
 * Find the closest point on a closed polygon edge to the given point.
 * Returns the closest point and squared distance.
 */
function closestPointOnSubpath(
  point: ViewBoxPosition,
  poly: ReadonlyArray<ViewBoxPosition>,
): { readonly closest: ViewBoxPosition; readonly distanceSq: number } {
  const n = poly.length;
  let bestClosest: ViewBoxPosition = poly[0];
  let bestDistSq = Infinity;

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n]; // Closing edge: last→first
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    let closest: ViewBoxPosition;

    if (lengthSq === 0) {
      closest = a;
    } else {
      const t = Math.max(0, Math.min(1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq,
      ));
      closest = { x: a.x + t * dx, y: a.y + t * dy };
    }

    const ex = point.x - closest.x;
    const ey = point.y - closest.y;
    const distSq = ex * ex + ey * ey;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestClosest = closest;
    }
  }

  return { closest: bestClosest, distanceSq: bestDistSq };
}

/**
 * Compute the distance from a click point to a polygon element.
 *
 * For fill-style country/region shapes:
 * - Returns `{ borderPoint: clickPoint, isInside: true }` if the click is inside
 *   any polygon subpath. The caller should use distance = 0.
 * - Returns `{ borderPoint, isInside: false }` with the closest border point
 *   (in viewBox coordinates) if the click is outside all subpaths.
 */
export function computePolygonDistance(
  clickPoint: ViewBoxPosition,
  svgPathData: string,
): { readonly borderPoint: ViewBoxPosition; readonly isInside: boolean } {
  const subpaths = parseSubpaths(svgPathData);

  // First check if we're inside any subpath
  for (const subpath of subpaths) {
    if (pointInSubpath(clickPoint, subpath)) {
      return { borderPoint: clickPoint, isInside: true };
    }
  }

  // Not inside — find the closest border point across all subpaths
  let bestBorder: ViewBoxPosition = clickPoint;
  let bestDistSq = Infinity;

  for (const subpath of subpaths) {
    if (subpath.length === 0) continue;
    const { closest, distanceSq } = closestPointOnSubpath(clickPoint, subpath);
    if (distanceSq < bestDistSq) {
      bestDistSq = distanceSq;
      bestBorder = closest;
    }
  }

  return { borderPoint: bestBorder, isInside: false };
}
