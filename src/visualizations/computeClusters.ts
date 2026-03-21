import type { ViewBoxPosition } from './VisualizationElement';
import type { ElementCluster } from './VisualizationRendererProps';

interface ClusterableElement {
  readonly id: string;
  readonly viewBoxCenter: ViewBoxPosition;
  readonly viewBoxBounds?: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
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

interface MutableCluster {
  memberPositions: ViewBoxPosition[];
  memberIds: string[];
  centroid: ViewBoxPosition;
}

/**
 * Greedy centroid-based clustering with three distance thresholds.
 *
 * Scans unclustered elements looking for a seed pair within
 * `elementElementDistance`. When one is found:
 *
 * 1. **Absorb** — iteratively pull in remaining unclustered elements within
 *    `elementClusterDistance` of the cluster centroid, recalculating the
 *    centroid after each absorption. Cluster badges are larger than element
 *    dots, so this radius is typically bigger than the seed radius.
 *
 * 2. **Merge** — iteratively merge with existing clusters whose centroids
 *    are within `clusterClusterDistance`, recalculating after each merge.
 *    Two overlapping badges look worse than two overlapping dots, so this
 *    is typically the largest radius.
 *
 * Only after absorption and merging are exhausted does the algorithm look
 * for the next seed pair. Because we measure distance from centroids (not
 * from any member), a long chain of closely-spaced elements splits into
 * several clusters rather than merging into one.
 *
 * @param screenPixelsPerViewBoxUnit  How many screen pixels correspond to one
 *   viewBox unit at the current zoom scale.
 */
export function computeClusters(
  elements: ReadonlyArray<ClusterableElement>,
  elementElementDistance: number,
  screenPixelsPerViewBoxUnit: number,
  elementClusterDistance?: number,
  clusterClusterDistance?: number,
): ReadonlyArray<ElementCluster> {
  const eeViewBox = elementElementDistance / screenPixelsPerViewBoxUnit;
  const ecViewBox = (elementClusterDistance ?? elementElementDistance) / screenPixelsPerViewBoxUnit;
  const ccViewBox = (clusterClusterDistance ?? elementClusterDistance ?? elementElementDistance) / screenPixelsPerViewBoxUnit;

  // Exclude elements whose bounding box is larger than the element-element distance.
  // A country whose entire shape fits within the cluster radius can become a badge;
  // one that doesn't is clearly visible and should render normally.
  const remaining = elements.filter((el) => {
    if (!el.viewBoxBounds) return true;
    const dx = el.viewBoxBounds.maxX - el.viewBoxBounds.minX;
    const dy = el.viewBoxBounds.maxY - el.viewBoxBounds.minY;
    return Math.sqrt(dx * dx + dy * dy) < eeViewBox;
  });
  const clusters: MutableCluster[] = [];

  // Track how many elements we've scanned without forming a cluster.
  // Once we cycle through all remaining elements, no more seeds can form.
  let scansSinceLastCluster = 0;

  while (remaining.length > 0 && scansSinceLastCluster <= remaining.length) {
    const seed = remaining.shift()!;

    // Find a partner within element-element distance to form a cluster.
    let partnerIndex = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (viewBoxDistance(seed.viewBoxCenter, remaining[i].viewBoxCenter) < eeViewBox) {
        partnerIndex = i;
        break;
      }
    }

    if (partnerIndex === -1) {
      // No partner — push back to the end so it can be absorbed later.
      remaining.push(seed);
      scansSinceLastCluster++;
      continue;
    }

    scansSinceLastCluster = 0;
    const partner = remaining.splice(partnerIndex, 1)[0];
    const cluster: MutableCluster = {
      memberPositions: [seed.viewBoxCenter, partner.viewBoxCenter],
      memberIds: [seed.id, partner.id],
      centroid: centroidOf([seed.viewBoxCenter, partner.viewBoxCenter]),
    };

    // Absorb: pull in unclustered elements within absorption distance.
    let absorbed = true;
    while (absorbed) {
      absorbed = false;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (viewBoxDistance(cluster.centroid, remaining[i].viewBoxCenter) < ecViewBox) {
          cluster.memberPositions.push(remaining[i].viewBoxCenter);
          cluster.memberIds.push(remaining[i].id);
          remaining.splice(i, 1);
          cluster.centroid = centroidOf(cluster.memberPositions);
          absorbed = true;
        }
      }
    }

    // Merge: combine with existing clusters within merge distance.
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = clusters.length - 1; i >= 0; i--) {
        if (viewBoxDistance(cluster.centroid, clusters[i].centroid) < ccViewBox) {
          cluster.memberPositions.push(...clusters[i].memberPositions);
          cluster.memberIds.push(...clusters[i].memberIds);
          cluster.centroid = centroidOf(cluster.memberPositions);
          clusters.splice(i, 1);
          merged = true;
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters.map((c) => ({
    center: c.centroid,
    elementIds: c.memberIds,
    count: c.memberIds.length,
  }));
}
