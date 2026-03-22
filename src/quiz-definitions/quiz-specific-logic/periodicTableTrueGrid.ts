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
