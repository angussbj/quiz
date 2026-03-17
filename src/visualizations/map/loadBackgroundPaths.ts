import type { BackgroundPath } from '../VisualizationRendererProps';

/**
 * Parse CSV rows into BackgroundPath objects for map backgrounds.
 * Multiple SVG paths within a single row are separated by | (pipe).
 */
export function parseBackgroundPaths(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
): ReadonlyArray<BackgroundPath> {
  const result: BackgroundPath[] = [];
  for (const row of rows) {
    const id = row['id'] ?? '';
    const pathsRaw = row['paths'] ?? '';
    if (!pathsRaw.trim()) continue;
    const pathSegments = pathsRaw.split('|');
    for (let i = 0; i < pathSegments.length; i++) {
      const d = pathSegments[i].trim();
      if (!d) continue;
      result.push({
        id: pathSegments.length > 1 ? `${id}-${i}` : id,
        svgPathData: d,
        group: row['group'] ?? row['name'],
      });
    }
  }
  return result;
}
