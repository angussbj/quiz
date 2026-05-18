import { webMercatorProjection } from '../webMercator';

describe('webMercatorProjection', () => {
  it('projects (0, 0) to viewBox origin', () => {
    const result = webMercatorProjection.project({ latitude: 0, longitude: 0 });
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBeCloseTo(0, 6);
  });

  it('keeps x linear in longitude', () => {
    // x should equal the wrapped longitude in degrees, just like equirectangular.
    expect(webMercatorProjection.project({ latitude: 0, longitude: 100 }).x).toBeCloseTo(100, 6);
    expect(webMercatorProjection.project({ latitude: 50, longitude: -45 }).x).toBeCloseTo(-45, 6);
  });

  it('stretches y away from the equator', () => {
    const equator = webMercatorProjection.project({ latitude: 0, longitude: 0 }).y;
    const tropic = webMercatorProjection.project({ latitude: 23.5, longitude: 0 }).y;
    const arctic = webMercatorProjection.project({ latitude: 66.5, longitude: 0 }).y;
    expect(tropic).toBeLessThan(equator);
    expect(arctic).toBeLessThan(tropic);
    // Mercator stretches more aggressively at higher latitudes.
    expect(Math.abs(arctic - tropic)).toBeGreaterThan(Math.abs(tropic - equator));
  });

  it('clips polar latitudes to avoid singularities', () => {
    const northPole = webMercatorProjection.project({ latitude: 89.9, longitude: 0 });
    const farNorth = webMercatorProjection.project({ latitude: 85, longitude: 0 });
    expect(northPole.y).toEqual(farNorth.y);
    expect(Number.isFinite(northPole.y)).toBe(true);
  });

  it('mirrors north and south', () => {
    const north = webMercatorProjection.project({ latitude: 30, longitude: 0 }).y;
    const south = webMercatorProjection.project({ latitude: -30, longitude: 0 }).y;
    expect(south).toBeCloseTo(-north, 6);
  });
});
