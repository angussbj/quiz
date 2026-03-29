import { starRadius } from '../starRadius';

describe('starRadius', () => {
  it('returns minimum radius for very dim stars', () => {
    const r = starRadius(0.00001);
    expect(r).toBeCloseTo(0.15, 1);
  });

  it('returns maximum radius for very bright stars', () => {
    // lum = 10^1.5 ≈ 31.6 -> t = (1.5+5)/6.5 = 1.0 -> radius = 0.8
    const r = starRadius(31.6);
    expect(r).toBeCloseTo(0.8, 1);
  });

  it('clamps to minimum for zero luminosity', () => {
    const r = starRadius(0);
    expect(r).toBeCloseTo(0.15, 1);
  });

  it('clamps to minimum for negative luminosity', () => {
    const r = starRadius(-5);
    expect(r).toBeCloseTo(0.15, 1);
  });

  it('returns a mid-range value for solar luminosity', () => {
    const r = starRadius(1); // log10(1) = 0, t = 5/6.5 ≈ 0.77
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(0.7);
  });

  it('brighter stars produce larger radii', () => {
    const dim = starRadius(0.001);
    const medium = starRadius(1);
    const bright = starRadius(20);
    expect(dim).toBeLessThan(medium);
    expect(medium).toBeLessThan(bright);
  });
});
