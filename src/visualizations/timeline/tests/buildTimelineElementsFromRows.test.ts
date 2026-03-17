import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { buildTimelineElementsFromRows } from '../buildTimelineElementsFromRows';

function makeRow(overrides: Record<string, string>): QuizDataRow {
  return { id: 'test-id', ...overrides };
}

describe('buildTimelineElementsFromRows', () => {
  it('returns empty array for empty input', () => {
    expect(buildTimelineElementsFromRows([], {})).toEqual([]);
  });

  it('parses year-only start timestamp', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'WW1', start_year: '1914', end_year: '1918', category: 'war' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements.length).toBeGreaterThanOrEqual(1);
    const el = elements[0];
    expect(el.id).toBe('test-id');
    expect(el.label).toBe('WW1');
    expect(el.start).toEqual([1914]);
  });

  it('parses year-month-day timestamp', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({
        label: 'Moon Landing',
        start_year: '1969',
        start_month: '7',
        start_day: '20',
        category: 'science',
      }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements[0].start).toEqual([1969, 7, 20]);
  });

  it('parses year-month timestamp without day', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({
        label: 'Event',
        start_year: '2000',
        start_month: '3',
        category: 'misc',
      }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements[0].start).toEqual([2000, 3]);
  });

  it('skips rows without a start timestamp', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'No Start', category: 'misc' }),
      makeRow({ label: 'Has Start', start_year: '2000', category: 'misc' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    // Filter out spacer elements
    const interactive = elements.filter((e) => e.interactive);
    expect(interactive).toHaveLength(1);
    expect(interactive[0].label).toBe('Has Start');
  });

  it('uses columnMappings for label', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ name: 'Custom Name', start_year: '1900', category: 'test' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, { label: 'name' });
    expect(elements[0].label).toBe('Custom Name');
  });

  it('uses columnMappings for group', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Event', start_year: '1900', category: 'test', era: 'modern' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, { group: 'era' });
    expect(elements[0].group).toBe('modern');
  });

  it('uses category column for category field', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Event', start_year: '1900', category: 'politics' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements[0].category).toBe('politics');
  });

  it('falls back to start column when start_year is absent', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Event', start: '1950', category: 'test' }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements[0].start).toEqual([1950]);
  });

  it('parses end timestamps', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({
        label: 'Period',
        start_year: '1800',
        end_year: '1900',
        end_month: '6',
        category: 'history',
      }),
    ];
    const elements = buildTimelineElementsFromRows(rows, {});
    expect(elements[0].end).toEqual([1900, 6]);
  });
});
