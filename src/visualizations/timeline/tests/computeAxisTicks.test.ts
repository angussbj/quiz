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

  it('uses million-year ticks for geological ranges', () => {
    // Species evolution: 4 billion years in 1000px
    const ticks = computeAxisTicks(-4_000_000_000, 0, 1000);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThanOrEqual(300);
    // Should be using geological intervals (major ticks >> 1000 years apart)
    const majorTicks = ticks.filter((t) => t.isMajor);
    const spacing = majorTicks.length >= 2 ? majorTicks[1].fractionalYear - majorTicks[0].fractionalYear : Infinity;
    expect(Math.abs(spacing)).toBeGreaterThan(1_000_000);
  });

  it('labels geological ticks with Ga or Ma notation', () => {
    const ticks = computeAxisTicks(-4_600_000_000, 0, 1000);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThanOrEqual(300);
    const majorTicks = ticks.filter((t) => t.isMajor);
    // Labels should use geological notation (Ga or Ma), not raw year numbers
    expect(majorTicks.some((t) => t.label.includes('Ga') || t.label.includes('Ma'))).toBe(true);
  });

  it('caps tick count at 300 regardless of range', () => {
    // Deliberately pathological: tiny range with fine ticks forced
    const ticks = computeAxisTicks(-1_000_000_000_000, 0, 1);
    expect(ticks.length).toBeLessThanOrEqual(300);
  });
});
