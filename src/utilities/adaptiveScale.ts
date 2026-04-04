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
  /** Maps a raw value to [0, 1]. Values outside the original range are clamped. */
  readonly transform: (value: number) => number;
  /** Which curve was selected. */
  readonly curve: ScaleCurve;
  /** The center point for log/sqrt transforms, undefined for linear. */
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
    const tMin = transformed[0];
    const tMax = transformed[transformed.length - 1];
    const tRange = tMax - tMin;

    if (tRange <= 0) continue;

    const normalized = transformed.map((t) => (t - tMin) / tRange);
    const variance = gapVariance(normalized);

    if (variance < bestVariance) {
      bestVariance = variance;
      bestCandidate = candidate;
    }
  }

  const { curve: bestCurve, center: bestCenter, applyRaw: bestApply } = bestCandidate;

  // Precompute the output range for the winning transform
  const outMin = bestApply(min);
  const outMax = bestApply(max);
  const outRange = outMax - outMin;

  function transform(value: number): number {
    if (outRange <= 0) return 0.5;
    const raw = bestApply(value);
    const t = (raw - outMin) / outRange;
    // Clamp to [0, 1] for values outside the original range
    return Math.max(0, Math.min(1, t));
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
