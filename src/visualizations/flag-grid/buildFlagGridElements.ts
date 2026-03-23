import type { FlagGridElement } from './FlagGridElement';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y, FLAG_DEFAULT_COLUMNS } from './flagGridLayout';
import { shuffle } from '@/utilities/shuffle';
import { assetPath } from '@/utilities/assetPath';

/**
 * Builds flag grid elements from CSV rows.
 * Rows are shuffled into random order and placed in a grid.
 * Each element gets a flag URL derived from the country_code column.
 * Row/column positions use FLAG_DEFAULT_COLUMNS; the renderer may
 * re-layout with a different column count based on container dimensions.
 */
export function buildFlagGridElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<FlagGridElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];
  const flagColumn = columnMappings['flag'] ?? 'country_code';

  const shuffledRows = shuffle(rows);

  return shuffledRows.map((row, index) => {
    const id = row['id'] ?? '';
    const colIndex = index % FLAG_DEFAULT_COLUMNS;
    const rowIndex = Math.floor(index / FLAG_DEFAULT_COLUMNS);
    const x = colIndex * FLAG_CELL_STEP_X;
    const y = rowIndex * FLAG_CELL_STEP_Y;
    const countryCode = row[flagColumn] ?? '';

    return {
      id,
      label: row[labelColumn] || id,
      row: rowIndex,
      column: colIndex,
      flagUrl: assetPath(`/flags/${countryCode}.svg`),
      viewBoxCenter: { x: x + FLAG_CELL_WIDTH / 2, y: y + FLAG_CELL_HEIGHT / 2 },
      viewBoxBounds: { minX: x, minY: y, maxX: x + FLAG_CELL_WIDTH, maxY: y + FLAG_CELL_HEIGHT },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      wikipediaSlug: row['wikipedia'] || undefined,
    };
  });
}
