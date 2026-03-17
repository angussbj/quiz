import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { buildGridElements } from '../buildGridElements';
import { CELL_SIZE, CELL_STEP } from '../cellLayout';

function makeRow(overrides: Record<string, string>): QuizDataRow {
  return { id: 'test-id', ...overrides };
}

describe('buildGridElements', () => {
  it('returns empty array for empty input', () => {
    expect(buildGridElements([], {})).toEqual([]);
  });

  it('computes viewBoxCenter from row and column indices', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Hydrogen', row: '0', column: '0', symbol: 'H' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].viewBoxCenter.x).toBe(CELL_SIZE / 2);
    expect(elements[0].viewBoxCenter.y).toBe(CELL_SIZE / 2);
  });

  it('computes viewBoxBounds as a cell-sized rectangle', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Helium', row: '0', column: '17', symbol: 'He' }),
    ];
    const elements = buildGridElements(rows, {});
    const el = elements[0];
    const expectedX = 17 * CELL_STEP;
    expect(el.viewBoxBounds.minX).toBe(expectedX);
    expect(el.viewBoxBounds.minY).toBe(0);
    expect(el.viewBoxBounds.maxX).toBe(expectedX + CELL_SIZE);
    expect(el.viewBoxBounds.maxY).toBe(CELL_SIZE);
  });

  it('uses columnMappings for label', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ name: 'Lithium', row: '1', column: '0', symbol: 'Li' }),
    ];
    const elements = buildGridElements(rows, { label: 'name' });
    expect(elements[0].label).toBe('Lithium');
  });

  it('uses columnMappings for group', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Carbon', row: '1', column: '13', symbol: 'C', category: 'nonmetal' }),
    ];
    const elements = buildGridElements(rows, { group: 'category' });
    expect(elements[0].group).toBe('nonmetal');
  });

  it('leaves group undefined when no group column mapping', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Neon', row: '1', column: '17', symbol: 'Ne' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].group).toBeUndefined();
  });

  it('uses symbol column if present', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Oxygen', row: '1', column: '15', symbol: 'O' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].symbol).toBe('O');
  });

  it('falls back to first two chars of label for symbol', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Nitrogen', row: '1', column: '14' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].symbol).toBe('Ni');
  });

  it('falls back to id when no symbol or label', () => {
    const row: QuizDataRow = { id: 'N', row: '1', column: '14' };
    const elements = buildGridElements([row], {});
    expect(elements[0].symbol).toBe('N');
  });

  it('offsets cells using CELL_STEP (size + gap)', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'A', row: '2', column: '3', symbol: 'A' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].viewBoxBounds.minX).toBe(3 * CELL_STEP);
    expect(elements[0].viewBoxBounds.minY).toBe(2 * CELL_STEP);
  });

  it('sets interactive to true for all elements', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Iron', row: '3', column: '7', symbol: 'Fe' }),
    ];
    const elements = buildGridElements(rows, {});
    expect(elements[0].interactive).toBe(true);
  });
});
