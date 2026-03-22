import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { normalizeText, matchAnswer } from '../matchAnswer';

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('PARIS')).toBe('paris');
  });

  it('strips diacritics', () => {
    expect(normalizeText('Zürich')).toBe('zurich');
    expect(normalizeText('São Paulo')).toBe('saopaulo');
    expect(normalizeText('Malmö')).toBe('malmo');
  });

  it('treats é and e as equivalent', () => {
    expect(normalizeText('café')).toBe('cafe');
    expect(normalizeText('Chișinău')).toBe('chisinau');
  });

  it('strips punctuation', () => {
    expect(normalizeText("N'Djamena")).toBe('ndjamena');
    expect(normalizeText('St. Petersburg')).toBe('stpetersburg');
  });

  it('strips whitespace', () => {
    expect(normalizeText('  New   York  ')).toBe('newyork');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('strips ñ diacritic', () => {
    expect(normalizeText('España')).toBe('espana');
  });

  it('strips underscores', () => {
    expect(normalizeText('some_place')).toBe('someplace');
  });

  describe('with whitespaceMatters', () => {
    const opts = { whitespaceMatters: true };

    it('collapses whitespace instead of stripping it', () => {
      expect(normalizeText('  New   York  ', opts)).toBe('new york');
    });

    it('still lowercases and strips diacritics', () => {
      expect(normalizeText('São Paulo', opts)).toBe('sao paulo');
    });
  });

  describe('with punctuationMatters', () => {
    const opts = { punctuationMatters: true };

    it('preserves punctuation', () => {
      expect(normalizeText("N'Djamena", opts)).toBe("n'djamena");
      expect(normalizeText('St. Petersburg', opts)).toBe('st.petersburg');
    });

    it('still lowercases and strips diacritics', () => {
      expect(normalizeText('Café', opts)).toBe('cafe');
    });
  });
});

const sampleRows: ReadonlyArray<QuizDataRow> = [
  { id: 'paris', city: 'Paris', country: 'France' },
  { id: 'berlin', city: 'Berlin', country: 'Germany' },
  { id: 'bucharest', city: 'București', country: 'Romania', city_alternates: 'Bucharest|Bukarest' },
  { id: 'prague', city: 'Prague', country: 'Czech Republic', city_alternates: 'Praha' },
  { id: 'new-york', city: 'New York', country: 'United States' },
];

const ambiguousRows: ReadonlyArray<QuizDataRow> = [
  { id: 'roman-empire', empire: 'Roman Empire', empire_alternates: 'Rome|Romans' },
  { id: 'roman-republic', empire: 'Roman Republic', empire_alternates: 'Rome|Romans' },
  { id: 'byzantine', empire: 'Byzantine Empire', empire_alternates: 'Byzantium' },
];

describe('matchAnswer', () => {
  it('matches exact answer', () => {
    const result = matchAnswer('Paris', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'paris', displayAnswer: 'Paris' });
  });

  it('matches case-insensitively', () => {
    const result = matchAnswer('paris', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'paris', displayAnswer: 'Paris' });
  });

  it('matches ignoring accents', () => {
    const result = matchAnswer('bucuresti', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'bucharest', displayAnswer: 'București' });
  });

  it('matches alternate answer', () => {
    const result = matchAnswer('Bucharest', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'bucharest', displayAnswer: 'București' });
  });

  it('matches alternate with different casing', () => {
    const result = matchAnswer('bukarest', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'bucharest', displayAnswer: 'București' });
  });

  it('matches single alternate', () => {
    const result = matchAnswer('Praha', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'prague', displayAnswer: 'Prague' });
  });

  it('returns undefined for no match', () => {
    expect(matchAnswer('London', sampleRows, 'city')).toBeUndefined();
  });

  it('returns undefined for empty input', () => {
    expect(matchAnswer('', sampleRows, 'city')).toBeUndefined();
  });

  it('returns undefined for whitespace-only input', () => {
    expect(matchAnswer('   ', sampleRows, 'city')).toBeUndefined();
  });

  it('only searches remaining rows', () => {
    const remaining = sampleRows.slice(1);
    expect(matchAnswer('Paris', remaining, 'city')).toBeUndefined();
  });

  it('returns primary answer as displayAnswer even when alternate matched', () => {
    const result = matchAnswer('Praha', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'prague', displayAnswer: 'Prague' });
  });

  it('handles rows without the alternates column', () => {
    const result = matchAnswer('Berlin', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'berlin', displayAnswer: 'Berlin' });
  });

  it('matches ignoring whitespace', () => {
    const result = matchAnswer('newyork', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'new-york', displayAnswer: 'New York' });
  });

  it('matches with extra whitespace in input', () => {
    const result = matchAnswer('new  york', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'new-york', displayAnswer: 'New York' });
  });
});

describe('matchAnswer ambiguous cases', () => {
  it('returns AmbiguousMatch when two rows share an alternate', () => {
    const result = matchAnswer('Rome', ambiguousRows, 'empire');
    expect(result).toEqual({
      type: 'ambiguous',
      candidates: ['Roman Empire', 'Roman Republic'],
    });
  });

  it('returns AmbiguousMatch when alternate matches two rows case-insensitively', () => {
    const result = matchAnswer('romans', ambiguousRows, 'empire');
    expect(result).toEqual({
      type: 'ambiguous',
      candidates: ['Roman Empire', 'Roman Republic'],
    });
  });

  it('returns unambiguous match when only one row matches', () => {
    const result = matchAnswer('Byzantium', ambiguousRows, 'empire');
    expect(result).toEqual({ elementId: 'byzantine', displayAnswer: 'Byzantine Empire' });
  });

  it('returns unambiguous match when exact primary answer typed despite shared alternate', () => {
    const result = matchAnswer('Roman Empire', ambiguousRows, 'empire');
    expect(result).toEqual({ elementId: 'roman-empire', displayAnswer: 'Roman Empire' });
  });

  it('resolves ambiguity after one candidate is removed from remaining rows', () => {
    const remaining = ambiguousRows.filter((r) => r['id'] !== 'roman-empire');
    const result = matchAnswer('Rome', remaining, 'empire');
    expect(result).toEqual({ elementId: 'roman-republic', displayAnswer: 'Roman Republic' });
  });
});

describe('matchAnswer with whitespaceMatters', () => {
  const opts = { whitespaceMatters: true };

  it('requires whitespace to match when whitespaceMatters is true', () => {
    expect(matchAnswer('newyork', sampleRows, 'city', opts)).toBeUndefined();
  });

  it('matches with correct whitespace when whitespaceMatters is true', () => {
    const result = matchAnswer('New York', sampleRows, 'city', opts);
    expect(result).toEqual({ elementId: 'new-york', displayAnswer: 'New York' });
  });
});
