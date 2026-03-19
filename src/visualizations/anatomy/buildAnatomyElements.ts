import type { AnatomyElement } from './AnatomyElement';
import type { ViewBoxBounds } from '../VisualizationElement';

/**
 * Build anatomy elements from CSV rows.
 * The CSV has pre-computed x,y centroid coordinates and pipe-separated SVG path data.
 * Path coordinates are direct SVG viewBox coordinates (no projection needed).
 */
export function buildAnatomyElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<AnatomyElement> {
  const labelColumn = columnMappings['label'] ?? 'name';
  const groupColumn = columnMappings['group'];

  return rows.map((row) => {
    const id = row['id'] ?? '';
    const x = parseFloat(row['x'] ?? '0');
    const y = parseFloat(row['y'] ?? '0');
    const pathsRaw = row['paths'] ?? '';
    const svgPathData = pathsRaw.split('|').filter(Boolean).join(' ');

    const bounds = computeMultiPathBounds(pathsRaw);

    return {
      id,
      label: row[labelColumn] ?? id,
      viewBoxCenter: { x, y },
      viewBoxBounds: bounds,
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      svgPathData,
    };
  });
}

/**
 * Compute the bounding box across all pipe-separated SVG paths.
 * Scans all numeric coordinate pairs regardless of SVG command type
 * (M, L, C, Q, S, T, A, etc.).
 */
function computeMultiPathBounds(pathsRaw: string): ViewBoxBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const paths = pathsRaw.split('|');
  for (const d of paths) {
    const numbers = d.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length < 2) continue;
    for (let i = 0; i < numbers.length - 1; i += 2) {
      const x = parseFloat(numbers[i]);
      const y = parseFloat(numbers[i + 1]);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return { minX, minY, maxX, maxY };
}
