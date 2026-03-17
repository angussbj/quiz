import type { QuizDataRow } from './QuizDataRow';
import { parseCsv } from './parseCsv';

/**
 * Fetch a CSV file from a URL path and parse it into QuizDataRow objects.
 * The path should be relative to the public directory root (e.g., "/data/geography/capitals/europe.csv").
 */
export async function fetchQuizData<K extends string = string>(
  dataPath: string,
): Promise<ReadonlyArray<QuizDataRow<K>>> {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch quiz data from ${dataPath}: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new Error(`Quiz data not found at ${dataPath} (received HTML instead of CSV)`);
  }
  const csvText = await response.text();
  const records = parseCsv(csvText);
  return records as ReadonlyArray<QuizDataRow<K>>;
}
