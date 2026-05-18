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
});
