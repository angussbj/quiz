import type { ViewBoxPosition } from '../VisualizationElement';

/**
 * Parse an SVG path `d` string (M/L commands only) into an array of points.
 * Our river and border paths use only absolute M and L commands.
 */
function parsePathPoints(svgPathData: string): ReadonlyArray<ViewBoxPosition> {
  const points: Array<ViewBoxPosition> = [];
  const numbers = svgPathData.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers) return points;

  for (let i = 0; i < numbers.length - 1; i += 2) {
    points.push({
      x: parseFloat(numbers[i]),
      y: parseFloat(numbers[i + 1]),
    });
  }
  return points;
}

/**
 * Find the closest point on a line segment to a given point.
 * Returns the projected point and the squared distance to it.
 */
function closestPointOnSegment(
  point: ViewBoxPosition,
  segStart: ViewBoxPosition,
  segEnd: ViewBoxPosition,
): { readonly closest: ViewBoxPosition; readonly distanceSq: number } {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Degenerate segment (start === end)
    const ex = point.x - segStart.x;
    const ey = point.y - segStart.y;
    return { closest: segStart, distanceSq: ex * ex + ey * ey };
  }

  // Project point onto the infinite line, clamped to [0, 1] for the segment
  const t = Math.max(0, Math.min(1,
    ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lengthSq,
  ));

  const closest: ViewBoxPosition = {
    x: segStart.x + t * dx,
    y: segStart.y + t * dy,
  };

  const ex = point.x - closest.x;
  const ey = point.y - closest.y;
  return { closest, distanceSq: ex * ex + ey * ey };
}

/**
 * Find the closest point on an SVG path to a given position.
 * The path is treated as a polyline (sequence of M/L segments).
 * Multiple subpaths (separated by M commands) are all considered.
 *
 * Returns the closest point in viewBox coordinates, or undefined if the path has no segments.
 */
export function closestPointOnPath(
  point: ViewBoxPosition,
  svgPathData: string,
): ViewBoxPosition | undefined {
  const points = parsePathPoints(svgPathData);
  if (points.length < 2) return points[0];

  let bestClosest: ViewBoxPosition | undefined;
  let bestDistanceSq = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const { closest, distanceSq } = closestPointOnSegment(point, points[i], points[i + 1]);
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestClosest = closest;
    }
  }

  return bestClosest;
}
