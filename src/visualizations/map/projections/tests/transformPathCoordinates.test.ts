import { transformPathCoordinates } from '../transformPathCoordinates';
import { equirectangularProjection } from '../equirectangular';
import { webMercatorProjection } from '../webMercator';
import { equalEarthProjection } from '../equalEarth';

describe('transformPathCoordinates', () => {
  it('passes through unchanged for the equirectangular projection', () => {
    const input = 'M 10 20 L 30 40 Z';
    expect(transformPathCoordinates(input, equirectangularProjection)).toBe(input);
  });

  it('preserves M/L/Z command letters', () => {
    const result = transformPathCoordinates('M 0 0 L 10 0 L 10 -10 Z', webMercatorProjection);
    expect(result).toMatch(/^M /);
    expect(result).toMatch(/L /g);
    expect(result.endsWith('Z')).toBe(true);
  });

  it('keeps x linear in Web Mercator (so longitudes are unchanged)', () => {
    const result = transformPathCoordinates('M 50 0', webMercatorProjection);
    // First number after M is x; should still be 50 since lat=0 maps lng linearly.
    const firstNumber = parseFloat(result.match(/-?\d+(?:\.\d+)?/)?.[0] ?? 'NaN');
    expect(firstNumber).toBeCloseTo(50, 4);
  });

  it('changes y values in Web Mercator away from the equator', () => {
    const original = 'M 0 -45';
    const transformed = transformPathCoordinates(original, webMercatorProjection);
    expect(transformed).not.toBe(original);
  });

  it('handles paths with negative coordinates', () => {
    const result = transformPathCoordinates('M -10 -20 L 30 -40', equalEarthProjection);
    const numbers = (result.match(/-?\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
    expect(numbers).toHaveLength(4);
    expect(Number.isFinite(numbers[0])).toBe(true);
    expect(Number.isFinite(numbers[1])).toBe(true);
  });

  it('round-trips through itself when projection is equirectangular', () => {
    const input = 'M 100 -50 L 110 -60 Z';
    const out = transformPathCoordinates(input, equirectangularProjection);
    expect(out).toBe(input);
  });

  it('clips paths that cross the wrap meridian into separate sub-paths', () => {
    // Path goes from -165 (above WRAP=-169) to -175 (below) and back to -160.
    // Should produce two sub-paths: the above pieces and the below piece (shifted +360).
    const input = 'M -165 -80 L -175 -80 L -160 -80 Z';
    const result = transformPathCoordinates(input, webMercatorProjection);
    // Should have multiple M commands (one per sub-path)
    const mCount = (result.match(/M /g) ?? []).length;
    expect(mCount).toBeGreaterThan(1);
    // No L command should connect x-values more than 180° apart
    const parts = result.split(/(?=[ML])/);
    let prevX: number | undefined;
    for (const part of parts) {
      const nums = part.match(/-?\d+(?:\.\d+)?/g);
      if (!nums) continue;
      const x = parseFloat(nums[0]);
      if (part.trimStart().startsWith('L') && prevX !== undefined) {
        expect(Math.abs(x - prevX)).toBeLessThan(180);
      }
      prevX = x;
    }
  });
});
