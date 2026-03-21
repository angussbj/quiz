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

/**
 * Merge territory rows into their sovereign parent rows by appending paths.
 * Territories are identified by a non-empty `sovereign_parent` column whose value
 * matches the `name` column of another row. Territory rows are removed from the
 * output; their paths are pipe-appended to the parent's `paths` column.
 *
 * If the parent row is not present (e.g. filtered out by region), the territory
 * row is kept as-is (it won't merge into nothing).
 */
function mergeTerritoryRows(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
): ReadonlyArray<Readonly<Record<string, string>>> {
  // Quick check: if no sovereign_parent column exists, return rows unchanged
  if (rows.length === 0 || !('sovereign_parent' in rows[0])) return rows;

  const parentNameToIndex = new Map<string, number>();
  const mergedRows: Array<Record<string, string>> = [];

  // First pass: index sovereign (parent) rows
  for (const row of rows) {
    const index = mergedRows.length;
    mergedRows.push({ ...row });
    if (!row['sovereign_parent']) {
      parentNameToIndex.set(row['name'], index);
    }
  }

  // Second pass: merge territory paths into parents and mark for removal.
  // Territories whose parent is not in the row set are also removed (orphan
  // territories like Antarctica/Western Sahara shouldn't become quiz elements).
  const indicesToRemove = new Set<number>();
  for (let i = 0; i < mergedRows.length; i++) {
    const parentName = mergedRows[i]['sovereign_parent'];
    if (!parentName) continue;
    const parentIndex = parentNameToIndex.get(parentName);
    if (parentIndex !== undefined) {
      const territoryPaths = mergedRows[i]['paths'] ?? '';
      if (territoryPaths.trim()) {
        const parentPaths = mergedRows[parentIndex]['paths'] ?? '';
        mergedRows[parentIndex]['paths'] = parentPaths
          ? `${parentPaths}|${territoryPaths}`
          : territoryPaths;
      }
    }
    // Remove all territory rows — either merged into parent or orphaned
    indicesToRemove.add(i);
  }

  // Also remove non-sovereign rows without a sovereign_parent (e.g. Antarctica,
  // Western Sahara) — these have is_sovereign !== 'true' and empty sovereign_parent.
  for (let i = 0; i < mergedRows.length; i++) {
    if (indicesToRemove.has(i)) continue;
    if (mergedRows[i]['is_sovereign'] !== 'true' && 'sovereign_parent' in mergedRows[i]) {
      indicesToRemove.add(i);
    }
  }

  if (indicesToRemove.size === 0) return rows;
  return mergedRows.filter((_, i) => !indicesToRemove.has(i));
}

export function buildMapElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<MapElement> {
  const mergedRows = mergeTerritoryRows(rows);
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];
  const codeColumn = columnMappings['code'] ?? 'code';
  const pathStyle = columnMappings['pathRenderStyle'] as 'fill' | 'stroke' | undefined;

  return mergedRows.map((row) => {
    const lat = parseFloat(row['latitude'] ?? '0');
    const lng = parseFloat(row['longitude'] ?? '0');
    const center = projectGeo({ latitude: lat, longitude: lng });
    const svgPathData = (row['paths'] ?? '').split('|').map((s) => wrapPathCoordinates(s.trim())).filter(Boolean).join(' ');

    // For elements with SVG path data, compute bounds from the largest path
    // segment only. This prevents far-flung territories (or secondary landmasses
    // like Alaska/Hawaii) from expanding viewBoxBounds and causing the camera
    // to zoom out too far during putInView.
    const bounds = svgPathData
      ? computeLargestPathBounds(svgPathData)
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
    const tributaryOf = row['tributary_of'] || undefined;
    const distributaryOf = row['distributary_of'] || undefined;
    const segmentOf = row['segment_of'] || undefined;
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
      code: row[codeColumn] ?? '',
      pathRenderStyle: pathStyle,
      labelAnchor,
      tributaryOf,
      distributaryOf,
      segmentOf,
    };
  });
}

type Bounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/** Extract bounding box from SVG path coordinates. */
function computePathBounds(svgPathData: string): Bounds {
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

function boundsArea(b: Bounds): number {
  return (b.maxX - b.minX) * (b.maxY - b.minY);
}

/**
 * Find the bounding box of the largest individual subpath (by area) in a
 * combined SVG path string. Each subpath starts with 'M'. This focuses
 * camera framing on the main landmass rather than distant islands/territories.
 */
function computeLargestPathBounds(svgPathData: string): Bounds {
  const subpaths = svgPathData.split(/(?=M\s)/).filter((s) => s.trim());
  if (subpaths.length <= 1) return computePathBounds(svgPathData);

  let largestBounds = computePathBounds(subpaths[0]);
  let largestArea = boundsArea(largestBounds);

  for (let i = 1; i < subpaths.length; i++) {
    const b = computePathBounds(subpaths[i]);
    const a = boundsArea(b);
    if (a > largestArea) {
      largestBounds = b;
      largestArea = a;
    }
  }

  return largestBounds;
}
