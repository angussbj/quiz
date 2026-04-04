import { parseCostValue } from '../buildGridElements';
import { formatElementData } from '../formatElementData';
import type { GridElement } from '../GridElement';

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
    // This format is not currently used in our data, but the parser should handle it
    expect(parseCostValue('100?')).toEqual({ value: 100, isApproximate: false, isEstimate: true });
  });
});

describe('formatElementData cost', () => {
  function makeElement(overrides: Partial<GridElement>): GridElement {
    return {
      id: 'test',
      label: 'Test',
      viewBoxCenter: { x: 0, y: 0 },
      viewBoxBounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 },
      interactive: true,
      row: 0,
      column: 0,
      symbol: 'Te',
      atomicNumber: 1,
      trueRow: 0,
      trueColumn: 0,
      atomicWeight: '1.0',
      halfLifeSeconds: undefined,
      density: undefined,
      electronegativity: undefined,
      standardState: undefined,
      yearDiscovered: undefined,
      meltingPoint: undefined,
      boilingPoint: undefined,
      costUsdPerKg: undefined,
      costIsApproximate: false,
      costIsEstimate: false,
      costDate: undefined,
      ...overrides,
    };
  }

  it('formats a cheap commodity price', () => {
    const el = makeElement({ costUsdPerKg: 0.082, costIsApproximate: false, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('$0.082/kg');
  });

  it('formats a moderate price in dollars', () => {
    const el = makeElement({ costUsdPerKg: 6.0, costIsApproximate: false, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('$6.0/kg');
  });

  it('formats thousands with K suffix', () => {
    const el = makeElement({ costUsdPerKg: 3460, costIsApproximate: true, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('~$3.5K/kg');
  });

  it('formats millions with M suffix', () => {
    const el = makeElement({ costUsdPerKg: 6490000, costIsApproximate: true, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('~$6.5M/kg');
  });

  it('formats billions with B suffix', () => {
    const el = makeElement({ costUsdPerKg: 6e10, costIsApproximate: true, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('~$60B/kg');
  });

  it('formats trillions with T suffix', () => {
    const el = makeElement({ costUsdPerKg: 4.92e13, costIsApproximate: true, costIsEstimate: false });
    expect(formatElementData(el, 'cost')).toBe('~$49.2T/kg');
  });

  it('formats extreme estimate with ~ and ?', () => {
    const el = makeElement({ costUsdPerKg: 1e25, costIsApproximate: true, costIsEstimate: true });
    expect(formatElementData(el, 'cost')).toBe('~$10^25/kg?');
  });

  it('shows dash for undefined cost', () => {
    const el = makeElement({ costUsdPerKg: undefined });
    expect(formatElementData(el, 'cost')).toBe('—');
  });
});
