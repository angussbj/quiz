/**
 * Computes "true" 32-column grid positions for the periodic table.
 *
 * The standard 18-column periodic table places lanthanides (period 6) and
 * actinides (period 7) in separate rows below the main grid. In the extended
 * 32-column layout, these f-block elements are inserted inline between the
 * s-block (groups 1–2) and d-block (groups 3–12).
 *
 * This gives correct Manhattan distances through the grid — e.g. Lutetium
 * (true_col 16) is directly below Yttrium (true_col 16), and Lanthanum
 * (true_col 2) sits beside Barium (true_col 1).
 *
 * Used only for periodic table locate mode distance/path calculations.
 */

export interface TrueGridPosition {
  readonly trueRow: number;
  readonly trueColumn: number;
}

/**
 * Convert a CSV (row, column) position to the 32-column "true" grid position.
 *
 * - Lanthanides (CSV row 8) → true row 5 (period 6), columns unchanged (already 2–16).
 * - Actinides  (CSV row 9) → true row 6 (period 7), columns unchanged (already 2–16).
 * - All other elements with column ≥ 2: shift column by +14 to make room for f-block.
 * - s-block elements (columns 0–1): no column shift.
 */
export function computeTrueGridPosition(csvRow: number, csvColumn: number): TrueGridPosition {
  if (csvRow === 8) return { trueRow: 5, trueColumn: csvColumn };
  if (csvRow === 9) return { trueRow: 6, trueColumn: csvColumn };
  return {
    trueRow: csvRow,
    trueColumn: csvColumn < 2 ? csvColumn : csvColumn + 14,
  };
}

/**
 * Manhattan distance between two positions in the 32-column true grid.
 */
export function computeTrueGridManhattanDistance(
  a: TrueGridPosition,
  b: TrueGridPosition,
): number {
  return Math.abs(a.trueRow - b.trueRow) + Math.abs(a.trueColumn - b.trueColumn);
}

/**
 * Inverse of computeTrueGridPosition: convert a 32-column true-grid position
 * back to the CSV (row, column) used in the visual layout.
 *
 * - Period 6 f-block (trueRow 5, trueCols 2–16): → CSV row 8 (lanthanide row).
 * - Period 7 f-block (trueRow 6, trueCols 2–16): → CSV row 9 (actinide row).
 * - s-block (trueCols 0–1): no column shift.
 * - d/p-block (trueCols 17–31): shift column by −14.
 */
export function trueToVisualPosition(trueRow: number, trueColumn: number): { readonly row: number; readonly column: number } {
  if ((trueRow === 5 || trueRow === 6) && trueColumn >= 2 && trueColumn <= 16) {
    return { row: trueRow === 5 ? 8 : 9, column: trueColumn };
  }
  if (trueColumn <= 1) {
    return { row: trueRow, column: trueColumn };
  }
  return { row: trueRow, column: trueColumn - 14 };
}

/**
 * Compute the Manhattan path through the 32-column true grid, as a sequence
 * of visual (csvRow, csvCol) positions. The horizontal leg is always placed
 * at the bottom (larger row) so the path forms an L or backwards-L shape.
 * Includes both endpoints.
 */
/**
 * Check whether a true-grid position is "real" — its visual position round-trips
 * back to the same true position. Phantom positions (e.g. true col 14 in period 2,
 * which maps to visual col 0 but visual col 0 maps back to true col 0) are skipped.
 */
function isRealTruePosition(trueRow: number, trueColumn: number): boolean {
  const visual = trueToVisualPosition(trueRow, trueColumn);
  const roundTrip = computeTrueGridPosition(visual.row, visual.column);
  return roundTrip.trueRow === trueRow && roundTrip.trueColumn === trueColumn;
}

export function computeTrueGridPath(
  from: TrueGridPosition,
  to: TrueGridPosition,
): ReadonlyArray<{ readonly row: number; readonly column: number }> {
  const path: Array<{ readonly row: number; readonly column: number }> = [];
  let { trueRow, trueColumn } = from;

  path.push(trueToVisualPosition(trueRow, trueColumn));

  const colStep = to.trueColumn > trueColumn ? 1 : to.trueColumn < trueColumn ? -1 : 0;
  const rowStep = to.trueRow > trueRow ? 1 : to.trueRow < trueRow ? -1 : 0;

  // Place horizontal leg at the bottom: vertical first when going down,
  // horizontal first when going up.
  const verticalFirst = from.trueRow <= to.trueRow;

  const addStep = (r: number, c: number) => {
    // Skip phantom positions that don't round-trip correctly
    if (isRealTruePosition(r, c)) {
      path.push(trueToVisualPosition(r, c));
    }
  };

  if (verticalFirst) {
    while (trueRow !== to.trueRow) {
      trueRow += rowStep;
      addStep(trueRow, trueColumn);
    }
    while (trueColumn !== to.trueColumn) {
      trueColumn += colStep;
      addStep(trueRow, trueColumn);
    }
  } else {
    while (trueColumn !== to.trueColumn) {
      trueColumn += colStep;
      addStep(trueRow, trueColumn);
    }
    while (trueRow !== to.trueRow) {
      trueRow += rowStep;
      addStep(trueRow, trueColumn);
    }
  }

  return path;
}
