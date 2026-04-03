import { parseNumericValue } from './sortDataRows';

/**
 * Groups element IDs from sorted data rows by tied numeric values.
 * Consecutive rows with the same parsed numeric value form a tie group.
 * Rows with missing values (unparseable) are all considered tied with each other.
 *
 * Non-interactive elements are skipped without breaking groups — if elements
 * A (value=5), B (non-interactive, value=5), C (value=5) appear consecutively,
 * A and C are in the same group.
 *
 * When no sort column is provided, each element forms its own group of 1.
 *
 * @param rows - Sorted data rows
 * @param column - The sort column key (or undefined for no grouping)
 * @param interactiveIds - Set of element IDs that are interactive
 * @returns Groups of tied element IDs, in sort order
 */
export function groupByTiedValue(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  column: string | undefined,
  interactiveIds: ReadonlySet<string>,
): ReadonlyArray<ReadonlyArray<string>> {
  const groups: Array<Array<string>> = [];
  let currentGroup: Array<string> = [];
  // Track parsed value; use a sentinel symbol to distinguish "no previous value" from "previous was missing"
  let currentValue: number | undefined;
  let currentIsMissing = false;
  let hasStarted = false;

  for (const row of rows) {
    const id = row['id'] ?? '';
    if (!interactiveIds.has(id)) continue;

    if (!column) {
      // No sort column — every element is its own group
      groups.push([id]);
      continue;
    }

    const parsed = parseNumericValue(row[column]);
    const isMissing = parsed === undefined;

    if (!hasStarted) {
      currentGroup = [id];
      currentValue = parsed;
      currentIsMissing = isMissing;
      hasStarted = true;
    } else if (isMissing && currentIsMissing) {
      // Both missing — same tie group
      currentGroup.push(id);
    } else if (!isMissing && !currentIsMissing && parsed === currentValue) {
      // Same numeric value — same tie group
      currentGroup.push(id);
    } else {
      // Different value — start new group
      groups.push(currentGroup);
      currentGroup = [id];
      currentValue = parsed;
      currentIsMissing = isMissing;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}
