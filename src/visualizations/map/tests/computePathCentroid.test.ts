import { computePathCentroid } from '../computePathCentroid';

describe('computePathCentroid', () => {
  it('computes centroid of a simple square path', () => {
    const d = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBeCloseTo(5, 0);
    expect(centroid.y).toBeCloseTo(5, 0);
  });

  it('computes centroid of a triangle', () => {
    const d = 'M 0 0 L 10 0 L 5 10 Z';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBeCloseTo(5, 0);
    expect(centroid.y).toBeCloseTo(3.3, 0);
  });

  it('returns bounding box center for degenerate paths', () => {
    const d = 'M 5 5';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBe(5);
    expect(centroid.y).toBe(5);
  });

  it('handles real-world border paths', () => {
    // Simplified France-like polygon
    const d = 'M 2 -48 L 5 -48 L 7 -45 L 5 -43 L 2 -43 L 0 -45 Z';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBeCloseTo(3.5, 0);
    expect(centroid.y).toBeCloseTo(-45.3, 0);
  });

  it('returns zero for empty path', () => {
    const centroid = computePathCentroid('');
    expect(centroid.x).toBe(0);
    expect(centroid.y).toBe(0);
  });
});
