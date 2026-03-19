import type { DataFilter } from './QuizDefinition';

/**
 * Apply a single filter: keep rows where the column value matches any allowed value.
 * Supports pipe-separated multi-values in cells (e.g., "Europe|Asia").
 */
function applySingleFilter(
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

/**
 * Filter parsed CSV rows by one or more column filters.
 * A single DataFilter or an array of DataFilters can be provided.
 * Multiple filters are applied with AND logic (each filter narrows the result).
 */
export function applyDataFilter(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  filter: DataFilter | ReadonlyArray<DataFilter>,
): ReadonlyArray<Readonly<Record<string, string>>> {
  const filters = Array.isArray(filter) ? filter : [filter];
  let result = rows;
  for (const f of filters) {
    result = applySingleFilter(result, f);
  }
  return result;
}
