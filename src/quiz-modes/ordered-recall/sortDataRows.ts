export type MissingValuePlacement = 'exclude' | 'first' | 'last';

/**
 * Parses a CSV cell value as a number. Returns undefined for empty strings,
 * '-' sentinels, and non-numeric values. Handles scientific notation (e.g. '8.798e6').
 */
export function parseNumericValue(value: string | undefined): number | undefined {
  if (value === undefined || value === '' || value === '-') return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  return num;
}

/**
 * Sorts data rows by a numeric column for ordered recall mode.
 *
 * @param rows - The data rows to sort
 * @param column - The CSV column key to sort by
 * @param descending - If true, sort in descending order
 * @param missingValues - How to handle rows with missing/non-numeric values:
 *   - 'exclude': remove them from the result
 *   - 'first': place them before all numeric rows
 *   - 'last': place them after all numeric rows
 * @returns A new sorted array (never mutates the input)
 */
export function sortDataRows(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  column: string,
  descending: boolean,
  missingValues: MissingValuePlacement,
): ReadonlyArray<Readonly<Record<string, string>>> {
  const withValues: Array<{ readonly row: Readonly<Record<string, string>>; readonly value: number }> = [];
  const withoutValues: Array<Readonly<Record<string, string>>> = [];

  for (const row of rows) {
    const value = parseNumericValue(row[column]);
    if (value !== undefined) {
      withValues.push({ row, value });
    } else {
      withoutValues.push(row);
    }
  }

  withValues.sort((a, b) => descending ? b.value - a.value : a.value - b.value);

  const sortedWithValues = withValues.map((item) => item.row);

  switch (missingValues) {
    case 'exclude':
      return sortedWithValues;
    case 'first':
      return [...withoutValues, ...sortedWithValues];
    case 'last':
      return [...sortedWithValues, ...withoutValues];
  }
}
