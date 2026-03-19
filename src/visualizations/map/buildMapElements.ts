import type { VisualizationElement } from '../VisualizationElement';
import type { MapElement } from './MapElement';
import { projectGeo, wrapPathCoordinates } from './projectGeo';

const DOT_RADIUS = 0.3;

const VALID_LABEL_POSITIONS = new Set(['left', 'right', 'above', 'below']);

function parseLabelPosition(raw: string | undefined): VisualizationElement['labelPosition'] {
  if (raw && VALID_LABEL_POSITIONS.has(raw)) {
    return raw as VisualizationElement['labelPosition'];
  }
  return undefined;
}

export function buildMapElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<MapElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];
  const codeColumn = columnMappings['code'] ?? 'code';
  const pathStyle = columnMappings['pathStyle'] as 'fill' | 'stroke' | undefined;

  return rows.map((row) => {
    const lat = parseFloat(row['latitude'] ?? '0');
    const lng = parseFloat(row['longitude'] ?? '0');
    const center = projectGeo({ latitude: lat, longitude: lng });
    const svgPathData = (row['paths'] ?? '').split('|').map((s) => wrapPathCoordinates(s.trim())).filter(Boolean).join(' ');

    // For stroke-style paths (rivers), compute bounds from the actual path data
    const bounds = pathStyle === 'stroke' && svgPathData
      ? computePathBounds(svgPathData)
      : {
          minX: center.x - DOT_RADIUS,
          minY: center.y - DOT_RADIUS,
          maxX: center.x + DOT_RADIUS,
          maxY: center.y + DOT_RADIUS,
        };

    const id = row['id'] ?? '';
    return {
      id,
      label: row[labelColumn] ?? id,
      geoCoordinates: { latitude: lat, longitude: lng },
      viewBoxCenter: center,
      viewBoxBounds: bounds,
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      labelPosition: parseLabelPosition(row['label_position']),
      svgPathData,
      code: row[codeColumn] ?? id,
      pathRenderStyle: pathStyle,
    };
  });
}

/** Extract bounding box from SVG path coordinates. */
function computePathBounds(svgPathData: string): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  const numbers = svgPathData.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < numbers.length; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}
