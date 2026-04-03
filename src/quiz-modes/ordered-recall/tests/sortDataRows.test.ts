import { sortDataRows } from '../sortDataRows';

function makeRow(id: string, value: string): Readonly<Record<string, string>> {
  return { id, value };
}

describe('sortDataRows', () => {
  const rows = [
    makeRow('a', '10'),
    makeRow('b', ''),
    makeRow('c', '3'),
    makeRow('d', '-'),
    makeRow('e', '7'),
  ];

  describe('ascending sort', () => {
    it('sorts numeric values in ascending order', () => {
      const result = sortDataRows(rows, 'value', false, 'exclude');
      expect(result.map((r) => r['id'])).toEqual(['c', 'e', 'a']);
    });
  });

  describe('descending sort', () => {
    it('sorts numeric values in descending order', () => {
      const result = sortDataRows(rows, 'value', true, 'exclude');
      expect(result.map((r) => r['id'])).toEqual(['a', 'e', 'c']);
    });
  });

  describe('missing value placement', () => {
    it('excludes rows with missing values when missingValues is "exclude"', () => {
      const result = sortDataRows(rows, 'value', false, 'exclude');
      expect(result).toHaveLength(3);
      expect(result.map((r) => r['id'])).toEqual(['c', 'e', 'a']);
    });

    it('puts missing values first when missingValues is "first"', () => {
      const result = sortDataRows(rows, 'value', false, 'first');
      expect(result).toHaveLength(5);
      expect(result.map((r) => r['id'])).toEqual(['b', 'd', 'c', 'e', 'a']);
    });

    it('puts missing values last when missingValues is "last"', () => {
      const result = sortDataRows(rows, 'value', false, 'last');
      expect(result).toHaveLength(5);
      expect(result.map((r) => r['id'])).toEqual(['c', 'e', 'a', 'b', 'd']);
    });

    it('preserves missing value placement regardless of sort order', () => {
      const resultFirst = sortDataRows(rows, 'value', true, 'first');
      expect(resultFirst.map((r) => r['id'])).toEqual(['b', 'd', 'a', 'e', 'c']);

      const resultLast = sortDataRows(rows, 'value', true, 'last');
      expect(resultLast.map((r) => r['id'])).toEqual(['a', 'e', 'c', 'b', 'd']);
    });
  });

  describe('edge cases', () => {
    it('handles scientific notation', () => {
      const sciRows = [
        makeRow('x', '8.798e6'),
        makeRow('y', '1.5e3'),
        makeRow('z', '5.596e8'),
      ];
      const result = sortDataRows(sciRows, 'value', false, 'exclude');
      expect(result.map((r) => r['id'])).toEqual(['y', 'x', 'z']);
    });

    it('handles floating point values', () => {
      const floatRows = [
        makeRow('a', '0.00008988'),
        makeRow('b', '1.85'),
        makeRow('c', '0.534'),
      ];
      const result = sortDataRows(floatRows, 'value', false, 'exclude');
      expect(result.map((r) => r['id'])).toEqual(['a', 'c', 'b']);
    });

    it('returns empty array for empty input', () => {
      expect(sortDataRows([], 'value', false, 'exclude')).toEqual([]);
    });

    it('handles all missing values with exclude', () => {
      const allMissing = [makeRow('a', ''), makeRow('b', '-')];
      expect(sortDataRows(allMissing, 'value', false, 'exclude')).toEqual([]);
    });

    it('treats non-numeric strings as missing', () => {
      const mixedRows = [
        makeRow('a', 'stable'),
        makeRow('b', '42'),
        makeRow('c', 'N/A'),
      ];
      const result = sortDataRows(mixedRows, 'value', false, 'exclude');
      expect(result).toHaveLength(1);
      expect(result[0]['id']).toBe('b');
    });

    it('does not mutate the input array', () => {
      const original = [...rows];
      sortDataRows(rows, 'value', false, 'exclude');
      expect(rows).toEqual(original);
    });

    it('handles missing column gracefully (all values missing)', () => {
      const result = sortDataRows(rows, 'nonexistent', false, 'exclude');
      expect(result).toEqual([]);
    });
  });
});
