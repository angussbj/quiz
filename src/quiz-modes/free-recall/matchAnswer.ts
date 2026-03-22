
export interface NormalizeOptions {
  /** When true, whitespace differences affect matching. Default: false (whitespace stripped). */
  readonly whitespaceMatters?: boolean;
  /** When true, punctuation differences affect matching. Default: false (punctuation stripped). */
  readonly punctuationMatters?: boolean;
}

/**
 * Normalize text for fuzzy matching:
 * - Lowercase
 * - Strip diacritics/accents (é → e, ñ → n, etc.)
 * - Strip punctuation (unless punctuationMatters)
 * - Strip whitespace (unless whitespaceMatters, in which case collapse to single space)
 */
export function normalizeText(text: string, options?: NormalizeOptions): string {
  let result = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!options?.punctuationMatters) {
    result = result.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  if (options?.whitespaceMatters) {
    result = result.replace(/\s+/g, ' ').trim();
  } else {
    result = result.replace(/\s+/g, '');
  }

  return result;
}

export interface AnswerMatch {
  readonly elementId: string;
  readonly displayAnswer: string;
}

/** Returned when the typed input matches more than one remaining answer. */
export interface AmbiguousMatch {
  readonly type: 'ambiguous';
  readonly candidates: ReadonlyArray<string>;
}

/**
 * Check if user input matches any remaining answer.
 *
 * Matching rules:
 * - Case-insensitive, accent-insensitive, punctuation-stripped
 * - Checks the answer column value
 * - Checks {answerColumn}_alternates column if it exists (pipe-separated values)
 *
 * Returns the matched element, an ambiguous match when 2+ items match the same
 * input, or undefined if no match.
 */
export function matchAnswer(
  input: string,
  remainingRows: ReadonlyArray<Readonly<Record<string, string>>>,
  answerColumn: string,
  options?: NormalizeOptions,
): AnswerMatch | AmbiguousMatch | undefined {
  const normalizedInput = normalizeText(input, options);
  if (normalizedInput === '') return undefined;

  const alternatesColumn = `${answerColumn}_alternates`;
  const matches: AnswerMatch[] = [];

  for (const row of remainingRows) {
    const primaryAnswer = row[answerColumn];
    if (primaryAnswer === undefined) continue;

    if (normalizeText(primaryAnswer, options) === normalizedInput) {
      matches.push({ elementId: row['id'] ?? '', displayAnswer: primaryAnswer });
      continue;
    }

    const alternates = row[alternatesColumn];
    if (alternates) {
      const alternateValues = alternates.split('|').map((s) => s.trim());
      for (const alt of alternateValues) {
        if (normalizeText(alt, options) === normalizedInput) {
          matches.push({ elementId: row['id'] ?? '', displayAnswer: primaryAnswer });
          break;
        }
      }
    }
  }

  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return { type: 'ambiguous', candidates: matches.map((m) => m.displayAnswer) };
}
