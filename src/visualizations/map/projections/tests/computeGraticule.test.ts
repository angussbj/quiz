import { computeGraticule } from '../computeGraticule';
import { equirectangularProjection } from '../equirectangular';
import { webMercatorProjection } from '../webMercator';
import { equalEarthProjection } from '../equalEarth';

function countMoves(d: string): number {
  return (d.match(/M /g) ?? []).length;
}

describe('computeGraticule', () => {
  it('produces multiple line segments (each starts with M)', () => {
    const d = computeGraticule(equirectangularProjection);
    expect(countMoves(d)).toBeGreaterThan(10);
  });

  it('uses only M and L commands', () => {
    const d = computeGraticule(equalEarthProjection);
    const commands = d.match(/[A-Za-z]/g) ?? [];
    for (const cmd of commands) {
      expect(['M', 'L']).toContain(cmd);
    }
  });

  it('skips parallels outside the projection latitude range', () => {
    // Web Mercator clips at ±85°, so it has fewer parallels than equirectangular.
    const equiMoves = countMoves(computeGraticule(equirectangularProjection));
    const mercatorMoves = countMoves(computeGraticule(webMercatorProjection));
    expect(mercatorMoves).toBeLessThan(equiMoves);
  });

  it('produces only finite coordinates', () => {
    const d = computeGraticule(webMercatorProjection);
    const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(parseFloat);
    for (const n of numbers) {
      expect(Number.isFinite(n)).toBe(true);
    }
  });
});
