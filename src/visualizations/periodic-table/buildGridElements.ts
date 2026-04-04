import type { GridElement } from './GridElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';
import { computeTrueGridPosition } from '@/quiz-definitions/quiz-specific-logic/periodicTableTrueGrid';

/**
 * Parse a cost value that may have `~` prefix (approximate) and/or `?` suffix (estimate).
 * Returns the numeric value and the marker flags.
 */
export function parseCostValue(raw: string | undefined): {
  readonly value: number | undefined;
  readonly isApproximate: boolean;
  readonly isEstimate: boolean;
} {
  if (!raw) return { value: undefined, isApproximate: false, isEstimate: false };
  const isApproximate = raw.startsWith('~');
  const isEstimate = raw.endsWith('?');
  const stripped = raw.replace(/^~/, '').replace(/\?$/, '');
  const value = parseFloat(stripped);
  if (isNaN(value)) return { value: undefined, isApproximate, isEstimate };
  return { value, isApproximate, isEstimate };
}

function extractDataColumns(
  row: Readonly<Record<string, string>>,
  keys: ReadonlyArray<string> | undefined,
): Readonly<Record<string, string>> | undefined {
  if (!keys || keys.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== '') {
      result[key] = val;
    }
  }
  return result;
}

export function buildGridElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
  dataColumnKeys?: ReadonlyArray<string>,
): ReadonlyArray<GridElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];
  const wikipediaColumn = columnMappings['wikipedia'] ?? 'wikipedia';

  return rows.map((row) => {
    const id = row['id'] ?? '';
    const rowIndex = parseInt(row['row'] ?? '0', 10);
    const colIndex = parseInt(row['column'] ?? '0', 10);
    const x = colIndex * CELL_STEP;
    const y = rowIndex * CELL_STEP;
    const { trueRow, trueColumn } = computeTrueGridPosition(rowIndex, colIndex);

    return {
      id,
      label: row[labelColumn] || id,
      row: rowIndex,
      column: colIndex,
      symbol: row['symbol'] ?? row[labelColumn]?.slice(0, 2) ?? id,
      atomicNumber: parseInt(row['atomic_number'] ?? '0', 10),
      trueRow,
      trueColumn,
      atomicWeight: row['atomic_weight'] ?? '',
      viewBoxCenter: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
      viewBoxBounds: { minX: x, minY: y, maxX: x + CELL_SIZE, maxY: y + CELL_SIZE },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      wikipediaSlug: row[wikipediaColumn] || undefined,
      dataColumns: extractDataColumns(row, dataColumnKeys),
    };
  });
}
