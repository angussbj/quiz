import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundPath } from '../VisualizationRendererProps';
import type { BackgroundLabel } from './BackgroundLabel';
import { computePathCentroid, computePathArea, computePolylabel, computeBoundingBoxCenter, computeDistanceToEdge } from './computePathCentroid';

/**
 * Derive one label per unique country from background paths.
 * Groups by path.name (the country name), not path.group (the subregion).
 * For multi-path countries (e.g., France mainland + Corsica), uses the
 * largest path segment's centroid for label placement.
 * Includes approximate area for importance ranking.
 */
export function computeBackgroundLabels(
  paths: ReadonlyArray<BackgroundPath>,
): ReadonlyArray<BackgroundLabel> {
  const byName = new Map<string, BackgroundPath[]>();
  for (const path of paths) {
    const key = path.name ?? path.group;
    if (!key) continue;
    const existing = byName.get(key);
    if (existing) {
      existing.push(path);
    } else {
      byName.set(key, [path]);
    }
  }

  const labels: BackgroundLabel[] = [];
  for (const [name, namePaths] of byName) {
    // Find the largest path and compute total area across all segments
    let largest = namePaths[0];
    let largestArea = 0;
    let totalArea = 0;
    for (const path of namePaths) {
      const pathArea = computePathArea(path.svgPathData);
      totalArea += pathArea;
      if (pathArea > largestArea) {
        largestArea = pathArea;
        largest = path;
      }
    }
    const centroid = computePathCentroid(largest.svgPathData);
    const bboxCenter = computeBoundingBoxCenter(largest.svgPathData);
    const polylabelCenter = computePolylabel(largest.svgPathData);
    // Sort centers by distance to nearest polygon edge (furthest inside first).
    // This usually picks polylabel but adapts for shapes where another center
    // happens to sit deeper inside (e.g., wide/narrow or irregular polygons).
    const centers = [polylabelCenter, bboxCenter, centroid]
      .filter((c): c is ViewBoxPosition => c !== null)
      .sort((a, b) =>
        computeDistanceToEdge(largest.svgPathData, b) - computeDistanceToEdge(largest.svgPathData, a),
      );
    labels.push({
      id: name,
      name,
      center: centroid,
      centers: centers.length > 0 ? centers : [centroid],
      code: largest.code,
      sovereign: largest.sovereign,
      area: totalArea,
      region: largest.region,
      group: largest.group,
    });
  }

  return labels;
}
