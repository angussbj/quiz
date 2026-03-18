import type { BackgroundPath } from '@/visualizations/VisualizationRendererProps';

/**
 * Parse border CSV rows into BackgroundPath objects for renderers.
 *
 * Expected CSV columns: id, name, region, group, paths (region is used for filtering, not by this function)
 * The `paths` column contains one or more SVG path `d` strings separated by `|`.
 * Multi-path rows produce one BackgroundPath per segment, with IDs like `france-0`, `france-1`.
 * Single-path rows use the row ID directly (e.g., `france`).
 */
export function parseBackgroundPaths(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
): ReadonlyArray<BackgroundPath> {
  const result: Array<BackgroundPath> = [];

  for (const row of rows) {
    const rowId = row['id'];
    const group = row['group'] ?? row['name'];
    const name = row['name'];
    const code = row['code'];
    const pathsRaw = row['paths'] ?? '';

    if (!rowId || !pathsRaw) continue;

    const segments = pathsRaw.split('|');

    if (segments.length === 1) {
      result.push({
        id: rowId,
        svgPathData: segments[0].trim(),
        group,
        name,
        code,
        sovereign: row['sovereign'],
        region: row['region'],
      });
    } else {
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i].trim();
        if (!segment) continue;
        result.push({
          id: `${rowId}-${i}`,
          svgPathData: segment,
          group,
          name,
          code,
        });
      }
    }
  }

  return result;
}
