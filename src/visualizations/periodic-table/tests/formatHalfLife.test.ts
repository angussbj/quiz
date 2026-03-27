import { formatHalfLife } from '../formatHalfLife';

describe('formatHalfLife', () => {
  it('returns "Stable" for undefined', () => {
    expect(formatHalfLife(undefined)).toBe('Stable');
  });

  it('formats gigayears', () => {
    // Bismuth-209: ~1.9e19 years = ~5.998e26 seconds
    const result = formatHalfLife(5.998e26);
    expect(result).toMatch(/Gy$/);
    // Should use scientific notation for very large values
    expect(result).toMatch(/e\d+/);
  });

  it('formats megayears', () => {
    // Plutonium-244: ~8.0e7 years = ~2.536e15 seconds
    const result = formatHalfLife(2.536e15);
    expect(result).toMatch(/My$/);
  });

  it('formats kiloyears', () => {
    // Protactinium-231: ~3.276e4 years = ~1.034e12 seconds
    const result = formatHalfLife(1.034e12);
    expect(result).toMatch(/ky$/);
  });

  it('formats plain years', () => {
    // ~1.6 years = ~5e7 seconds (below ky threshold)
    const result = formatHalfLife(5e7);
    expect(result).toMatch(/^\d+(\.\d+)? y$/);
  });

  it('formats kiloyears for Radium-226', () => {
    // Radium-226: ~1600 years = ~5.049e10 seconds
    const result = formatHalfLife(5.049e10);
    expect(result).toMatch(/ky$/);
  });

  it('formats days', () => {
    // Radon-222: ~3.82 days = ~330350 seconds
    const result = formatHalfLife(330350);
    expect(result).toMatch(/d$/);
  });

  it('formats hours', () => {
    const result = formatHalfLife(7200);
    expect(result).toMatch(/h$/);
  });

  it('formats minutes', () => {
    const result = formatHalfLife(1320);
    expect(result).toMatch(/min$/);
  });

  it('formats seconds', () => {
    const result = formatHalfLife(16);
    expect(result).toMatch(/s$/);
  });

  it('formats milliseconds', () => {
    const result = formatHalfLife(0.051);
    expect(result).toMatch(/ms$/);
  });

  it('formats microseconds with \u03bc symbol', () => {
    const result = formatHalfLife(0.000005);
    expect(result).toContain('\u03bcs');
  });

  it('formats nanoseconds', () => {
    const result = formatHalfLife(5e-9);
    expect(result).toMatch(/ns$/);
  });

  it('formats sub-nanosecond values in scientific notation', () => {
    const result = formatHalfLife(1e-12);
    expect(result).toMatch(/e-\d+ s$/);
  });

  it('rounds moderate Gy values', () => {
    // 19 billion years = 19 Gy
    const result = formatHalfLife(19e9 * 365.25 * 24 * 3600);
    expect(result).toBe('19 Gy');
  });

  it('rounds moderate unit values', () => {
    // 14 Gy (Thorium)
    const result = formatHalfLife(4.42e17);
    expect(result).toBe('14 Gy');
  });
});
