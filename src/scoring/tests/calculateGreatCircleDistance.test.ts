import { calculateGreatCircleDistance } from '../calculateGreatCircleDistance';

describe('calculateGreatCircleDistance', () => {
  it('returns 0 for the same point', () => {
    expect(calculateGreatCircleDistance(51.5, -0.12, 51.5, -0.12)).toBe(0);
  });

  it('calculates London to Paris (~340km)', () => {
    const distance = calculateGreatCircleDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(350);
  });

  it('calculates New York to Los Angeles (~3940km)', () => {
    const distance = calculateGreatCircleDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(3930);
    expect(distance).toBeLessThan(3960);
  });

  it('calculates antipodal points (~20000km)', () => {
    const distance = calculateGreatCircleDistance(0, 0, 0, 180);
    expect(distance).toBeGreaterThan(20000);
    expect(distance).toBeLessThan(20100);
  });

  it('handles negative latitudes (Sydney to Buenos Aires)', () => {
    const distance = calculateGreatCircleDistance(-33.8688, 151.2093, -34.6037, -58.3816);
    expect(distance).toBeGreaterThan(11700);
    expect(distance).toBeLessThan(11810);
  });

  it('is symmetric', () => {
    const ab = calculateGreatCircleDistance(51.5074, -0.1278, 48.8566, 2.3522);
    const ba = calculateGreatCircleDistance(48.8566, 2.3522, 51.5074, -0.1278);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('handles points on the equator', () => {
    // 1 degree of longitude at the equator ≈ 111.32 km
    const distance = calculateGreatCircleDistance(0, 0, 0, 1);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });

  it('handles points on the same meridian', () => {
    // 1 degree of latitude ≈ 111.32 km
    const distance = calculateGreatCircleDistance(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110);
    expect(distance).toBeLessThan(112);
  });
});
