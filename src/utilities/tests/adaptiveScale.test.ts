import { computeAdaptiveScale } from '../adaptiveScale';

describe('computeAdaptiveScale', () => {
  describe('edge cases', () => {
    it('returns 0.5 for empty array', () => {
      const scale = computeAdaptiveScale([]);
      expect(scale.transform(42)).toBe(0.5);
      expect(scale.curve).toBe('linear');
    });

    it('returns 0.5 for single value', () => {
      const scale = computeAdaptiveScale([7]);
      expect(scale.transform(7)).toBe(0.5);
      expect(scale.curve).toBe('linear');
    });

    it('returns 0.5 for all identical values', () => {
      const scale = computeAdaptiveScale([3, 3, 3, 3]);
      expect(scale.transform(3)).toBe(0.5);
    });

    it('handles two distinct values', () => {
      const scale = computeAdaptiveScale([0, 100]);
      expect(scale.transform(0)).toBeCloseTo(0);
      expect(scale.transform(100)).toBeCloseTo(1);
    });
  });

  describe('output range', () => {
    it('maps minimum value to 0 and maximum to 1', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const scale = computeAdaptiveScale(values);
      expect(scale.transform(1)).toBeCloseTo(0);
      expect(scale.transform(10)).toBeCloseTo(1);
    });

    it('returns negative values for inputs below the range', () => {
      const scale = computeAdaptiveScale([10, 20, 30]);
      expect(scale.transform(0)).toBeLessThan(0);
    });

    it('returns values above 1 for inputs above the range', () => {
      const scale = computeAdaptiveScale([10, 20, 30]);
      expect(scale.transform(100)).toBeGreaterThan(1);
    });

    it('produces values between 0 and 1 for interior points', () => {
      const values = [1, 5, 10, 50, 100, 500, 1000];
      const scale = computeAdaptiveScale(values);
      for (const v of values) {
        const t = scale.transform(v);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('monotonicity', () => {
    it('preserves ordering of values', () => {
      const values = [1, 3, 7, 15, 100, 500, 10000];
      const scale = computeAdaptiveScale(values);
      const transformed = values.map((v) => scale.transform(v));
      for (let i = 1; i < transformed.length; i++) {
        expect(transformed[i]).toBeGreaterThan(transformed[i - 1]);
      }
    });
  });

  describe('curve selection', () => {
    it('picks linear for already-uniform data', () => {
      const values = Array.from({ length: 20 }, (_, i) => i * 5);
      const scale = computeAdaptiveScale(values);
      expect(scale.curve).toBe('linear');
      expect(scale.center).toBeUndefined();
    });

    it('picks a non-linear curve for exponentially distributed data', () => {
      // Values like 1, 10, 100, 1000, ... — heavily right-skewed
      const values = Array.from({ length: 20 }, (_, i) => Math.pow(10, i * 0.3));
      const scale = computeAdaptiveScale(values);
      expect(scale.curve).not.toBe('linear');
    });

    it('spreads exponential data more evenly than linear would', () => {
      const values = Array.from({ length: 20 }, (_, i) => Math.pow(10, i * 0.3));
      const scale = computeAdaptiveScale(values);

      const transformed = [...values].sort((a, b) => a - b).map((v) => scale.transform(v));
      const gaps = [];
      for (let i = 1; i < transformed.length; i++) {
        gaps.push(transformed[i] - transformed[i - 1]);
      }

      // With linear scaling, the first 15+ values would be crammed into the bottom 10%
      // With adaptive scaling, the gap variance should be much lower
      const gapMean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      const gapVar = gaps.reduce((a, b) => a + (b - gapMean) ** 2, 0) / gaps.length;

      // Linear gap variance for this data would be very high (most values crammed near 0).
      // Adaptive should produce a much more even spread.
      expect(gapVar).toBeLessThan(0.01);
    });

    it('picks pure log for data spanning many orders of magnitude', () => {
      // Values like element costs: $0.1 to $10^20 — log-uniform
      const values = Array.from({ length: 20 }, (_, i) => Math.pow(10, i));
      const scale = computeAdaptiveScale(values);
      expect(scale.curve).toBe('log');
      expect(scale.center).toBeUndefined();
    });

    it('handles data clustered in the middle', () => {
      // Most values near 50, with outliers at 0 and 100
      const values = [0, 1, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 99, 100];
      const scale = computeAdaptiveScale(values);

      // Should pick a non-linear curve that expands the cluster around 50
      // The middle cluster should be spread out, not crammed together
      const clusterRange = scale.transform(55) - scale.transform(45);
      expect(clusterRange).toBeGreaterThan(0.3);
    });
  });

  describe('center finding', () => {
    it('finds center in a right-skewed distribution when centered curve wins', () => {
      // Many small values, few large ones — pure log or centered curve should win
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100, 1000, 10000];
      const scale = computeAdaptiveScale(values);
      // Should pick a non-linear curve
      expect(scale.curve).not.toBe('linear');
      // If a centered curve won, center should be near the cluster
      if (scale.center !== undefined) {
        expect(scale.center).toBeLessThan(50);
      }
    });

    it('finds center in a left-skewed distribution when centered curve wins', () => {
      // Few small values, many large ones clustered together
      const values = [1, 100, 900, 910, 920, 930, 940, 950, 960, 970, 980, 990, 1000];
      const scale = computeAdaptiveScale(values);
      if (scale.center !== undefined) {
        expect(scale.center).toBeGreaterThan(800);
      }
    });
  });

  describe('realistic data distributions', () => {
    it('handles density-like data (many clustered low, few high outliers)', () => {
      // Approximate element densities in g/cm³
      const densities = [
        0.09, 0.53, 0.86, 0.97, 1.55, 1.74, 1.85, 2.07, 2.33, 2.70,
        3.00, 3.51, 4.47, 4.81, 5.32, 5.73, 6.11, 6.68, 7.13, 7.31,
        7.87, 8.57, 8.90, 8.96, 9.75, 10.22, 11.34, 11.85, 12.02, 13.31,
        13.55, 16.65, 19.30, 19.82, 21.45, 22.59,
      ];
      const scale = computeAdaptiveScale(densities);

      // Should produce a reasonable spread
      const transformed = densities.map((v) => scale.transform(v));
      const uniqueTransformed = new Set(transformed.map((t) => Math.round(t * 100)));
      // At least 70% of values should map to distinct percentile buckets
      expect(uniqueTransformed.size).toBeGreaterThan(densities.length * 0.7);
    });

    it('handles year-discovered-like data (clustered 1700-1950)', () => {
      const years = [
        -5000, -3000, -1500, 1250, 1669, 1735, 1751, 1753, 1766, 1772,
        1774, 1778, 1782, 1783, 1789, 1791, 1794, 1797, 1801, 1802,
        1803, 1807, 1808, 1811, 1817, 1825, 1826, 1839, 1843, 1860,
        1863, 1875, 1878, 1885, 1886, 1894, 1898, 1899, 1900, 1901,
        1907, 1913, 1917, 1923, 1937, 1939, 1940, 1944, 1945, 1950,
        1952, 1961, 1974, 1981, 1994, 2003, 2009, 2010,
      ];
      const scale = computeAdaptiveScale(years);

      // The 1700-1950 cluster should be spread across a significant portion of [0,1]
      const range1700to1950 = scale.transform(1950) - scale.transform(1700);
      expect(range1700to1950).toBeGreaterThan(0.3);
    });
  });

  describe('determinism', () => {
    it('produces the same result for the same input', () => {
      const values = [1, 5, 10, 50, 100, 500, 1000];
      const scale1 = computeAdaptiveScale(values);
      const scale2 = computeAdaptiveScale(values);

      expect(scale1.curve).toBe(scale2.curve);
      expect(scale1.center).toBe(scale2.center);
      for (const v of values) {
        expect(scale1.transform(v)).toBe(scale2.transform(v));
      }
    });

    it('is independent of input order', () => {
      const values = [100, 1, 50, 10, 500, 5, 1000];
      const sorted = [...values].sort((a, b) => a - b);
      const scale1 = computeAdaptiveScale(values);
      const scale2 = computeAdaptiveScale(sorted);

      expect(scale1.curve).toBe(scale2.curve);
      for (const v of values) {
        expect(scale1.transform(v)).toBeCloseTo(scale2.transform(v));
      }
    });
  });

  describe('outlier handling', () => {
    it('maps extreme outliers outside [0, 1]', () => {
      // One massive outlier at 1e10, rest clustered 1-100
      const values = [1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 1e10];
      const scale = computeAdaptiveScale(values);

      // The outlier should map above 1
      expect(scale.transform(1e10)).toBeGreaterThan(1);
      // Non-outlier values should still span [0, 1]
      expect(scale.transform(1)).toBeCloseTo(0, 1);
      expect(scale.transform(100)).toBeCloseTo(1, 1);
    });

    it('maps low outliers below 0', () => {
      const values = [-1e10, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const scale = computeAdaptiveScale(values);

      expect(scale.transform(-1e10)).toBeLessThan(0);
      expect(scale.transform(100)).toBeCloseTo(1, 1);
    });

    it('does not create outliers when data is evenly distributed', () => {
      const values = Array.from({ length: 20 }, (_, i) => i * 5);
      const scale = computeAdaptiveScale(values);

      // All values should be in [0, 1]
      for (const v of values) {
        const t = scale.transform(v);
        expect(t).toBeGreaterThanOrEqual(-0.01);
        expect(t).toBeLessThanOrEqual(1.01);
      }
    });
  });

  describe('negative values', () => {
    it('handles a mix of negative and positive values', () => {
      const values = [-100, -50, -10, 0, 10, 50, 100];
      const scale = computeAdaptiveScale(values);
      expect(scale.transform(-100)).toBeCloseTo(0);
      expect(scale.transform(100)).toBeCloseTo(1);

      const transformed = values.map((v) => scale.transform(v));
      for (let i = 1; i < transformed.length; i++) {
        expect(transformed[i]).toBeGreaterThan(transformed[i - 1]);
      }
    });

    it('handles all negative values', () => {
      const values = [-1000, -500, -100, -50, -10, -5, -1];
      const scale = computeAdaptiveScale(values);
      expect(scale.transform(-1000)).toBeCloseTo(0);
      expect(scale.transform(-1)).toBeCloseTo(1);
    });
  });
});
