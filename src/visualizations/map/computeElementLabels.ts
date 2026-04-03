import type { ViewBoxPosition, VisualizationElement } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { isMapElement } from './MapElement';
import { computePathCentroid, computePathArea, computePolylabel, computeBoundingBoxCenter, computeDistanceToEdge } from './computePathCentroid';

/**
 * Build BackgroundLabel objects from fill-style polygon quiz elements, so they
 * can be rendered through the same label placement system as background country labels
 * (area-based font sizing, multi-candidate positioning, collision detection).
 *
 * For elements with multiple subpaths (e.g. a country whose territory paths have been
 * merged in), polylabel and centroid are computed from the largest subpath only —
 * matching the behaviour of computeBackgroundLabels for multi-path countries.
 */
export function computeElementLabels(
  elements: ReadonlyArray<VisualizationElement>,
): ReadonlyArray<BackgroundLabel> {
  const labels: BackgroundLabel[] = [];

  for (const el of elements) {
    if (!isMapElement(el) || !el.svgPathData || el.pathRenderStyle === 'stroke') continue;

    // Split combined path and use the largest subpath for label positioning.
    // Elements may have multiple subpaths (e.g. a country with merged territory paths).
    const subpaths = el.svgPathData.split(/(?=M\s)/).filter((s) => s.trim());
    let largestPath = el.svgPathData;
    let largestArea = 0;
    let totalArea = 0;
    for (const sub of subpaths) {
      const area = computePathArea(sub);
      totalArea += area;
      if (area > largestArea) {
        largestArea = area;
        largestPath = sub;
      }
    }

    const centroid = computePathCentroid(largestPath);
    const bboxCenter = computeBoundingBoxCenter(largestPath);
    const polylabelCenter = computePolylabel(largestPath);

    // Sort centers by distance to nearest polygon edge (furthest inside first).
    const centers = [polylabelCenter, bboxCenter, centroid]
      .filter((c): c is ViewBoxPosition => c !== null)
      .sort((a, b) =>
        computeDistanceToEdge(largestPath, b) - computeDistanceToEdge(largestPath, a),
      );

    labels.push({
      id: el.id,
      name: el.label,
      center: centroid,
      centers: centers.length > 0 ? centers : [centroid],
      area: totalArea,
      group: el.group,
    });
  }

  return labels;
}
