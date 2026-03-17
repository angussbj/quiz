import { computeAxisTicks } from '../computeAxisTicks';

describe('computeAxisTicks', () => {
  it('returns empty array for zero range', () => {
    expect(computeAxisTicks(2000, 2000, 800)).toEqual([]);
  });

  it('returns empty array for zero pixels', () => {
    expect(computeAxisTicks(1900, 2000, 0)).toEqual([]);
  });

  it('generates decade major ticks for a century range', () => {
    const ticks = computeAxisTicks(1900, 2000, 800);
    const majorTicks = ticks.filter((t) => t.isMajor);
    // Should have decade boundaries as major ticks
    expect(majorTicks.length).toBeGreaterThan(0);
    for (const tick of majorTicks) {
      expect(tick.fractionalYear % 10).toBeCloseTo(0, 1);
    }
  });

  it('generates year ticks when zoomed in on a decade', () => {
    const ticks = computeAxisTicks(1990, 2000, 800);
    const minorTicks = ticks.filter((t) => !t.isMajor);
    // With 80px per year, should show year-level minor ticks
    expect(minorTicks.length).toBeGreaterThan(0);
  });

  it('generates month ticks when zoomed into a single year', () => {
    // 800px for 1 year = 800px/year, minor at 1/12 year = ~67px per tick
    const ticks = computeAxisTicks(2000, 2001, 800);
    const minorTicks = ticks.filter((t) => !t.isMajor);
    // Should see month-level ticks
    expect(minorTicks.length).toBeGreaterThanOrEqual(10);
  });

  it('all ticks fall within or near the range', () => {
    const ticks = computeAxisTicks(1950, 1960, 400);
    for (const tick of ticks) {
      expect(tick.fractionalYear).toBeGreaterThanOrEqual(1949);
      expect(tick.fractionalYear).toBeLessThanOrEqual(1961);
    }
  });

  it('uses century-level ticks for very large ranges', () => {
    const ticks = computeAxisTicks(0, 2000, 800);
    const majorTicks = ticks.filter((t) => t.isMajor);
    // Major ticks should be at millennium boundaries
    expect(majorTicks.some((t) => t.fractionalYear === 1000)).toBe(true);
  });
});
