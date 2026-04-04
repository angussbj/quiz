import type { SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';
import { parseNumericValue } from './ordered-recall/sortDataRows';

/**
 * Computes aggregated sort values for active (non-merged) elements,
 * accounting for values contributed by merged children.
 *
 * @param activeIds - IDs of elements that survived filtering (parents/standalone)
 * @param mergeMap - Maps merged child ID → parent element ID
 * @param dataRowById - Maps element ID → its CSV data row
 * @param sortColumn - Which column to aggregate
 * @returns Map from active element ID → aggregated numeric value (undefined values excluded)
 */
export function computeAggregatedSortValues(
  activeIds: ReadonlySet<string>,
  mergeMap: ReadonlyMap<string, string>,
  dataRowById: ReadonlyMap<string, Readonly<Record<string, string>>>,
  sortColumn: SortColumnDefinition,
): ReadonlyMap<string, number> {
  const aggregation = sortColumn.mergeAggregation ?? 'parent';
  const result = new Map<string, number>();

  // Start with parent values
  for (const id of activeIds) {
    const row = dataRowById.get(id);
    if (!row) continue;
    const value = parseNumericValue(row[sortColumn.column]);
    if (value !== undefined) {
      result.set(id, value);
    }
  }

  if (aggregation === 'sum' && mergeMap.size > 0) {
    // Add children's values to their parent
    for (const [childId, parentId] of mergeMap) {
      if (!activeIds.has(parentId)) continue;
      const childRow = dataRowById.get(childId);
      if (!childRow) continue;
      const childValue = parseNumericValue(childRow[sortColumn.column]);
      if (childValue === undefined) continue;
      const current = result.get(parentId) ?? 0;
      result.set(parentId, current + childValue);
    }
  }

  return result;
}
