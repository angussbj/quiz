import { type ZodType } from 'zod';
import { parseCsv } from './parseCsv';

/**
 * Parse CSV text and validate each row against a zod schema.
 *
 * Rows that fail validation are omitted from the result and a warning
 * is logged to the console with the row index and error details.
 *
 * @throws Error if the CSV has no header row or no "id" column.
 */
export function loadQuizData<T>(
  csvText: string,
  schema: ZodType<T>,
): ReadonlyArray<T> {
  const records = parseCsv(csvText);

  if (records.length === 0) {
    return [];
  }

  const firstRecord = records[0];
  if (!('id' in firstRecord)) {
    throw new Error('CSV must have an "id" column in the header row');
  }

  const rows: Array<T> = [];
  for (let i = 0; i < records.length; i++) {
    const result = schema.safeParse(records[i]);
    if (result.success) {
      rows.push(result.data);
    } else {
      const csvRow = i + 2; // +1 for header, +1 for 1-indexed
      const issues = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      console.warn(`CSV row ${csvRow}: validation failed — ${issues}`);
    }
  }

  return rows;
}
