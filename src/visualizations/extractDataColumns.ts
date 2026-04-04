/**
 * Extract a subset of CSV column values from a row, keyed by column name.
 * Only non-empty values are included. Returns undefined if no keys match.
 */
export function extractDataColumns(
  row: Readonly<Record<string, string>>,
  keys: ReadonlyArray<string> | undefined,
): Readonly<Record<string, string>> | undefined {
  if (!keys || keys.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== '') {
      result[key] = val;
    }
  }
  return result;
}
