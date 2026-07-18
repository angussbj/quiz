import type { VisualizationElement } from '../VisualizationElement';
import { findNearestNeighbors } from '../findNearestNeighbors';

function element(id: string, x: number, y: number): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x, y },
    viewBoxBounds: { minX: x, minY: y, maxX: x, maxY: y },
    interactive: true,
  };
}

describe('findNearestNeighbors', () => {
  it('returns empty array when no elements', () => {
    const result = findNearestNeighbors(new Set(['a']), [], 4);
    expect(result).toEqual([]);
  });

  it('returns empty array when only focus elements exist', () => {
    const elements = [element('a', 0, 0)];
    const result = findNearestNeighbors(new Set(['a']), elements, 4);
    expect(result).toEqual([]);
  });

  it('returns up to n nearest neighbors by centroid distance', () => {
    const elements = [
      element('focus', 0, 0),
      element('near', 1, 0),
      element('mid', 5, 0),
      element('far', 100, 0),
      element('very-far', 1000, 0),
    ];
    const result = findNearestNeighbors(new Set(['focus']), elements, 2);
    expect(result).toEqual(['near', 'mid']);
  });

  it('returns all available when fewer than n non-focus elements exist', () => {
    const elements = [
      element('focus', 0, 0),
      element('a', 1, 0),
      element('b', 2, 0),
    ];
    const result = findNearestNeighbors(new Set(['focus']), elements, 4);
    expect(result.length).toBe(2);
    expect(result).toContain('a');
    expect(result).toContain('b');
  });

  it('excludes focus elements from neighbor selection', () => {
    const elements = [
      element('f1', 0, 0),
      element('f2', 1, 0),
      element('n', 5, 0),
    ];
    const result = findNearestNeighbors(new Set(['f1', 'f2']), elements, 4);
    expect(result).toEqual(['n']);
  });

  it('breaks ties deterministically by element ID', () => {
    const elements = [
      element('focus', 0, 0),
      element('z', 1, 0),
      element('a', -1, 0),
      element('m', 0, 1),
    ];
    // All three neighbors are at distance 1. Tie-break by id ascending.
    const result = findNearestNeighbors(new Set(['focus']), elements, 3);
    expect(result).toEqual(['a', 'm', 'z']);
  });

  it('uses combined-bbox centroid for multi-element focus', () => {
    const elements = [
      element('f1', 0, 0),
      element('f2', 10, 0),
      element('near-center', 5, 1),
      element('near-edge', 11, 0),
    ];
    // Combined centroid of f1+f2 is (5, 0). near-center is at distance 1, near-edge at distance 6.
    const result = findNearestNeighbors(new Set(['f1', 'f2']), elements, 1);
    expect(result).toEqual(['near-center']);
  });

  it('measures distance using Euclidean metric in viewBox units', () => {
    const elements = [
      element('focus', 0, 0),
      element('a', 3, 4),
      element('b', 4, 0),
    ];
    // a is at distance 5, b is at distance 4
    const result = findNearestNeighbors(new Set(['focus']), elements, 1);
    expect(result).toEqual(['b']);
  });
});
