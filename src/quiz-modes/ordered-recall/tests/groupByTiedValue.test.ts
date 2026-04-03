import { groupByTiedValue } from '../groupByTiedValue';

function makeRow(id: string, value: string): Readonly<Record<string, string>> {
  return { id, value };
}

describe('groupByTiedValue', () => {
  const interactive = new Set(['a', 'b', 'c', 'd', 'e', 'f']);

  describe('with sort column', () => {
    it('groups consecutive rows with the same numeric value', () => {
      const rows = [
        makeRow('a', '1'),
        makeRow('b', '1'),
        makeRow('c', '2'),
        makeRow('d', '3'),
        makeRow('e', '3'),
      ];
      const groups = groupByTiedValue(rows, 'value', interactive);
      expect(groups).toEqual([['a', 'b'], ['c'], ['d', 'e']]);
    });

    it('groups all missing values together', () => {
      const rows = [
        makeRow('a', ''),
        makeRow('b', '-'),
        makeRow('c', ''),
      ];
      const groups = groupByTiedValue(rows, 'value', interactive);
      expect(groups).toEqual([['a', 'b', 'c']]);
    });

    it('keeps missing and numeric values in separate groups', () => {
      const rows = [
        makeRow('a', '5'),
        makeRow('b', '5'),
        makeRow('c', ''),
        makeRow('d', '-'),
      ];
      const groups = groupByTiedValue(rows, 'value', interactive);
      expect(groups).toEqual([['a', 'b'], ['c', 'd']]);
    });

    it('skips non-interactive elements without breaking groups', () => {
      const rows = [
        makeRow('a', '1'),
        makeRow('x', '1'), // not interactive
        makeRow('b', '1'),
      ];
      const interactive3 = new Set(['a', 'b']);
      const groups = groupByTiedValue(rows, 'value', interactive3);
      expect(groups).toEqual([['a', 'b']]);
    });

    it('handles each row having a unique value', () => {
      const rows = [
        makeRow('a', '1'),
        makeRow('b', '2'),
        makeRow('c', '3'),
      ];
      const groups = groupByTiedValue(rows, 'value', interactive);
      expect(groups).toEqual([['a'], ['b'], ['c']]);
    });

    it('handles scientific notation ties', () => {
      const rows = [
        makeRow('a', '1.5e3'),
        makeRow('b', '1500'),
      ];
      const groups = groupByTiedValue(rows, 'value', interactive);
      expect(groups).toEqual([['a', 'b']]);
    });

    it('returns empty array for empty input', () => {
      expect(groupByTiedValue([], 'value', interactive)).toEqual([]);
    });

    it('returns empty array when no rows are interactive', () => {
      const rows = [makeRow('x', '1'), makeRow('y', '2')];
      expect(groupByTiedValue(rows, 'value', interactive)).toEqual([]);
    });
  });

  describe('without sort column', () => {
    it('puts each element in its own group', () => {
      const rows = [
        makeRow('a', '1'),
        makeRow('b', '1'),
        makeRow('c', '2'),
      ];
      const groups = groupByTiedValue(rows, undefined, interactive);
      expect(groups).toEqual([['a'], ['b'], ['c']]);
    });

    it('filters to interactive elements', () => {
      const rows = [makeRow('a', '1'), makeRow('x', '2')];
      const interactive2 = new Set(['a']);
      const groups = groupByTiedValue(rows, undefined, interactive2);
      expect(groups).toEqual([['a']]);
    });
  });
});
