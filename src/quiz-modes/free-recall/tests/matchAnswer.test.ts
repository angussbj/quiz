import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { normalizeText, matchAnswer } from '../matchAnswer';

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('PARIS')).toBe('paris');
  });

  it('strips diacritics', () => {
    expect(normalizeText('Zürich')).toBe('zurich');
    expect(normalizeText('São Paulo')).toBe('sao paulo');
    expect(normalizeText('Malmö')).toBe('malmo');
  });

  it('treats é and e as equivalent', () => {
    expect(normalizeText('café')).toBe('cafe');
    expect(normalizeText('Chișinău')).toBe('chisinau');
  });

  it('strips punctuation', () => {
    expect(normalizeText("N'Djamena")).toBe('ndjamena');
    expect(normalizeText('St. Petersburg')).toBe('st petersburg');
  });

  it('collapses whitespace', () => {
    expect(normalizeText('  New   York  ')).toBe('new york');
  });

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('strips ñ diacritic', () => {
    expect(normalizeText('España')).toBe('espana');
  });
});

const sampleRows: ReadonlyArray<QuizDataRow> = [
  { id: 'paris', city: 'Paris', country: 'France' },
  { id: 'berlin', city: 'Berlin', country: 'Germany' },
  { id: 'bucharest', city: 'București', country: 'Romania', city_alternates: 'Bucharest|Bukarest' },
  { id: 'prague', city: 'Prague', country: 'Czech Republic', city_alternates: 'Praha' },
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
    expect(result?.displayAnswer).toBe('Prague');
  });

  it('handles rows without the alternates column', () => {
    const result = matchAnswer('Berlin', sampleRows, 'city');
    expect(result).toEqual({ elementId: 'berlin', displayAnswer: 'Berlin' });
  });
});
