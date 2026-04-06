/**
 * Adaptive scale: automatically chooses the best curve to produce the most
 * even spread of data points across [0, 1].
 *
 * Candidates:
 *   - linear: identity
 *   - log: pure log(x - min + 1), ideal for data spanning many orders of magnitude
 *   - centered-log: sign(x-c)·log(|x-c|+1), expands a dense cluster
 *   - centered-sqrt: sign(x-c)·√|x-c|, mild cluster expansion
 *
 * The algorithm finds the densest region via a sliding window (MAD-based width),
 * evaluates all candidates, and picks whichever gives the most uniform
 * distribution as measured by gap variance.
 */

export type ScaleCurve = 'linear' | 'log' | 'centered-log' | 'centered-sqrt';

export interface AdaptiveScale {
  /**
   * Maps a raw value to a normalized position. Non-outlier values map to [0, 1].
   * Outliers may return values < 0 (low outlier) or > 1 (high outlier).
   * Consumers should handle out-of-range values (e.g., special outlier colours).
   */
  readonly transform: (value: number) => number;
  /** Which curve was selected. */
  readonly curve: ScaleCurve;
  /** The center point for centered-log/centered-sqrt transforms, undefined otherwise. */
  readonly center: number | undefined;
}

/**
 * Compute an adaptive scale for a set of numeric values.
 * Returns a transform function that maps raw values to [0, 1] with
 * the most even spread achievable from the candidate curves.
 */
export function computeAdaptiveScale(values: ReadonlyArray<number>): AdaptiveScale {
  if (values.length === 0) {
    return { transform: () => 0.5, curve: 'linear', center: undefined };
  }
  if (values.length === 1) {
    return { transform: () => 0.5, curve: 'linear', center: undefined };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  if (max === min) {
    return { transform: () => 0.5, curve: 'linear', center: undefined };
  }

  const center = findDensestCenter(sorted);

  const candidates: ReadonlyArray<{ readonly curve: ScaleCurve; readonly center: number | undefined; readonly applyRaw: (x: number) => number }> = [
    { curve: 'linear', center: undefined, applyRaw: (x: number) => x },
    { curve: 'log', center: undefined, applyRaw: (x: number) => pureLog(x, min) },
    { curve: 'centered-log', center, applyRaw: (x: number) => centeredLog(x, center) },
    { curve: 'centered-sqrt', center, applyRaw: (x: number) => centeredSqrt(x, center) },
  ];

  let bestVariance = Infinity;
  let bestCandidate = candidates[0];

  for (const candidate of candidates) {
    const transformed = sorted.map(candidate.applyRaw);
    const variance = outlierAwareGapVariance(transformed);

    if (variance < bestVariance) {
      bestVariance = variance;
      bestCandidate = candidate;
    }
  }

  const { curve: bestCurve, center: bestCenter, applyRaw: bestApply } = bestCandidate;

  // Apply the winning transform and detect outliers via Tukey fences.
  // Fences are applied on the transformed values (already in log/sqrt space),
  // so outlier detection works correctly for all curve types.
  const transformed = sorted.map(bestApply);
  const { lower: fenceLower, upper: fenceUpper } = tukeyFences(transformed);

  // Find the effective range excluding outliers
  let rangeMin = transformed[0];
  let rangeMax = transformed[transformed.length - 1];
  for (const t of transformed) {
    if (t >= fenceLower) { rangeMin = t; break; }
  }
  for (let i = transformed.length - 1; i >= 0; i--) {
    if (transformed[i] <= fenceUpper) { rangeMax = transformed[i]; break; }
  }
  const outRange = rangeMax - rangeMin;

  // Precompute outlier ranges for secondary normalization
  const transformedMin = transformed[0];
  const transformedMax = transformed[transformed.length - 1];
  const highOutlierRange = transformedMax - rangeMax;
  const lowOutlierRange = rangeMin - transformedMin;

  function transform(value: number): number {
    if (outRange <= 0) return 0.5;
    const raw = bestApply(value);
    const t = (raw - rangeMin) / outRange;

    if (t > 1 && highOutlierRange > 0) {
      // High outlier: normalize into [1, 2]
      return 1 + (raw - rangeMax) / highOutlierRange;
    }
    if (t < 0 && lowOutlierRange > 0) {
      // Low outlier: normalize into [-1, 0]
      return -(rangeMin - raw) / lowOutlierRange;
    }
    return t;
  }

  return { transform, curve: bestCurve, center: bestCenter };
}

/** Pure log: log(x - min + 1). Ideal for data spanning many orders of magnitude. */
function pureLog(x: number, min: number): number {
  return Math.log(x - min + 1);
}

/** sign(x - c) * log(|x - c| + 1) */
function centeredLog(x: number, c: number): number {
  const diff = x - c;
  return Math.sign(diff) * Math.log(Math.abs(diff) + 1);
}

/** sign(x - c) * sqrt(|x - c|) */
function centeredSqrt(x: number, c: number): number {
  const diff = x - c;
  return Math.sign(diff) * Math.sqrt(Math.abs(diff));
}

/**
 * Find the center of the densest region using a sliding window.
 * Window width = MAD (median absolute deviation), which is robust to outliers
 * unlike standard deviation. Uses the 1.4826 scale factor for consistency
 * with the normal distribution.
 */
function findDensestCenter(sorted: ReadonlyArray<number>): number {
  const n = sorted.length;
  const mad = medianAbsoluteDeviation(sorted);

  // If MAD is 0, most values are identical — use the median as center
  if (mad === 0) return sorted[Math.floor(n / 2)];

  const windowWidth = 1.4826 * mad;
  let maxCount = 0;
  let bestLeft = 0;
  let bestRight = 0;
  let right = 0;

  for (let left = 0; left < n; left++) {
    while (right < n && sorted[right] - sorted[left] <= windowWidth) {
      right++;
    }
    const count = right - left;
    if (count > maxCount) {
      maxCount = count;
      bestLeft = left;
      bestRight = right - 1;
    }
  }

  // Center of the densest window
  return (sorted[bestLeft] + sorted[bestRight]) / 2;
}

function medianAbsoluteDeviation(sorted: ReadonlyArray<number>): number {
  const n = sorted.length;
  if (n < 2) return 0;
  const median = sorted[Math.floor(n / 2)];
  const deviations = sorted.map((v) => Math.abs(v - median));
  deviations.sort((a, b) => a - b);
  return deviations[Math.floor(n / 2)];
}

/**
 * Tukey fences for outlier detection on sorted transformed values.
 * Since the values are already in the chosen scale space (log/sqrt/linear),
 * the IQR-based fences work naturally — e.g., for log-scale data, outliers
 * are detected in log space where the distribution is more uniform.
 */
function tukeyFences(sorted: ReadonlyArray<number>): { readonly lower: number; readonly upper: number } {
  const n = sorted.length;
  if (n < 4) return { lower: sorted[0], upper: sorted[n - 1] };
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return { lower: q1 - 0.75 * iqr, upper: q3 + 0.75 * iqr };
}

/**
 * Compute gap variance aware of outliers. Splits the transformed values into
 * three groups (low outliers, normal, high outliers) via Tukey fences,
 * normalizes each group independently, computes gap variance per group,
 * then returns a weighted average by group size.
 *
 * Each group's contribution is scaled by its visual resolution weight —
 * the proportion of hue-angle space it occupies in the output gradient.
 * The default weights (25/240 for high outliers, 15/240 for low) match
 * a blue→red gradient with pink and purple outlier extensions.
 *
 * This prevents a single huge gap between outliers and non-outliers from
 * dominating the score, and down-weights outlier groups proportionally
 * to how little visual resolution they get.
 *
 * @internal Exported for use by diagnostic scripts.
 */
export function outlierAwareGapVariance(
  sortedTransformed: ReadonlyArray<number>,
  visualWeights: { readonly low: number; readonly normal: number; readonly high: number } = VISUAL_WEIGHTS,
): number {
  const n = sortedTransformed.length;
  if (n < 2) return 0;

  const { lower, upper } = tukeyFences(sortedTransformed);

  const lowOutliers: Array<number> = [];
  const normal: Array<number> = [];
  const highOutliers: Array<number> = [];

  for (const t of sortedTransformed) {
    if (t < lower) lowOutliers.push(t);
    else if (t > upper) highOutliers.push(t);
    else normal.push(t);
  }

  // Normalize each group to [0, 1] and compute gap variance
  function groupVariance(group: ReadonlyArray<number>): number {
    if (group.length < 2) return 0;
    const gMin = group[0];
    const gMax = group[group.length - 1];
    const gRange = gMax - gMin;
    if (gRange <= 0) return 0;
    const normalized = group.map((v) => (v - gMin) / gRange);
    return gapVariance(normalized);
  }

  const weightedCount =
    lowOutliers.length * visualWeights.low +
    normal.length * visualWeights.normal +
    highOutliers.length * visualWeights.high;
  if (weightedCount <= 0) return 0;

  const weightedSum =
    lowOutliers.length * visualWeights.low * groupVariance(lowOutliers) +
    normal.length * visualWeights.normal * groupVariance(normal) +
    highOutliers.length * visualWeights.high * groupVariance(highOutliers);

  return weightedSum / weightedCount;
}

/**
 * Default visual resolution weights based on hue-angle ranges:
 *   Normal [0,1]:  blue→red = 240°
 *   High [1,2]:    red-pink→magenta = 25°
 *   Low [-1,0]:    blue-purple→deep purple = 15°
 */
const VISUAL_WEIGHTS = {
  low: 15 / 240,
  normal: 1,
  high: 25 / 240,
} as const;

/**
 * Variance of gaps between consecutive values in a sorted [0, 1] array.
 * Lower variance = more even spread.
 */
function gapVariance(normalized: ReadonlyArray<number>): number {
  const n = normalized.length;
  if (n < 2) return 0;

  const gaps: Array<number> = [];
  for (let i = 1; i < n; i++) {
    gaps.push(normalized[i] - normalized[i - 1]);
  }

  let sum = 0;
  for (const g of gaps) sum += g;
  const mean = sum / gaps.length;

  let sumSq = 0;
  for (const g of gaps) sumSq += (g - mean) ** 2;
  return sumSq / gaps.length;
}
