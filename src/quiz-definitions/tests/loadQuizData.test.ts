import { loadQuizData } from '../loadQuizData';
import type { QuizDataRow } from '../QuizDataRow';

type TestColumns = 'id' | 'city' | 'country';

describe('loadQuizData', () => {
  it('parses CSV into typed quiz data rows', () => {
    const csv = 'id,city,country\nparis,Paris,France\nberlin,Berlin,Germany';
    const rows: ReadonlyArray<QuizDataRow<TestColumns>> = loadQuizData<TestColumns>(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('paris');
    expect(rows[0].city).toBe('Paris');
    expect(rows[0].country).toBe('France');
    expect(rows[1].id).toBe('berlin');
    expect(rows[1].city).toBe('Berlin');
    expect(rows[1].country).toBe('Germany');
  });

  it('returns empty array for empty CSV', () => {
    expect(loadQuizData('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    expect(loadQuizData('id,city\n')).toEqual([]);
  });

  it('throws if CSV has no id column', () => {
    const csv = 'city,country\nParis,France';
    expect(() => loadQuizData(csv)).toThrow('CSV must have an "id" column');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'id,city,country\nparis,"Paris, City of Light",France';
    const rows = loadQuizData(csv);
    expect(rows[0].city).toBe('Paris, City of Light');
  });

  it('handles empty fields', () => {
    const csv = 'id,city,country\nparis,,France';
    const rows = loadQuizData(csv);
    expect(rows[0].city).toBe('');
    expect(rows[0].country).toBe('France');
  });

  it('preserves id in both the id property and as a column', () => {
    const csv = 'id,name\nabc,Test';
    const rows = loadQuizData(csv);
    expect(rows[0].id).toBe('abc');
    expect(rows[0]['id']).toBe('abc');
  });
});
