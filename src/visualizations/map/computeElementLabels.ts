import type { ViewBoxPosition, VisualizationElement } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { isMapElement } from './MapElement';
import { computePathCentroid, computePathArea, computePolylabel, computeBoundingBoxCenter, computeLargestInscribedRectCenter, computeTextClearance } from './computePathCentroid';

/**
 * Build BackgroundLabel objects from fill-style polygon quiz elements, so they
 * can be rendered through the same label placement system as background country labels
 * (area-based font sizing, multi-candidate positioning, collision detection).
 *
 * The label is placed on the largest sovereign-country subpath, ignoring any
 * territory paths that were merged in. mainlandSvgPathData (set by
 * buildMapElements) holds those mainland-only paths; if absent, falls back to
 * the full svgPathData. This keeps Denmark's label on Jutland rather than
 * Greenland.
 *
 * Label sizing uses the chosen subpath's area, not the multi-path total, so
 * merged territories don't inflate the rendered font.
 */
export function computeElementLabels(
  elements: ReadonlyArray<VisualizationElement>,
): ReadonlyArray<BackgroundLabel> {
  const labels: BackgroundLabel[] = [];

  for (const el of elements) {
    if (!isMapElement(el) || !el.svgPathData || el.pathRenderStyle === 'stroke') continue;

    const sourcePath = el.mainlandSvgPathData ?? el.svgPathData;
    const subpaths = sourcePath.split(/(?=M\s)/).filter((s) => s.trim());
    let labelPath = subpaths[0] ?? sourcePath;
    let labelArea = computePathArea(labelPath);
    for (let i = 1; i < subpaths.length; i++) {
      const a = computePathArea(subpaths[i]);
      if (a > labelArea) {
        labelArea = a;
        labelPath = subpaths[i];
      }
    }

    const centroid = computePathCentroid(labelPath);
    const bboxCenter = computeBoundingBoxCenter(labelPath);
    const polylabelCenter = computePolylabel(labelPath);
    const rectCenter = computeLargestInscribedRectCenter(labelPath);

    // Sort centers by text clearance (most room for estimated text rectangle first).
    const centers = [rectCenter, polylabelCenter, bboxCenter, centroid]
      .filter((c): c is ViewBoxPosition => c !== null)
      .sort((a, b) =>
        computeTextClearance(labelPath, b, el.label) - computeTextClearance(labelPath, a, el.label),
      );

    labels.push({
      id: el.id,
      name: el.label,
      center: centroid,
      centers: centers.length > 0 ? centers : [centroid],
      area: labelArea,
      group: el.group,
    });
  }

  return labels;
}
