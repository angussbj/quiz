import { equirectangularProjection } from '../equirectangular';

describe('equirectangularProjection', () => {
  it('projects (0, 0) to viewBox origin', () => {
    const result = equirectangularProjection.project({ latitude: 0, longitude: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(-0);
  });

  it('projects positive latitude to negative y (north up)', () => {
    expect(equirectangularProjection.project({ latitude: 45, longitude: 10 })).toEqual({ x: 10, y: -45 });
  });

  it('wraps longitudes west of the wrap meridian', () => {
    // -170 is just west of WRAP_LONGITUDE (-169), so it should be shifted to 190.
    const result = equirectangularProjection.project({ latitude: 0, longitude: -170 });
    expect(result.x).toBe(190);
    expect(result.y).toBe(-0);
  });

  it('keeps longitudes east of the wrap meridian as-is', () => {
    const result = equirectangularProjection.project({ latitude: 0, longitude: 100 });
    expect(result.x).toBe(100);
    expect(result.y).toBe(-0);
  });
});
