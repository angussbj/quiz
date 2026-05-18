import { equalEarthProjection } from '../equalEarth';

describe('equalEarthProjection', () => {
  it('projects (0, 0) to viewBox origin', () => {
    const result = equalEarthProjection.project({ latitude: 0, longitude: 0 });
    expect(result.x).toBeCloseTo(0, 6);
    expect(result.y).toBeCloseTo(0, 6);
  });

  it('matches equirectangular scale at the equator', () => {
    // At the equator, 1° of longitude should equal 1 viewBox unit.
    const result = equalEarthProjection.project({ latitude: 0, longitude: 90 });
    expect(result.x).toBeCloseTo(90, 4);
  });

  it('compresses longitude near the poles', () => {
    const equator = equalEarthProjection.project({ latitude: 0, longitude: 90 }).x;
    const arctic = equalEarthProjection.project({ latitude: 75, longitude: 90 }).x;
    expect(Math.abs(arctic)).toBeLessThan(Math.abs(equator));
  });

  it('produces finite output at the poles', () => {
    const northPole = equalEarthProjection.project({ latitude: 90, longitude: 0 });
    const southPole = equalEarthProjection.project({ latitude: -90, longitude: 0 });
    expect(Number.isFinite(northPole.y)).toBe(true);
    expect(Number.isFinite(southPole.y)).toBe(true);
    expect(northPole.x).toBeCloseTo(0, 6);
    expect(southPole.x).toBeCloseTo(0, 6);
  });

  it('mirrors north and south latitudes', () => {
    const north = equalEarthProjection.project({ latitude: 30, longitude: 50 });
    const south = equalEarthProjection.project({ latitude: -30, longitude: 50 });
    expect(south.x).toBeCloseTo(north.x, 6);
    expect(south.y).toBeCloseTo(-north.y, 6);
  });
});
