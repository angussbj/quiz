import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { GridElement } from './GridElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

export function buildGridElements(
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<GridElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  return rows.map((row) => {
    const rowIndex = parseInt(row['row'] ?? '0', 10);
    const colIndex = parseInt(row['column'] ?? '0', 10);
    const x = colIndex * CELL_STEP;
    const y = rowIndex * CELL_STEP;

    return {
      id: row.id,
      label: row[labelColumn] ?? row.id,
      row: rowIndex,
      column: colIndex,
      symbol: row['symbol'] ?? row[labelColumn]?.slice(0, 2) ?? row.id,
      viewBoxCenter: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
      viewBoxBounds: { minX: x, minY: y, maxX: x + CELL_SIZE, maxY: y + CELL_SIZE },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
    };
  });
}
