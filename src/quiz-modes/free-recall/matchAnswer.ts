
/**
 * Normalize text for fuzzy matching:
 * - Lowercase
 * - Strip diacritics/accents (é → e, ñ → n, etc.)
 * - Strip punctuation
 * - Collapse whitespace
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
): AnswerMatch | AmbiguousMatch | undefined {
  const normalizedInput = normalizeText(input);
  if (normalizedInput === '') return undefined;

  const alternatesColumn = `${answerColumn}_alternates`;
  const matches: AnswerMatch[] = [];

  for (const row of remainingRows) {
    const primaryAnswer = row[answerColumn];
    if (primaryAnswer === undefined) continue;

    if (normalizeText(primaryAnswer) === normalizedInput) {
      matches.push({ elementId: row['id'] ?? '', displayAnswer: primaryAnswer });
      continue;
    }

    const alternates = row[alternatesColumn];
    if (alternates) {
      const alternateValues = alternates.split('|').map((s) => s.trim());
      for (const alt of alternateValues) {
        if (normalizeText(alt) === normalizedInput) {
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
