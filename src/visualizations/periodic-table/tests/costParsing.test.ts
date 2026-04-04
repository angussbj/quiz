import { parseCostValue } from '../buildGridElements';
import { formatElementData } from '../formatElementData';
import type { VisualizationElement } from '../../VisualizationElement';

describe('parseCostValue', () => {
  it('parses a plain number', () => {
    expect(parseCostValue('6.0')).toEqual({ value: 6.0, isApproximate: false, isEstimate: false });
  });

  it('parses a number with ~ prefix', () => {
    expect(parseCostValue('~3460')).toEqual({ value: 3460, isApproximate: true, isEstimate: false });
  });

  it('parses a number with ~ prefix and ? suffix', () => {
    expect(parseCostValue('~1e25?')).toEqual({ value: 1e25, isApproximate: true, isEstimate: true });
  });

  it('parses scientific notation', () => {
    expect(parseCostValue('~4.92e13')).toEqual({ value: 4.92e13, isApproximate: true, isEstimate: false });
  });

  it('returns undefined for empty string', () => {
    expect(parseCostValue('')).toEqual({ value: undefined, isApproximate: false, isEstimate: false });
  });

  it('returns undefined for undefined', () => {
    expect(parseCostValue(undefined)).toEqual({ value: undefined, isApproximate: false, isEstimate: false });
  });

  it('handles small decimal values', () => {
    expect(parseCostValue('0.082')).toEqual({ value: 0.082, isApproximate: false, isEstimate: false });
  });

  it('handles estimate-only suffix without approximate prefix', () => {
    expect(parseCostValue('100?')).toEqual({ value: 100, isApproximate: false, isEstimate: true });
  });
});

describe('formatElementData cost (via dataColumns)', () => {
  function makeElement(dataColumns: Record<string, string>): VisualizationElement {
    return {
      id: 'test',
      label: 'Test',
      viewBoxCenter: { x: 0, y: 0 },
      viewBoxBounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 },
      interactive: true,
      dataColumns,
    };
  }

  it('formats a cheap commodity price', () => {
    const el = makeElement({ cost_usd_per_kg: '0.082' });
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('$0.082');
  });

  it('formats a moderate price in dollars', () => {
    const el = makeElement({ cost_usd_per_kg: '6.0' });
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('$6');
  });

  it('formats thousands with K suffix', () => {
    const el = makeElement({ cost_usd_per_kg: '~3460' });
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('~$3.46K');
  });

  it('formats millions with M suffix', () => {
    const el = makeElement({ cost_usd_per_kg: '~6490000' });
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('~$6.49M');
  });

  it('formats extreme estimate with ~ and ?', () => {
    const el = makeElement({ cost_usd_per_kg: '~1e25?' });
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('~$10^25?');
  });

  it('shows dash for missing cost', () => {
    const el = makeElement({});
    expect(formatElementData(el, 'cost_usd_per_kg')).toBe('—');
  });
});
