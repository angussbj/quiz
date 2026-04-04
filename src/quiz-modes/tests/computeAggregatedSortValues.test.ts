import { computeAggregatedSortValues } from '../computeAggregatedSortValues';
import type { SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';

function makeRow(id: string, values: Record<string, string>): Readonly<Record<string, string>> {
  return { id, ...values };
}

describe('computeAggregatedSortValues', () => {
  const dischargeCol: SortColumnDefinition = { column: 'discharge', label: 'Discharge' };
  const lengthCol: SortColumnDefinition = { column: 'length', label: 'Length', mergeAggregation: 'sum' };

  it('returns parent values with default aggregation (parent)', () => {
    const activeIds = new Set(['nile', 'amazon']);
    const mergeMap = new Map<string, string>();
    const rows = new Map([
      ['nile', makeRow('nile', { discharge: '2830' })],
      ['amazon', makeRow('amazon', { discharge: '209000' })],
    ]);

    const result = computeAggregatedSortValues(activeIds, mergeMap, rows, dischargeCol);
    expect(result.get('nile')).toBe(2830);
    expect(result.get('amazon')).toBe(209000);
  });

  it('sums merged children with sum aggregation', () => {
    const activeIds = new Set(['nile']);
    const mergeMap = new Map([['albert-nile', 'nile']]);
    const rows = new Map([
      ['nile', makeRow('nile', { length: '6650' })],
      ['albert-nile', makeRow('albert-nile', { length: '183' })],
    ]);

    const result = computeAggregatedSortValues(activeIds, mergeMap, rows, lengthCol);
    expect(result.get('nile')).toBe(6650 + 183);
  });

  it('ignores merged children with parent aggregation', () => {
    const activeIds = new Set(['nile']);
    const mergeMap = new Map([['albert-nile', 'nile']]);
    const rows = new Map([
      ['nile', makeRow('nile', { discharge: '2830' })],
      ['albert-nile', makeRow('albert-nile', { discharge: '700' })],
    ]);

    const result = computeAggregatedSortValues(activeIds, mergeMap, rows, dischargeCol);
    expect(result.get('nile')).toBe(2830);
  });

  it('handles missing values by excluding the element', () => {
    const activeIds = new Set(['nile', 'unknown']);
    const mergeMap = new Map<string, string>();
    const rows = new Map([
      ['nile', makeRow('nile', { discharge: '2830' })],
      ['unknown', makeRow('unknown', { discharge: '' })],
    ]);

    const result = computeAggregatedSortValues(activeIds, mergeMap, rows, dischargeCol);
    expect(result.get('nile')).toBe(2830);
    expect(result.has('unknown')).toBe(false);
  });

  it('handles sum where parent has no value but children do', () => {
    const activeIds = new Set(['parent']);
    const mergeMap = new Map([['child', 'parent']]);
    const rows = new Map([
      ['parent', makeRow('parent', { length: '' })],
      ['child', makeRow('child', { length: '100' })],
    ]);

    const result = computeAggregatedSortValues(activeIds, mergeMap, rows, lengthCol);
    // Parent has no value, child adds to 0 → result is 100
    expect(result.get('parent')).toBe(100);
  });
});
