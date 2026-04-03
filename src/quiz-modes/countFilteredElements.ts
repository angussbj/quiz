import type { SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import { classifyMergeRows } from './classifyMergeRows';
import { computeAggregatedSortValues } from './computeAggregatedSortValues';
import { computeSortRanks } from './computeSortRanks';

/** Count data rows that pass both range and group filters (legacy CSV-column mode). */
export function countFilteredElements(
  dataRows: ReadonlyArray<Readonly<Record<string, string>>>,
  rangeColumn: string | undefined,
  rangeMin: number | undefined,
  rangeMax: number | undefined,
  rangeMaxFallback: number | undefined,
  groupFilterColumn: string | undefined,
  selectedGroups: ReadonlySet<string> | undefined,
): number {
  if (groupFilterColumn && selectedGroups && selectedGroups.size === 0) {
    return 0;
  }
  let count = 0;
  for (const row of dataRows) {
    if (rangeColumn && (rangeMin !== undefined || rangeMax !== undefined)) {
      const value = parseInt(row[rangeColumn] ?? '0', 10);
      const min = rangeMin ?? 1;
      const max = rangeMax ?? (rangeMaxFallback ?? 999);
      if (value < min || value > max) continue;
    }
    if (groupFilterColumn && selectedGroups) {
      const group = row[groupFilterColumn] ?? '';
      if (!group.split('|').some((segment) => selectedGroups.has(segment.trim()))) continue;
    }
    count++;
  }
  return count;
}

/**
 * Counts elements that pass merge, group, and sort-rank range filters.
 * Uses the same merge + aggregation + ranking pipeline as ActiveQuiz,
 * so the count is accurate even when merge toggles change sort values.
 */
export function countFilteredElementsFromElements(
  elements: ReadonlyArray<VisualizationElement>,
  dataRows: ReadonlyArray<Readonly<Record<string, string>>>,
  toggleValues: Readonly<Record<string, boolean>>,
  sortColumn: SortColumnDefinition | undefined,
  rangeMin: number | undefined,
  rangeMax: number | undefined,
  groupFilterColumn: string | undefined,
  selectedGroups: ReadonlySet<string> | undefined,
  tributaryColumn: string | undefined,
  distributaryColumn: string | undefined,
  segmentColumn: string | undefined,
  descending: boolean,
): number {
  if (groupFilterColumn && selectedGroups && selectedGroups.size === 0) {
    return 0;
  }

  // Step 1: Classify merge rows
  const { standaloneIds, mergeSourceIds } = classifyMergeRows(
    dataRows, toggleValues, tributaryColumn, distributaryColumn, segmentColumn,
  );

  // Step 2: Apply group filter to standalone rows
  const activeIds = new Set<string>();
  for (const row of dataRows) {
    const id = row['id'] ?? '';
    if (!standaloneIds.has(id)) continue;
    if (groupFilterColumn && selectedGroups) {
      const group = row[groupFilterColumn] ?? '';
      if (!group.split('|').some((seg) => selectedGroups.has(seg.trim()))) continue;
    }
    activeIds.add(id);
  }

  if (!sortColumn || (rangeMin === undefined && rangeMax === undefined)) {
    return activeIds.size;
  }

  // Step 3: Build merge map (childId → parentId) for sort value aggregation
  const dataRowById = new Map(dataRows.map((row) => [row['id'] ?? '', row]));
  const elementById = new Map(elements.map((el) => [el.id, el]));
  const mergeMap = buildMergeMap(mergeSourceIds, dataRowById, elementById, activeIds, tributaryColumn, distributaryColumn, segmentColumn);

  // Step 4: Compute aggregated sort values
  const sortValues = computeAggregatedSortValues(activeIds, mergeMap, dataRowById, sortColumn);

  // Step 5: Build temporary elements with sortValue for ranking
  const tempElements: ReadonlyArray<VisualizationElement> = [...activeIds].map((id) => {
    const el = elementById.get(id);
    return {
      id,
      sortValue: sortValues.get(id),
      label: el?.label ?? '',
      viewBoxCenter: { x: 0, y: 0 },
      viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      interactive: true,
    };
  });

  // Step 6: Rank and count (ascending=true means lowest value gets rank 1)
  const ranks = computeSortRanks(tempElements, !descending);
  const min = rangeMin ?? 1;
  const max = rangeMax ?? ranks.size;

  let count = 0;
  for (const id of activeIds) {
    const rank = ranks.get(id);
    if (rank === undefined) continue;
    if (rank >= min && rank <= max) count++;
  }
  return count;
}

/**
 * Builds a merge map: childId → resolved parentId.
 * Follows chains (e.g. tributary → tributary → main river).
 */
function buildMergeMap(
  mergeSourceIds: ReadonlySet<string>,
  dataRowById: ReadonlyMap<string, Readonly<Record<string, string>>>,
  elementById: ReadonlyMap<string, VisualizationElement>,
  activeIds: ReadonlySet<string>,
  tributaryColumn: string | undefined,
  distributaryColumn: string | undefined,
  segmentColumn: string | undefined,
): ReadonlyMap<string, string> {
  // Index elements by label for chain resolution
  const activeElementByLabel = new Map<string, string>(); // label → id
  for (const id of activeIds) {
    const el = elementById.get(id);
    if (el) activeElementByLabel.set(el.label, id);
  }
  const mergeSourceByLabel = new Map<string, { id: string; parentLabel: string }>();
  for (const id of mergeSourceIds) {
    const el = elementById.get(id);
    if (!el) continue;
    const row = dataRowById.get(id);
    if (!row) continue;
    const parentLabel = (tributaryColumn && row[tributaryColumn])
      ?? (distributaryColumn && row[distributaryColumn])
      ?? (segmentColumn && row[segmentColumn])
      ?? '';
    if (parentLabel) mergeSourceByLabel.set(el.label, { id, parentLabel });
  }

  function resolveParentId(label: string): string | undefined {
    const visited = new Set<string>();
    let current = label;
    while (!visited.has(current)) {
      visited.add(current);
      const activeId = activeElementByLabel.get(current);
      if (activeId) return activeId;
      const source = mergeSourceByLabel.get(current);
      if (!source) return undefined;
      current = source.parentLabel;
    }
    return undefined;
  }

  const mergeMapResult = new Map<string, string>();
  for (const id of mergeSourceIds) {
    const el = elementById.get(id);
    if (!el) continue;
    const row = dataRowById.get(id);
    if (!row) continue;
    const parentLabel = (tributaryColumn && row[tributaryColumn])
      ?? (distributaryColumn && row[distributaryColumn])
      ?? (segmentColumn && row[segmentColumn])
      ?? '';
    if (!parentLabel) continue;
    const parentId = resolveParentId(parentLabel);
    if (parentId) mergeMapResult.set(id, parentId);
  }

  return mergeMapResult;
}
