import type { ViewBoxPosition } from '../VisualizationElement';
import { closestPointOnSegment } from './closestPointOnPath';

/** Pre-parsed path data for a stroke element. */
export interface ParsedStrokePath {
  readonly elementId: string;
  readonly points: ReadonlyArray<ViewBoxPosition>;
}

/**
 * Find the closest stroke element to a given point in viewBox coordinates.
 *
 * @param point - The cursor position in viewBox coordinates
 * @param paths - Pre-parsed stroke paths to search
 * @param candidateIds - Set of element IDs to consider (filters out non-interactive elements)
 * @param maxDistanceSq - Maximum squared distance in viewBox units (for pixel threshold)
 * @returns The element ID of the closest stroke element, or undefined if none within threshold
 */
export function findClosestStrokeElement(
  point: ViewBoxPosition,
  paths: ReadonlyArray<ParsedStrokePath>,
  candidateIds: ReadonlySet<string>,
  maxDistanceSq: number,
): string | undefined {
  let bestId: string | undefined;
  let bestDistanceSq = maxDistanceSq;

  for (const path of paths) {
    if (!candidateIds.has(path.elementId)) continue;
    const { points } = path;
    if (points.length < 2) continue;

    for (let i = 0; i < points.length - 1; i++) {
      const { distanceSq } = closestPointOnSegment(point, points[i], points[i + 1]);
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestId = path.elementId;
      }
    }
  }

  return bestId;
}
