import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { parseBackgroundPaths } from '../loadBackgroundPaths';

function makeRow(fields: Record<string, string>): QuizDataRow {
  return { id: fields['id'] ?? 'test', ...fields };
}

describe('parseBackgroundPaths', () => {
  it('parses rows with id, name, group, paths into BackgroundPath[]', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ id: 'france', name: 'France', group: 'western', paths: 'M10 20L30 40' }),
      makeRow({ id: 'germany', name: 'Germany', group: 'central', paths: 'M50 60L70 80' }),
    ];

    const result = parseBackgroundPaths(rows);

    expect(result).toEqual([
      { id: 'france', svgPathData: 'M10 20L30 40', group: 'western', name: 'France', code: undefined },
      { id: 'germany', svgPathData: 'M50 60L70 80', group: 'central', name: 'Germany', code: undefined },
    ]);
  });

  it('splits paths by | into multiple entries per row', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ id: 'italy', name: 'Italy', group: 'southern', paths: 'M1 2|M3 4|M5 6' }),
    ];

    const result = parseBackgroundPaths(rows);

    expect(result).toEqual([
      { id: 'italy-0', svgPathData: 'M1 2', group: 'southern', name: 'Italy', code: undefined },
      { id: 'italy-1', svgPathData: 'M3 4', group: 'southern', name: 'Italy', code: undefined },
      { id: 'italy-2', svgPathData: 'M5 6', group: 'southern', name: 'Italy', code: undefined },
    ]);
  });

  it('handles single path per row (no |)', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ id: 'spain', name: 'Spain', group: 'southern', paths: 'M10 20' }),
    ];

    const result = parseBackgroundPaths(rows);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('spain');
    expect(result[0].svgPathData).toBe('M10 20');
  });

  it('handles empty paths column', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ id: 'empty', name: 'Empty', group: 'none', paths: '' }),
      makeRow({ id: 'whitespace', name: 'Whitespace', group: 'none', paths: '   ' }),
    ];

    const result = parseBackgroundPaths(rows);

    expect(result).toEqual([]);
  });

  it('handles empty input array', () => {
    const result = parseBackgroundPaths([]);

    expect(result).toEqual([]);
  });

  it('falls back to name when group is missing', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ id: 'isle', name: 'Isle of Man', paths: 'M1 2' }),
    ];

    const result = parseBackgroundPaths(rows);

    expect(result[0].group).toBe('Isle of Man');
  });
});
