import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';

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
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface AnswerMatch {
  readonly elementId: string;
  readonly displayAnswer: string;
}

/**
 * Check if user input matches any remaining answer.
 *
 * Matching rules:
 * - Case-insensitive, accent-insensitive, punctuation-stripped
 * - Checks the answer column value
 * - Checks {answerColumn}_alternates column if it exists (pipe-separated values)
 *
 * Returns the matched element, or undefined if no match.
 */
export function matchAnswer(
  input: string,
  remainingRows: ReadonlyArray<QuizDataRow>,
  answerColumn: string,
): AnswerMatch | undefined {
  const normalizedInput = normalizeText(input);
  if (normalizedInput === '') return undefined;

  const alternatesColumn = `${answerColumn}_alternates`;

  for (const row of remainingRows) {
    const primaryAnswer = row[answerColumn];
    if (primaryAnswer === undefined) continue;

    if (normalizeText(primaryAnswer) === normalizedInput) {
      return { elementId: row.id, displayAnswer: primaryAnswer };
    }

    const alternates = row[alternatesColumn];
    if (alternates) {
      const alternateValues = alternates.split('|').map((s) => s.trim());
      for (const alt of alternateValues) {
        if (normalizeText(alt) === normalizedInput) {
          return { elementId: row.id, displayAnswer: primaryAnswer };
        }
      }
    }
  }

  return undefined;
}
