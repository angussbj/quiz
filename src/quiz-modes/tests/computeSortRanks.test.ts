import { computeSortRanks } from '../computeSortRanks';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';

function makeElement(id: string, sortValue?: number): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    interactive: true,
    sortValue,
  };
}

describe('computeSortRanks', () => {
  it('ranks ascending by default (lowest value = rank 1)', () => {
    const elements = [
      makeElement('a', 30),
      makeElement('b', 10),
      makeElement('c', 20),
    ];
    const ranks = computeSortRanks(elements);
    expect(ranks.get('b')).toBe(1); // 10 = lowest
    expect(ranks.get('c')).toBe(2); // 20
    expect(ranks.get('a')).toBe(3); // 30 = highest
  });

  it('ranks descending when ascending=false (highest value = rank 1)', () => {
    const elements = [
      makeElement('a', 30),
      makeElement('b', 10),
      makeElement('c', 20),
    ];
    const ranks = computeSortRanks(elements, false);
    expect(ranks.get('a')).toBe(1); // 30 = highest
    expect(ranks.get('c')).toBe(2); // 20
    expect(ranks.get('b')).toBe(3); // 10 = lowest
  });

  it('handles ties by assigning the same rank', () => {
    const elements = [
      makeElement('a', 10),
      makeElement('b', 20),
      makeElement('c', 20),
      makeElement('d', 30),
    ];
    const ranks = computeSortRanks(elements);
    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('b')).toBe(2);
    expect(ranks.get('c')).toBe(2);
    expect(ranks.get('d')).toBe(4); // skips rank 3
  });

  it('excludes elements without sortValue', () => {
    const elements = [
      makeElement('a', 10),
      makeElement('b', undefined),
      makeElement('c', 20),
    ];
    const ranks = computeSortRanks(elements);
    expect(ranks.get('a')).toBe(1);
    expect(ranks.get('c')).toBe(2);
    expect(ranks.has('b')).toBe(false);
  });

  it('returns empty map for no elements', () => {
    const ranks = computeSortRanks([]);
    expect(ranks.size).toBe(0);
  });
});
