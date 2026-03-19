import { closestPointOnPath } from '../closestPointOnPath';

describe('closestPointOnPath', () => {
  it('returns undefined for empty path', () => {
    expect(closestPointOnPath({ x: 0, y: 0 }, '')).toBeUndefined();
  });

  it('returns the single point for a single-point path', () => {
    const result = closestPointOnPath({ x: 5, y: 5 }, 'M 10 20');
    expect(result).toEqual({ x: 10, y: 20 });
  });

  it('finds the closest point on a horizontal segment', () => {
    // Horizontal line from (0,0) to (10,0), click at (5, 3)
    const result = closestPointOnPath({ x: 5, y: 3 }, 'M 0 0 L 10 0');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(5, 5);
    expect(result!.y).toBeCloseTo(0, 5);
  });

  it('clamps to segment start when projection is before the segment', () => {
    // Line from (5,0) to (10,0), click at (0, 0) — closest is start
    const result = closestPointOnPath({ x: 0, y: 0 }, 'M 5 0 L 10 0');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(5, 5);
    expect(result!.y).toBeCloseTo(0, 5);
  });

  it('clamps to segment end when projection is beyond the segment', () => {
    // Line from (0,0) to (5,0), click at (10, 0) — closest is end
    const result = closestPointOnPath({ x: 10, y: 0 }, 'M 0 0 L 5 0');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(5, 5);
    expect(result!.y).toBeCloseTo(0, 5);
  });

  it('finds the closest point on a diagonal segment', () => {
    // Line from (0,0) to (10,10), click at (0, 10) — closest is midpoint (5, 5)
    const result = closestPointOnPath({ x: 0, y: 10 }, 'M 0 0 L 10 10');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(5, 5);
    expect(result!.y).toBeCloseTo(5, 5);
  });

  it('handles multi-segment paths and picks the closest segment', () => {
    // Two segments: (0,0)-(10,0) and (10,0)-(10,10)
    // Click at (10, 5) — closest is on second segment at (10, 5)
    const result = closestPointOnPath({ x: 10, y: 5 }, 'M 0 0 L 10 0 L 10 10');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(10, 5);
    expect(result!.y).toBeCloseTo(5, 5);
  });

  it('handles multiple subpaths (M commands in the middle)', () => {
    // Two subpaths: (0,0)-(5,0) and (20,0)-(25,0)
    // Click at (22, 1) — closest is on second subpath
    const result = closestPointOnPath({ x: 22, y: 1 }, 'M 0 0 L 5 0 M 20 0 L 25 0');
    expect(result).toBeDefined();
    expect(result!.x).toBeCloseTo(22, 5);
    expect(result!.y).toBeCloseTo(0, 5);
  });

  it('handles negative coordinates (typical for equirectangular river paths)', () => {
    // Typical river path with negative y (= positive latitude)
    const result = closestPointOnPath(
      { x: 15, y: -48 },
      'M 10 -50 L 20 -45',
    );
    expect(result).toBeDefined();
    // Should project onto the line somewhere between the two points
    expect(result!.x).toBeGreaterThan(10);
    expect(result!.x).toBeLessThan(20);
  });
});
