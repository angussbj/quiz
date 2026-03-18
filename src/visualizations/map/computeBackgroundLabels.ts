import type { BackgroundPath } from '../VisualizationRendererProps';
import type { BackgroundLabel } from './BackgroundLabel';
import { computePathCentroid } from './computePathCentroid';

/**
 * Derive one label per unique country/group from background paths.
 * For multi-path countries (e.g., France mainland + Corsica), uses the
 * largest path segment's centroid for label placement.
 */
export function computeBackgroundLabels(
  paths: ReadonlyArray<BackgroundPath>,
): ReadonlyArray<BackgroundLabel> {
  const byGroup = new Map<string, BackgroundPath[]>();
  for (const path of paths) {
    if (!path.group) continue;
    const existing = byGroup.get(path.group);
    if (existing) {
      existing.push(path);
    } else {
      byGroup.set(path.group, [path]);
    }
  }

  const labels: BackgroundLabel[] = [];
  for (const [group, groupPaths] of byGroup) {
    const largest = groupPaths.reduce((best, current) =>
      current.svgPathData.length > best.svgPathData.length ? current : best,
    );
    labels.push({
      id: group,
      name: group,
      center: computePathCentroid(largest.svgPathData),
      code: largest.code,
    });
  }

  return labels;
}
