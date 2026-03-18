import type { DataFilter } from './QuizDefinition';

/**
 * Filter parsed CSV rows by matching a column against a set of allowed values.
 * Returns only rows where the column value is in the filter's values list.
 *
 * Supports pipe-separated multi-values in cells (e.g., "Europe|Asia").
 * A row matches if any of its pipe-separated values is in the allowed set.
 */
export function applyDataFilter(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  filter: DataFilter,
): ReadonlyArray<Readonly<Record<string, string>>> {
  const allowed = new Set(filter.values);
  return rows.filter((row) => {
    const cellValue = row[filter.column];
    if (cellValue === undefined) return false;
    return cellValue.split('|').some((segment) => allowed.has(segment));
  });
}
