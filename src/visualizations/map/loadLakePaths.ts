import type { LakePath } from '../VisualizationRendererProps';
import { wrapPathCoordinates } from './projectGeo';

/**
 * Parse CSV rows into LakePath objects for map lake rendering.
 * Multiple SVG paths within a single row are separated by | (pipe).
 */
export function parseLakePaths(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  wrapLongitude?: number,
): ReadonlyArray<LakePath> {
  const result: LakePath[] = [];
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
        svgPathData: wrapLongitude !== undefined ? wrapPathCoordinates(d, wrapLongitude) : d,
      });
    }
  }
  return result;
}
