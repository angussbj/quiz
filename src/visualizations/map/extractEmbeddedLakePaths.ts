import type { LakePath } from '../VisualizationRendererProps';
import { wrapPathCoordinates } from './projectGeo';

/**
 * Extract lake polygon subpaths embedded within stroke (river) SVG path data.
 *
 * Natural Earth embeds Z-closed lake polygon subpaths inside river path data
 * to represent lakes that rivers flow through. This function extracts those
 * polygons so they can be rendered alongside the dedicated lake CSV paths.
 */
export function extractEmbeddedLakePaths(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
): ReadonlyArray<LakePath> {
  const result: LakePath[] = [];
  for (const row of rows) {
    const id = row['id'] ?? '';
    const rawPaths = (row['paths'] ?? '').split('|');
    let lakeIndex = 0;
    for (const rawPath of rawPaths) {
      const d = rawPath.trim();
      if (!d) continue;
      const processed = wrapPathCoordinates(d);
      const subpaths = processed.split(/(?=M\s)/).filter(Boolean);
      for (const sub of subpaths) {
        const trimmed = sub.trim();
        if (trimmed.endsWith('Z')) {
          result.push({ id: `${id}-lake-${lakeIndex++}`, svgPathData: trimmed });
        }
      }
    }
  }
  return result;
}
