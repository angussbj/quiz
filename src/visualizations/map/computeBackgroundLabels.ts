import type { BackgroundPath } from '../VisualizationRendererProps';
import type { BackgroundLabel } from './BackgroundLabel';
import { computePathCentroid } from './computePathCentroid';

/**
 * Derive one label per unique country from background paths.
 * Groups by path.name (the country name), not path.group (the subregion).
 * For multi-path countries (e.g., France mainland + Corsica), uses the
 * largest path segment's centroid for label placement.
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
    const largest = namePaths.reduce((best, current) =>
      current.svgPathData.length > best.svgPathData.length ? current : best,
    );
    labels.push({
      id: name,
      name,
      center: computePathCentroid(largest.svgPathData),
      code: largest.code,
    });
  }

  return labels;
}
