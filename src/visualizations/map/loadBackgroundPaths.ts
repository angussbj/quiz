import type { BackgroundPath } from '../VisualizationRendererProps';
import { wrapPathCoordinates } from './projectGeo';

/**
 * Parse CSV rows into BackgroundPath objects for map backgrounds.
 * Multiple SVG paths within a single row are separated by | (pipe).
 *
 * @param wrapLongitude - When provided, applies antimeridian wrapping at
 *   this longitude to SVG path coordinates. Omit for raw data validation.
 */
export function parseBackgroundPaths(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  wrapLongitude?: number,
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
        svgPathData: wrapLongitude !== undefined ? wrapPathCoordinates(d, wrapLongitude) : d,
        group: row['group'] ?? row['name'],
        name: row['name'],
        code: row['code'],
        sovereign: row['sovereign'],
        region: row['region'],
      });
    }
  }
  return result;
}
