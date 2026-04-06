/**
 * Helper script: reads JSON array of numbers from stdin,
 * outputs JSON with all candidate curves' transformed values and gap variances
 * (using the same outlier-aware scoring as the real algorithm),
 * plus which curve was chosen.
 *
 * Usage: echo '[1,2,3]' | npx tsx scripts/adaptive-scale-helper.ts
 */
import { computeAdaptiveScale, outlierAwareGapVariance } from '../src/utilities/adaptiveScale';

const input = await new Promise<string>((resolve) => {
  let data = '';
  process.stdin.on('data', (chunk) => { data += chunk; });
  process.stdin.on('end', () => resolve(data));
});

const values: ReadonlyArray<number> = JSON.parse(input);

if (values.length < 2) {
  console.log(JSON.stringify({ chosen: 'linear', curves: {} }));
  process.exit(0);
}

const sorted = [...values].sort((a, b) => a - b);
const min = sorted[0];

// Compute the chosen scale
const scale = computeAdaptiveScale(values);

// Replicate center-finding (same as adaptiveScale.ts internals)
function medianAbsoluteDeviation(s: ReadonlyArray<number>): number {
  const n = s.length;
  if (n < 2) return 0;
  const median = s[Math.floor(n / 2)];
  const deviations = s.map((v) => Math.abs(v - median));
  deviations.sort((a, b) => a - b);
  return deviations[Math.floor(n / 2)];
}

function findDensestCenter(s: ReadonlyArray<number>): number {
  const n = s.length;
  const mad = medianAbsoluteDeviation(s);
  if (mad === 0) return s[Math.floor(n / 2)];
  const windowWidth = 1.4826 * mad;
  let maxCount = 0, bestLeft = 0, bestRight = 0, right = 0;
  for (let left = 0; left < n; left++) {
    while (right < n && s[right] - s[left] <= windowWidth) right++;
    const count = right - left;
    if (count > maxCount) { maxCount = count; bestLeft = left; bestRight = right - 1; }
  }
  return (s[bestLeft] + s[bestRight]) / 2;
}

function tukeyFences(s: ReadonlyArray<number>): { lower: number; upper: number } {
  const n = s.length;
  if (n < 4) return { lower: s[0], upper: s[n - 1] };
  const q1 = s[Math.floor(n * 0.25)];
  const q3 = s[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  return { lower: q1 - 0.75 * iqr, upper: q3 + 0.75 * iqr };
}

const center = findDensestCenter(sorted);

const curveApply: Record<string, (x: number) => number> = {
  'linear': (x: number) => x,
  'log': (x: number) => Math.log(x - min + 1),
  'centered-log': (x: number) => { const d = x - center; return Math.sign(d) * Math.log(Math.abs(d) + 1); },
  'centered-sqrt': (x: number) => { const d = x - center; return Math.sign(d) * Math.sqrt(Math.abs(d)); },
};

const curves: Record<string, { transformed: ReadonlyArray<number>; gapVariance: number }> = {};

for (const [name, apply] of Object.entries(curveApply)) {
  const rawTransformed = sorted.map(apply);

  // Use the same outlier-aware gap variance as the real algorithm
  const gv = outlierAwareGapVariance(rawTransformed);

  // Normalize with outlier ranges for the output transformed values
  const fences = tukeyFences(rawTransformed);
  let rangeMin = rawTransformed[0];
  let rangeMax = rawTransformed[rawTransformed.length - 1];
  for (const t of rawTransformed) { if (t >= fences.lower) { rangeMin = t; break; } }
  for (let i = rawTransformed.length - 1; i >= 0; i--) { if (rawTransformed[i] <= fences.upper) { rangeMax = rawTransformed[i]; break; } }
  const range = rangeMax - rangeMin;
  const highOutlierRange = rawTransformed[rawTransformed.length - 1] - rangeMax;
  const lowOutlierRange = rangeMin - rawTransformed[0];

  const normalized = range <= 0
    ? rawTransformed.map(() => 0.5)
    : rawTransformed.map((raw) => {
        const t = (raw - rangeMin) / range;
        if (t > 1 && highOutlierRange > 0) return 1 + (raw - rangeMax) / highOutlierRange;
        if (t < 0 && lowOutlierRange > 0) return -(rangeMin - raw) / lowOutlierRange;
        return t;
      });

  // Map back to original input order
  const valueToTransformed = new Map<number, number[]>();
  for (let i = 0; i < sorted.length; i++) {
    const key = sorted[i];
    if (!valueToTransformed.has(key)) valueToTransformed.set(key, []);
    valueToTransformed.get(key)!.push(normalized[i]);
  }
  const counters = new Map<number, number>();
  const ordered = values.map((v) => {
    const idx = counters.get(v) ?? 0;
    counters.set(v, idx + 1);
    return valueToTransformed.get(v)![idx];
  });

  curves[name] = { transformed: ordered, gapVariance: gv };
}

console.log(JSON.stringify({ chosen: scale.curve, curves }));
