import type { QuizDataRow } from './QuizDataRow';
import { parseCsv } from './parseCsv';

/**
 * Parse CSV text into typed quiz data rows.
 *
 * The CSV must have a header row. One of the columns must be named "id".
 * Each row becomes a QuizDataRow with the id field set from that column
 * and all columns (including id) available as string properties.
 *
 * @throws Error if the CSV has no header row or no "id" column.
 */
export function loadQuizData<K extends string>(csvText: string): ReadonlyArray<QuizDataRow<K>> {
  const records = parseCsv(csvText);

  if (records.length === 0) {
    return [];
  }

  const firstRecord = records[0];
  if (!('id' in firstRecord)) {
    throw new Error('CSV must have an "id" column in the header row');
  }

  return records.map((record) => {
    const row = { ...record } as QuizDataRow<K>;
    return row;
  });
}
