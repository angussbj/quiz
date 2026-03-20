import type { MapElement } from './MapElement';
import { projectGeo, wrapPathCoordinates } from './projectGeo';

const DOT_RADIUS = 0.3;

type DirectionalLabelPosition = 'left' | 'right' | 'above' | 'below' | 'above-left' | 'above-right' | 'below-left' | 'below-right';

function isDirectionalLabelPosition(raw: string): raw is DirectionalLabelPosition {
  return raw === 'left' || raw === 'right' || raw === 'above' || raw === 'below'
    || raw === 'above-left' || raw === 'above-right' || raw === 'below-left' || raw === 'below-right';
}

function parseLabelPosition(raw: string | undefined): DirectionalLabelPosition | undefined {
  if (raw && isDirectionalLabelPosition(raw)) {
    return raw;
  }
  return undefined;
}

/**
 * Find the point at parameter t (0–1) along the stroke subpaths of an SVG path string.
 * Uses approximate arc-length parameterisation. Skips Z-closed (lake polygon) subpaths.
 */
function pointAlongStrokePaths(svgPathData: string, t: number): { x: number; y: number } | undefined {
  // Extract all coordinate pairs from stroke subpaths (non-Z-closed)
  const coords: Array<{ x: number; y: number }> = [];
  const subpaths = svgPathData.split(/(?=M\s)/).filter(Boolean);
  for (const sub of subpaths) {
    if (sub.trim().endsWith('Z')) continue; // skip lake polygons
    const numbers = sub.match(/-?\d+(?:\.\d+)?/g);
    if (!numbers) continue;
    for (let i = 0; i < numbers.length - 1; i += 2) {
      coords.push({ x: parseFloat(numbers[i]), y: parseFloat(numbers[i + 1]) });
    }
  }

  if (coords.length < 2) return undefined;

  // Compute cumulative distances
  const distances = [0];
  for (let i = 1; i < coords.length; i++) {
    const dx = coords[i].x - coords[i - 1].x;
    const dy = coords[i].y - coords[i - 1].y;
    distances.push(distances[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  const totalLength = distances[distances.length - 1];
  if (totalLength === 0) return coords[0];

  const targetDist = Math.max(0, Math.min(1, t)) * totalLength;

  for (let i = 1; i < distances.length; i++) {
    if (distances[i] >= targetDist) {
      const segLength = distances[i] - distances[i - 1];
      const frac = segLength > 0 ? (targetDist - distances[i - 1]) / segLength : 0;
      return {
        x: coords[i - 1].x + frac * (coords[i].x - coords[i - 1].x),
        y: coords[i - 1].y + frac * (coords[i].y - coords[i - 1].y),
      };
    }
  }

  return coords[coords.length - 1];
}

export function buildMapElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<MapElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];
  const codeColumn = columnMappings['code'] ?? 'code';
  const pathStyle = columnMappings['pathRenderStyle'] as 'fill' | 'stroke' | undefined;

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

    // Compute label anchor for stroke-style paths (rivers) using label_t parameter
    let labelAnchor: { x: number; y: number } | undefined;
    if (pathStyle === 'stroke' && svgPathData) {
      const labelT = parseFloat(row['label_t'] || '0.5');
      labelAnchor = pointAlongStrokePaths(svgPathData, isNaN(labelT) ? 0.5 : labelT);
    }

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
      labelAnchor,
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
