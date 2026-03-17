import type { DataFilter } from './QuizDefinition';

/**
 * Filter parsed CSV rows by matching a column against a set of allowed values.
 * Returns only rows where the column value is in the filter's values list.
 */
export function applyDataFilter(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  filter: DataFilter,
): ReadonlyArray<Readonly<Record<string, string>>> {
  const allowed = new Set(filter.values);
  return rows.filter((row) => allowed.has(row[filter.column]));
}
