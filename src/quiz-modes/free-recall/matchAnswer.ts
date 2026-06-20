
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
/**
 * Characters that survive NFD decomposition + combining-mark removal
 * but should map to ASCII equivalents for matching purposes.
 */
const transliterations: Readonly<Record<string, string>> = {
  'ı': 'i', // Turkish dotless i
  'ł': 'l', // Polish
  'ø': 'o', // Scandinavian
  'đ': 'd', // Croatian/Vietnamese
  'ð': 'd', // Icelandic
  'þ': 'th', // Icelandic
  'ß': 'ss', // German
  'æ': 'ae', // Scandinavian
  'œ': 'oe', // French
};

const transliterationPattern = new RegExp(
  `[${Object.keys(transliterations).join('')}]`,
  'g',
);

/**
 * Small grammatical words stripped during matching so users don't have to type
 * them. Covers English ("the netherlands" \u2192 "netherlands"), Romance articles
 * ("rio de janeiro" \u2192 "rio janeiro"), Germanic articles, the Arabic article
 * "al", and the descriptor "river" ("yellow river" \u2192 "yellow").
 *
 * If stripping leaves the string empty (input was nothing but stopwords) we
 * fall back to the un-stripped form so single-word answers like "The" still
 * match themselves.
 */
const stopwords: ReadonlySet<string> = new Set([
  'the',
  'and',
  'of',
  'de',
  'la',
  'le',
  'les',
  'el',
  'los',
  'las',
  'del',
  'du',
  'da',
  'do',
  'di',
  'der',
  'die',
  'das',
  'den',
  'al',
  'river',
]);

export function normalizeText(text: string, options?: NormalizeOptions): string {
  let result = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(transliterationPattern, (ch) => transliterations[ch] ?? ch);

  if (!options?.punctuationMatters) {
    result = result.replace(/[^a-zA-Z0-9\s]/g, ' ');
  }

  const withoutStopwords = result
    .split(/\s+/)
    .filter((word) => word !== '' && !stopwords.has(word))
    .join(' ');
  if (withoutStopwords !== '') {
    result = withoutStopwords;
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
  // A primary name always wins over an alternate: many datasets list sibling
  // names as each other's synonyms (e.g. AUSTLANG cross-lists dialects), so
  // typing a real name must score that name, not a language that merely lists
  // it as an alternate. Alternate matches are only used when no primary matches.
  const primaryMatches: AnswerMatch[] = [];
  const alternateMatches: AnswerMatch[] = [];

  for (const row of remainingRows) {
    const primaryAnswer = row[answerColumn];
    if (primaryAnswer === undefined) continue;

    if (normalizeText(primaryAnswer, options) === normalizedInput) {
      primaryMatches.push({ elementId: row['id'] ?? '', displayAnswer: primaryAnswer });
      continue;
    }

    const alternates = row[alternatesColumn];
    if (alternates) {
      const alternateValues = alternates.split('|').map((s) => s.trim());
      for (const alt of alternateValues) {
        if (normalizeText(alt, options) === normalizedInput) {
          alternateMatches.push({ elementId: row['id'] ?? '', displayAnswer: primaryAnswer });
          break;
        }
      }
    }
  }

  const matches = primaryMatches.length > 0 ? primaryMatches : alternateMatches;
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  // Identical display names (e.g. two distinct languages both named "Ngarla")
  // can't be disambiguated by typing, so an "ambiguous" prompt would dead-end
  // the user. Accept one; because answered rows leave remainingRows, typing the
  // same name again scores the next. Only genuinely distinct names stay ambiguous.
  const distinctNames = new Set(matches.map((m) => normalizeText(m.displayAnswer, options)));
  if (distinctNames.size === 1) return matches[0];
  return { type: 'ambiguous', candidates: matches.map((m) => m.displayAnswer) };
}
