import { computePolygonDistance } from '../polygonDistance';

describe('computePolygonDistance', () => {
  // Simple square polygon: (0,0) → (10,0) → (10,10) → (0,10)
  const squarePath = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';

  describe('inside detection', () => {
    it('returns isInside=true for a point clearly inside the polygon', () => {
      const result = computePolygonDistance({ x: 5, y: 5 }, squarePath);
      expect(result.isInside).toBe(true);
    });

    it('returns borderPoint = clickPoint when inside', () => {
      const click = { x: 5, y: 5 };
      const result = computePolygonDistance(click, squarePath);
      expect(result.borderPoint).toEqual(click);
    });

    it('returns isInside=false for a point clearly outside', () => {
      const result = computePolygonDistance({ x: 20, y: 20 }, squarePath);
      expect(result.isInside).toBe(false);
    });
  });

  describe('outside distance', () => {
    it('returns closest border point to a point outside the polygon', () => {
      // Point at (15, 5): outside to the right. Closest border is the right edge x=10.
      const result = computePolygonDistance({ x: 15, y: 5 }, squarePath);
      expect(result.isInside).toBe(false);
      expect(result.borderPoint.x).toBeCloseTo(10);
      expect(result.borderPoint.y).toBeCloseTo(5);
    });

    it('returns correct closest point for a point below the polygon', () => {
      // Point at (5, 15): closest point is bottom edge y=10.
      const result = computePolygonDistance({ x: 5, y: 15 }, squarePath);
      expect(result.isInside).toBe(false);
      expect(result.borderPoint.x).toBeCloseTo(5);
      expect(result.borderPoint.y).toBeCloseTo(10);
    });

    it('returns corner as closest point for corner-adjacent point', () => {
      // Point at (15, 15): closest corner is (10, 10).
      const result = computePolygonDistance({ x: 15, y: 15 }, squarePath);
      expect(result.isInside).toBe(false);
      expect(result.borderPoint.x).toBeCloseTo(10);
      expect(result.borderPoint.y).toBeCloseTo(10);
    });
  });

  describe('multi-subpath polygons', () => {
    // Two squares: (0,0)→(5,5) and (10,0)→(15,5)
    const twoSquaresPath = 'M 0 0 L 5 0 L 5 5 L 0 5 Z M 10 0 L 15 0 L 15 5 L 10 5 Z';

    it('returns isInside=true for a point inside the first subpath', () => {
      const result = computePolygonDistance({ x: 2, y: 2 }, twoSquaresPath);
      expect(result.isInside).toBe(true);
    });

    it('returns isInside=true for a point inside the second subpath', () => {
      const result = computePolygonDistance({ x: 12, y: 2 }, twoSquaresPath);
      expect(result.isInside).toBe(true);
    });

    it('returns isInside=false for a point between the two subpaths', () => {
      const result = computePolygonDistance({ x: 7.5, y: 2 }, twoSquaresPath);
      expect(result.isInside).toBe(false);
    });

    it('returns the closest border point across all subpaths', () => {
      // Point at (7.5, 2): between two squares. Closest border is right edge of left square (x=5)
      // or left edge of right square (x=10). Distance to x=5 is 2.5, to x=10 is 2.5 — equal.
      // Point at (6, 2): closer to left square's right edge (x=5, dist=1) than right square's left edge (x=10, dist=4).
      const result = computePolygonDistance({ x: 6, y: 2 }, twoSquaresPath);
      expect(result.isInside).toBe(false);
      expect(result.borderPoint.x).toBeCloseTo(5);
      expect(result.borderPoint.y).toBeCloseTo(2);
    });
  });

  describe('path without Z (unclosed)', () => {
    // Paths without Z: the closing segment (last→first) is still added by closestPointOnSubpath
    const openSquare = 'M 0 0 L 10 0 L 10 10 L 0 10';

    it('still detects points inside an open path (ray casting works on polygon vertices)', () => {
      // Ray casting doesn't depend on Z — it iterates edges including wrapping last→first
      const result = computePolygonDistance({ x: 5, y: 5 }, openSquare);
      expect(result.isInside).toBe(true);
    });
  });
});
