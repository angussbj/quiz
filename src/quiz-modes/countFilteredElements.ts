/** Count data rows that pass both range and group filters. */
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
