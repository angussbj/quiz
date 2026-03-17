import { parseCsv } from './parseCsv';

/**
 * Fetch a CSV file from a URL path and parse it into record objects.
 * The path should be relative to the public directory root (e.g., "/data/geography/capitals/europe.csv").
 *
 * Returns raw parsed records. Use loadQuizData with a zod schema for validated QuizDataRow objects.
 */
export async function fetchQuizData(
  dataPath: string,
): Promise<ReadonlyArray<Readonly<Record<string, string>>>> {
  const response = await fetch(dataPath);
  if (!response.ok) {
    throw new Error(`Failed to fetch quiz data from ${dataPath}: ${response.status} ${response.statusText}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('text/html')) {
    throw new Error(`Quiz data not found at ${dataPath} (received HTML instead of CSV)`);
  }
  const csvText = await response.text();
  return parseCsv(csvText);
}
