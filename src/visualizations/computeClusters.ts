import type { ViewBoxPosition } from './VisualizationElement';
import type { ElementCluster } from './VisualizationRendererProps';

interface ClusterableElement {
  readonly id: string;
  readonly viewBoxCenter: ViewBoxPosition;
}

function viewBoxDistance(a: ViewBoxPosition, b: ViewBoxPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function centroidOf(positions: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
  const x = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
  const y = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
  return { x, y };
}

/**
 * Greedy centroid-based clustering.
 *
 * For each seed element, we grow a cluster by repeatedly scanning unclustered
 * elements and adding any whose center is within `minScreenPixelDistance` of
 * the cluster's current centroid. After each addition the centroid is
 * recalculated and we rescan.
 *
 * Because we measure distance from the centroid (not from any member), a long
 * chain of closely-spaced elements splits into several clusters rather than
 * merging into one.
 *
 * @param screenPixelsPerViewBoxUnit  How many screen pixels correspond to one
 *   viewBox unit at the current zoom scale.
 */
export function computeClusters(
  elements: ReadonlyArray<ClusterableElement>,
  minScreenPixelDistance: number,
  screenPixelsPerViewBoxUnit: number,
): ReadonlyArray<ElementCluster> {
  const minViewBoxDistance = minScreenPixelDistance / screenPixelsPerViewBoxUnit;

  const remaining = [...elements];
  const clusters: ElementCluster[] = [];

  while (remaining.length > 0) {
    const seed = remaining.shift()!;
    const memberPositions: ViewBoxPosition[] = [seed.viewBoxCenter];
    const memberIds: string[] = [seed.id];
    let currentCentroid = seed.viewBoxCenter;

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        const candidate = remaining[i];
        if (viewBoxDistance(currentCentroid, candidate.viewBoxCenter) < minViewBoxDistance) {
          memberPositions.push(candidate.viewBoxCenter);
          memberIds.push(candidate.id);
          remaining.splice(i, 1);
          currentCentroid = centroidOf(memberPositions);
          changed = true;
        }
      }
    }

    if (memberIds.length > 1) {
      clusters.push({
        center: currentCentroid,
        elementIds: memberIds,
        count: memberIds.length,
      });
    }
  }

  return clusters;
}
