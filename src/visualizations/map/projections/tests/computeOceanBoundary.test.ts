import { computeOceanBoundary } from '../computeOceanBoundary';
import { equirectangularProjection } from '../equirectangular';
import { webMercatorProjection } from '../webMercator';
import { equalEarthProjection } from '../equalEarth';

describe('computeOceanBoundary', () => {
  it('returns a closed path that starts with M and ends with Z', () => {
    const d = computeOceanBoundary(equirectangularProjection);
    expect(d).toMatch(/^M /);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('contains only M, L and Z command letters', () => {
    const d = computeOceanBoundary(equalEarthProjection);
    const commands = d.match(/[A-Za-z]/g) ?? [];
    for (const cmd of commands) {
      expect(['M', 'L', 'Z']).toContain(cmd);
    }
  });

  it('produces a wider bounding box for equirectangular than for Equal Earth at the poles', () => {
    // Equal Earth narrows toward the poles; equirectangular keeps full width.
    const equiBounds = pathBounds(computeOceanBoundary(equirectangularProjection));
    const eeBounds = pathBounds(computeOceanBoundary(equalEarthProjection));
    expect(equiBounds.maxX - equiBounds.minX).toBeGreaterThan(eeBounds.maxX - eeBounds.minX);
  });

  it('clips Web Mercator latitude range to keep it finite', () => {
    const d = computeOceanBoundary(webMercatorProjection);
    const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
    for (const n of numbers) {
      expect(Number.isFinite(n)).toBe(true);
    }
  });
});

function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < numbers.length; i += 2) {
    const x = numbers[i];
    const y = numbers[i + 1];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
