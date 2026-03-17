import type { MapElement } from './MapElement';
import { projectGeo } from './projectGeo';

const DOT_RADIUS = 0.3;

export function buildMapElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<MapElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  return rows.map((row) => {
    const lat = parseFloat(row['latitude'] ?? '0');
    const lng = parseFloat(row['longitude'] ?? '0');
    const center = projectGeo({ latitude: lat, longitude: lng });

    const id = row['id'] ?? '';
    return {
      id,
      label: row[labelColumn] ?? id,
      geoCoordinates: { latitude: lat, longitude: lng },
      viewBoxCenter: center,
      viewBoxBounds: {
        minX: center.x - DOT_RADIUS,
        minY: center.y - DOT_RADIUS,
        maxX: center.x + DOT_RADIUS,
        maxY: center.y + DOT_RADIUS,
      },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      svgPathData: row['paths'] ?? '',
      code: row['code'] ?? id,
    };
  });
}
