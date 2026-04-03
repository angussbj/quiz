import { computePathCentroid, computePolylabel, computeBoundingBoxCenter, computeDistanceToEdge } from '../computePathCentroid';

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

describe('computeBoundingBoxCenter', () => {
  it('computes bbox center of a square', () => {
    const d = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
    const center = computeBoundingBoxCenter(d)!;
    expect(center.x).toBeCloseTo(5);
    expect(center.y).toBeCloseTo(5);
  });

  it('computes bbox center of an asymmetric shape', () => {
    // L-shape: bbox is 0..10 x 0..10, center at (5, 5)
    const d = 'M 0 0 L 10 0 L 10 5 L 5 5 L 5 10 L 0 10 Z';
    const center = computeBoundingBoxCenter(d)!;
    expect(center.x).toBeCloseTo(5);
    expect(center.y).toBeCloseTo(5);
  });

  it('returns null for empty path', () => {
    expect(computeBoundingBoxCenter('')).toBeNull();
  });
});

describe('computePolylabel', () => {
  it('finds center of a square', () => {
    const d = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
    const pole = computePolylabel(d)!;
    // Pole of inaccessibility of a square is its center
    expect(pole.x).toBeCloseTo(5, 0);
    expect(pole.y).toBeCloseTo(5, 0);
  });

  it('finds pole inside an L-shape (not at bbox center)', () => {
    // L-shape: bottom-left quadrant is filled, top spans full width
    // The widest inscribed circle should be in the larger arm
    const d = 'M 0 0 L 20 0 L 20 5 L 10 5 L 10 10 L 0 10 Z';
    const pole = computePolylabel(d)!;
    // Should be inside the polygon
    expect(pole.x).toBeGreaterThanOrEqual(0);
    expect(pole.x).toBeLessThanOrEqual(20);
    expect(pole.y).toBeGreaterThanOrEqual(0);
    expect(pole.y).toBeLessThanOrEqual(10);
    // The junction at (5, 5) is equidistant from top, left, bottom, and inner edges
    // (all distance 5), which is larger than the max inscribed circle in either arm alone (2.5).
    // So the pole should be near the junction.
    expect(pole.x).toBeCloseTo(5, 0);
    expect(pole.y).toBeCloseTo(5, 0);
  });

  it('Portugal polylabel is more central than polygon centroid', () => {
    const PORTUGAL_PATH = 'M -7.1 -38.83 L -7.27 -38.74 L -7.36 -38.45 L -7.14 -38.18 L -7.41 -37.82 L -7.49 -37.56 L -7.87 -37.11 L -8.16 -37.1 L -8.63 -37.41 L -8.77 -37.48 L -8.8 -37.77 L -8.97 -37.83 L -8.91 -38.28 L -9.4 -38.61 L -9.49 -38.83 L -9.3 -39.02 L -9.34 -39.54 L -8.91 -40.03 L -8.65 -40.78 L -8.76 -41.33 L -8.78 -41.5 L -8.66 -41.58 L -8.2 -41.77 L -8.07 -41.81 L -7.51 -41.87 L -7.18 -41.96 L -6.57 -41.92 L -6.21 -41.6 L -6.51 -41.04 L -6.86 -40.89 L -6.95 -40.22 L -7.01 -40.2 L -6.95 -39.99 L -7.54 -39.65 L -7.53 -39.49 L -7.17 -39.15 L -7.01 -39.04 L -7.1 -38.83 Z';

    const centroid = computePathCentroid(PORTUGAL_PATH);
    const polylabelResult = computePolylabel(PORTUGAL_PATH);
    const bboxCenterResult = computeBoundingBoxCenter(PORTUGAL_PATH);

    expect(polylabelResult).not.toBeNull();
    expect(bboxCenterResult).not.toBeNull();
    const polylabelPos = polylabelResult!;
    const bboxCenter = bboxCenterResult!;

    // Bbox center x should be approximately (-9.49 + -6.21) / 2 = -7.85
    expect(bboxCenter.x).toBeCloseTo(-7.85, 1);

    // All three produce distinct positions (differ by at least 0.1 in x or y)
    const dist_poly_centroid = Math.sqrt((polylabelPos.x - centroid.x) ** 2 + (polylabelPos.y - centroid.y) ** 2);
    const dist_poly_bbox = Math.sqrt((polylabelPos.x - bboxCenter.x) ** 2 + (polylabelPos.y - bboxCenter.y) ** 2);
    expect(dist_poly_centroid).toBeGreaterThan(0.1);
    expect(dist_poly_bbox).toBeGreaterThan(0.1);

    // All three should have y in the Portugal range (-37 to -42)
    expect(polylabelPos.y).toBeLessThan(-37);
    expect(polylabelPos.y).toBeGreaterThan(-42);
  });

  it('returns null for empty path', () => {
    expect(computePolylabel('')).toBeNull();
  });

  it('returns null for degenerate path', () => {
    expect(computePolylabel('M 5 5')).toBeNull();
  });
});

describe('computeDistanceToEdge', () => {
  const square = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';

  it('returns positive distance for a point inside the polygon', () => {
    const dist = computeDistanceToEdge(square, { x: 5, y: 5 });
    expect(dist).toBeCloseTo(5, 0);
  });

  it('returns negative distance for a point outside the polygon', () => {
    const dist = computeDistanceToEdge(square, { x: 15, y: 5 });
    expect(dist).toBeLessThan(0);
  });

  it('returns higher distance for center than for point near edge', () => {
    const centerDist = computeDistanceToEdge(square, { x: 5, y: 5 });
    const nearEdgeDist = computeDistanceToEdge(square, { x: 1, y: 5 });
    expect(centerDist).toBeGreaterThan(nearEdgeDist);
  });

  it('returns 0 for degenerate paths', () => {
    expect(computeDistanceToEdge('M 5 5', { x: 5, y: 5 })).toBe(0);
  });
});
