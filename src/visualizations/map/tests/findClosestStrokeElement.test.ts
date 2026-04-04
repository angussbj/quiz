import { findClosestStrokeElement } from '../findClosestStrokeElement';
import type { ParsedStrokePath } from '../findClosestStrokeElement';

function makePath(elementId: string, points: ReadonlyArray<{ x: number; y: number }>): ParsedStrokePath {
  return { elementId, points };
}

describe('findClosestStrokeElement', () => {
  const horizontal = makePath('horizontal', [{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  const vertical = makePath('vertical', [{ x: 5, y: -5 }, { x: 5, y: 5 }]);
  const allCandidates = new Set(['horizontal', 'vertical']);

  it('returns the closest element within threshold', () => {
    // Point at (5, 1) is 1 unit from horizontal (at y=0), ~1 unit from vertical (at x=5)
    // Vertical is at distance 0 in x, so it's closest
    const result = findClosestStrokeElement({ x: 5, y: 1 }, [horizontal, vertical], allCandidates, 4);
    expect(result).toBe('vertical');
  });

  it('returns the closest element when equidistant from multiple paths', () => {
    // Point at (2, 3) — distance to horizontal is 3, distance to vertical is 3
    // horizontal path is iterated first, so it wins ties
    const result = findClosestStrokeElement({ x: 2, y: 3 }, [horizontal, vertical], allCandidates, 100);
    expect(result).toBe('horizontal');
  });

  it('returns undefined when no element is within threshold', () => {
    const result = findClosestStrokeElement({ x: 100, y: 100 }, [horizontal, vertical], allCandidates, 4);
    expect(result).toBeUndefined();
  });

  it('filters by candidate IDs', () => {
    const onlyVertical = new Set(['vertical']);
    // Point at (1, 0) is closest to horizontal, but horizontal is not a candidate
    const result = findClosestStrokeElement({ x: 1, y: 0 }, [horizontal, vertical], onlyVertical, 100);
    expect(result).toBe('vertical');
  });

  it('returns undefined for empty candidate set', () => {
    const result = findClosestStrokeElement({ x: 5, y: 0 }, [horizontal, vertical], new Set(), 100);
    expect(result).toBeUndefined();
  });

  it('handles paths with only one point', () => {
    const singlePoint = makePath('single', [{ x: 0, y: 0 }]);
    const result = findClosestStrokeElement({ x: 0, y: 0 }, [singlePoint], new Set(['single']), 4);
    // Single point paths have < 2 points, so no segments to check
    expect(result).toBeUndefined();
  });

  it('finds the closest point along a multi-segment path', () => {
    const zigzag = makePath('zigzag', [
      { x: 0, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 0 },
    ]);
    // Point at (10, 0.5) is 0.5 units from the end of the zigzag path
    const result = findClosestStrokeElement(
      { x: 10, y: 0.5 },
      [zigzag],
      new Set(['zigzag']),
      1,
    );
    expect(result).toBe('zigzag');
  });
});
