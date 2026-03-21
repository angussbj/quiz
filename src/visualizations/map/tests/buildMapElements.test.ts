import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { buildMapElements } from '../buildMapElements';
import { projectGeo } from '../projectGeo';

function makeRow(overrides: Record<string, string>): QuizDataRow {
  return { id: 'test-id', ...overrides };
}

describe('buildMapElements', () => {
  it('converts rows with lat/lng to MapElements with projected viewBoxCenter', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ label: 'Paris', latitude: '48.8566', longitude: '2.3522' }),
    ];
    const elements = buildMapElements(rows, {});
    const expected = projectGeo({ latitude: 48.8566, longitude: 2.3522 });
    expect(elements[0].viewBoxCenter.x).toBeCloseTo(expected.x);
    expect(elements[0].viewBoxCenter.y).toBeCloseTo(expected.y);
  });

  it('uses columnMappings for label and group', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ city: 'Tokyo', continent: 'Asia', latitude: '35', longitude: '139' }),
    ];
    const elements = buildMapElements(rows, { label: 'city', group: 'continent' });
    expect(elements[0].label).toBe('Tokyo');
    expect(elements[0].group).toBe('Asia');
  });

  it('handles rows with paths column', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ latitude: '0', longitude: '0', paths: 'M0 0L10 10' }),
    ];
    const elements = buildMapElements(rows, {});
    expect(elements[0].svgPathData).toBe('M0 0L10 10');
  });

  it('handles rows without paths column', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ latitude: '0', longitude: '0' }),
    ];
    const elements = buildMapElements(rows, {});
    expect(elements[0].svgPathData).toBe('');
  });

  it('uses code column if present, returns empty string when absent', () => {
    const rowWithCode = makeRow({ latitude: '0', longitude: '0', code: 'FR' });
    const rowWithoutCode: QuizDataRow = { id: 'france', latitude: '0', longitude: '0' };

    const withCode = buildMapElements([rowWithCode], {});
    expect(withCode[0].code).toBe('FR');

    const withoutCode = buildMapElements([rowWithoutCode], {});
    expect(withoutCode[0].code).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(buildMapElements([], {})).toEqual([]);
  });

  it('computes viewBoxBounds as a dot around the center', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ latitude: '10', longitude: '20' }),
    ];
    const elements = buildMapElements(rows, {});
    const el = elements[0];
    expect(el.viewBoxBounds.minX).toBeCloseTo(el.viewBoxCenter.x - 0.3);
    expect(el.viewBoxBounds.maxX).toBeCloseTo(el.viewBoxCenter.x + 0.3);
    expect(el.viewBoxBounds.minY).toBeCloseTo(el.viewBoxCenter.y - 0.3);
    expect(el.viewBoxBounds.maxY).toBeCloseTo(el.viewBoxCenter.y + 0.3);
  });

  it('sets interactive to true for all elements', () => {
    const rows: ReadonlyArray<QuizDataRow> = [
      makeRow({ latitude: '0', longitude: '0' }),
    ];
    const elements = buildMapElements(rows, {});
    expect(elements[0].interactive).toBe(true);
  });
});
