import { elevationToRgb, COLOR_STOPS } from '../hypsometricScale';

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

describe('elevationToRgb', () => {
  it('returns green for 0m (sea level)', () => {
    const color = elevationToRgb(0);
    expect(color.r).toBeGreaterThanOrEqual(80);
    expect(color.r).toBeLessThanOrEqual(130);
    expect(color.g).toBeGreaterThan(130);
    expect(color.b).toBeLessThan(120);
  });

  it('returns white-ish for 8849m (Everest)', () => {
    const color = elevationToRgb(8849);
    expect(color.r).toBeGreaterThan(230);
    expect(color.g).toBeGreaterThan(230);
    expect(color.b).toBeGreaterThan(230);
  });

  it('returns brownish for 1000m', () => {
    const color = elevationToRgb(1000);
    expect(color.r).toBeGreaterThan(170);
    expect(color.g).toBeLessThan(color.r);
    expect(color.b).toBeLessThan(color.g);
  });

  it('interpolates between stops', () => {
    // Midpoint between 0m and 50m should be midpoint of those stop colors
    const low = COLOR_STOPS[0];
    const high = COLOR_STOPS[1];
    const mid = elevationToRgb(25);
    expect(mid.r).toBeCloseTo((low.color.r + high.color.r) / 2, 0);
    expect(mid.g).toBeCloseTo((low.color.g + high.color.g) / 2, 0);
    expect(mid.b).toBeCloseTo((low.color.b + high.color.b) / 2, 0);
  });

  it('clamps below 0 to the first stop color', () => {
    const atZero = elevationToRgb(0);
    const belowZero = elevationToRgb(-500);
    expect(belowZero.r).toBe(atZero.r);
    expect(belowZero.g).toBe(atZero.g);
    expect(belowZero.b).toBe(atZero.b);
  });

  it('clamps above max elevation to the last stop color', () => {
    const atMax = elevationToRgb(8849);
    const aboveMax = elevationToRgb(10000);
    expect(aboveMax.r).toBe(atMax.r);
    expect(aboveMax.g).toBe(atMax.g);
    expect(aboveMax.b).toBe(atMax.b);
  });

  it('differentiates 100m from 1000m (color distance > 40)', () => {
    const lowland = elevationToRgb(100);
    const mountain = elevationToRgb(1000);
    expect(colorDistance(lowland, mountain)).toBeGreaterThan(40);
  });

  it('differentiates 1000m from 8000m (color distance > 50)', () => {
    const mountain = elevationToRgb(1000);
    const highPeak = elevationToRgb(8000);
    expect(colorDistance(mountain, highPeak)).toBeGreaterThan(50);
  });
});
