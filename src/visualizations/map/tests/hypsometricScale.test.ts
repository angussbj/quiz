import { elevationToRgb } from '../hypsometricScale';

function colorDistance(
  a: { readonly r: number; readonly g: number; readonly b: number },
  b: { readonly r: number; readonly g: number; readonly b: number },
): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

describe('elevationToRgb', () => {
  it('returns purple-ish for 0m (sea level)', () => {
    const color = elevationToRgb(0);
    // t=0 → hue=280° (purple): high blue, some red, low green
    expect(color.b).toBeGreaterThan(color.g);
  });

  it('returns pink/magenta-ish for 8849m (Everest)', () => {
    const color = elevationToRgb(8849);
    // t=1 → hue=320° (magenta): high red, low green
    expect(color.r).toBeGreaterThan(color.g);
  });

  it('returns greenish for moderate elevations (~1000m)', () => {
    const color = elevationToRgb(1000);
    // sqrt(1000/8849) ≈ 0.34 → hue around 160° (cyan-green)
    expect(color.g).toBeGreaterThan(color.r);
  });

  it('supports negative elevations (Dead Sea, Death Valley)', () => {
    const negative = elevationToRgb(-400);
    const zero = elevationToRgb(0);
    // Negative should be different from zero (not clamped)
    expect(colorDistance(negative, zero)).toBeGreaterThan(10);
  });

  it('clamps below minimum to the first color', () => {
    const atMin = elevationToRgb(-500);
    const belowMin = elevationToRgb(-1000);
    expect(belowMin).toEqual(atMin);
  });

  it('clamps above max elevation to the last color', () => {
    const atMax = elevationToRgb(8849);
    const aboveMax = elevationToRgb(10000);
    expect(aboveMax).toEqual(atMax);
  });

  it('differentiates 100m from 1000m (color distance > 40)', () => {
    expect(colorDistance(elevationToRgb(100), elevationToRgb(1000))).toBeGreaterThan(40);
  });

  it('differentiates 1000m from 8000m (color distance > 50)', () => {
    expect(colorDistance(elevationToRgb(1000), elevationToRgb(8000))).toBeGreaterThan(50);
  });

  it('linear scaling distributes colors more evenly', () => {
    const sqrtLow = elevationToRgb(500, 'sqrt');
    const sqrtHigh = elevationToRgb(5000, 'sqrt');
    const linLow = elevationToRgb(500, 'linear');
    const linHigh = elevationToRgb(5000, 'linear');
    // Both should differentiate, but the colors will differ
    expect(colorDistance(sqrtLow, sqrtHigh)).toBeGreaterThan(30);
    expect(colorDistance(linLow, linHigh)).toBeGreaterThan(30);
    // sqrt and linear at same elevation should differ
    expect(colorDistance(sqrtLow, linLow)).toBeGreaterThan(5);
  });

  it('produces valid RGB values (0-255) across the full range', () => {
    for (const elev of [-500, -200, 0, 100, 500, 1000, 2000, 4000, 6000, 8849]) {
      for (const scaling of ['sqrt', 'linear'] as const) {
        const color = elevationToRgb(elev, scaling);
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      }
    }
  });
});
