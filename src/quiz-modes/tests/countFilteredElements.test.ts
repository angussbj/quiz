import { countFilteredElements } from '../countFilteredElements';

const ROWS: ReadonlyArray<Readonly<Record<string, string>>> = [
  { id: 'h', atomic_number: '1', category: 'nonmetal' },
  { id: 'he', atomic_number: '2', category: 'noble-gas' },
  { id: 'li', atomic_number: '3', category: 'alkali-metal' },
  { id: 'be', atomic_number: '4', category: 'alkaline-earth-metal' },
  { id: 'b', atomic_number: '5', category: 'metalloid' },
];

describe('countFilteredElements', () => {
  it('returns total count with no filters', () => {
    expect(countFilteredElements(ROWS, undefined, undefined, undefined, undefined, undefined, undefined)).toBe(5);
  });

  it('filters by range only', () => {
    expect(countFilteredElements(ROWS, 'atomic_number', 2, 4, undefined, undefined, undefined)).toBe(3);
  });

  it('filters by group only', () => {
    const groups = new Set(['nonmetal', 'noble-gas']);
    expect(countFilteredElements(ROWS, undefined, undefined, undefined, undefined, 'category', groups)).toBe(2);
  });

  it('applies range AND group filter', () => {
    const groups = new Set(['nonmetal', 'noble-gas']);
    expect(countFilteredElements(ROWS, 'atomic_number', 1, 3, undefined, 'category', groups)).toBe(2);
  });

  it('returns 0 when no groups selected (empty set)', () => {
    expect(countFilteredElements(ROWS, undefined, undefined, undefined, undefined, 'category', new Set())).toBe(0);
  });

  it('returns 0 when group filter excludes everything', () => {
    const groups = new Set(['actinide']);
    expect(countFilteredElements(ROWS, undefined, undefined, undefined, undefined, 'category', groups)).toBe(0);
  });

  it('uses rangeMaxFallback when rangeMax is undefined', () => {
    expect(countFilteredElements(ROWS, 'atomic_number', 1, undefined, 3, undefined, undefined)).toBe(3);
  });
});
