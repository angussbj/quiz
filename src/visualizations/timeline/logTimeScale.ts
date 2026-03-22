/**
 * Log-scale time transform for timelines spanning large time ranges.
 *
 * Maps fractional year to/from viewBox X position using log10(years before
 * a computed reference year). Older = further left (more negative viewBox X).
 *
 * The reference year is max(2000, lastEventYear) — derived from the actual
 * timeline data so the scale adapts to each quiz's time range.
 *
 * Axis labels automatically switch between geological format ("100 Ma", "10 ka")
 * for prehistoric times and CE year format ("1920", "300 BCE") for historical times.
 */

import type { AxisTick } from './computeAxisTicks';

/** ViewBox units per order of magnitude (log10 decade) on the log time scale. */
export const UNITS_PER_LOG_DECADE = 100;

/**
 * Log-space scoring tolerance: full marks within this many viewBox units of the
 * event's bar, zero marks at 3x this distance.
 * 15 units = 15% of one order of magnitude (e.g., +/-75 Ma at 500 Ma scale).
 */
export const LOG_SCORE_TOLERANCE_UNITS = 15;

/**
 * Compute the reference year for log-scale positioning from the latest event
 * in the timeline. Returns max(2000, ceil(maxFractionalYear)) so that:
 * - Deep-time quizzes (all BCE) use 2000 as reference
 * - Historical quizzes use the latest event year, keeping recent events visible
 */
export function computeLogReferenceYear(maxFractionalYear: number): number {
  return Math.max(2000, Math.ceil(maxFractionalYear));
}

/**
 * Convert a fractional year to a viewBox X position on the log scale.
 * Returns negative values (oldest = most negative).
 */
export function logYearToViewBoxX(fractionalYear: number, referenceYear: number): number {
  const yearsAgo = Math.max(1, referenceYear - fractionalYear);
  return -Math.log10(yearsAgo) * UNITS_PER_LOG_DECADE;
}

/**
 * Convert a viewBox X position back to a fractional year on the log scale.
 */
export function viewBoxXToLogYear(viewBoxX: number, referenceYear: number): number {
  return referenceYear - 10 ** (-viewBoxX / UNITS_PER_LOG_DECADE);
}

/**
 * Score a log-scale locate answer based on viewBox-space proximity.
 *
 * Full marks (1.0) if the click falls within the event's visual bar (startViewBoxX
 * to endViewBoxX). Partial marks within LOG_SCORE_TOLERANCE_UNITS x 3 of the
 * nearest bar edge; zero beyond.
 */
export function scoreLogScaleAnswer(
  userViewBoxX: number,
  startViewBoxX: number,
  endViewBoxX: number,
): number {
  if (userViewBoxX >= startViewBoxX && userViewBoxX <= endViewBoxX) return 1;
  const distance = userViewBoxX < startViewBoxX
    ? startViewBoxX - userViewBoxX
    : userViewBoxX - endViewBoxX;
  if (distance >= LOG_SCORE_TOLERANCE_UNITS * 3) return 0;
  return Math.max(0, 1 - distance / (LOG_SCORE_TOLERANCE_UNITS * 3));
}

/** Years-before-reference above which we use geological "ka/Ma/Ga" labels. */
const GEOLOGICAL_LABEL_THRESHOLD = 10_000;

/** Format years-before-present into a short geological label (e.g. "500 Ma", "3.8 Ga"). */
function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    const val = yearsAgo / 1_000_000_000;
    return `${Number.isInteger(val) ? val : val.toPrecision(2)} Ga`;
  }
  if (yearsAgo >= 1_000_000) {
    const val = yearsAgo / 1_000_000;
    return `${Number.isInteger(val) ? val : val.toPrecision(2)} Ma`;
  }
  if (yearsAgo >= 1_000) {
    const val = yearsAgo / 1_000;
    return `${Number.isInteger(val) ? val : val.toPrecision(2)} ka`;
  }
  return `${yearsAgo} ya`;
}

/** Format a log-scale axis tick label: geological for deep time, CE year for historical. */
function formatLogTick(yearsAgo: number, referenceYear: number): string {
  if (yearsAgo >= GEOLOGICAL_LABEL_THRESHOLD) return formatYearsAgo(yearsAgo);
  const ceYear = referenceYear - yearsAgo;
  if (ceYear <= 0) return `${-ceYear} BCE`;
  return `${Math.round(ceYear)}`;
}

/** Minimum pixel gap between adjacent tick marks. */
const MIN_TICK_PX = 8;

/** Minimum pixel gap between adjacent labeled ticks. */
const MIN_LABEL_PX = 20;

/**
 * Compute the finest "nice" multiplier step within a decade given available
 * pixel density. Ticks are placed at m × 10^d for m = step, 2·step, …, 9·step.
 *
 * The densest region of a decade is near m = 9, where adjacent ticks at
 * m and m + step have pixel distance: pixelsPerDecade × log₁₀(1 + step/9).
 * We solve for the smallest step where this distance ≥ minPx, then round up
 * to the nearest value in the 1-2-5 × 10^k sequence.
 *
 * Returns ≥ 10 when no minor ticks should be shown (only decade boundaries).
 */
function niceLogStep(pixelsPerDecade: number, minPx: number): number {
  if (pixelsPerDecade <= minPx) return 10;

  // Minimum step so that the densest gap (near m=9) is at least minPx wide.
  const rawStep = 9 * (10 ** (minPx / pixelsPerDecade) - 1);
  if (rawStep >= 9) return 10;

  // Round up to nearest 1-2-5 × 10^k
  const exp = Math.floor(Math.log10(Math.max(rawStep, 1e-15)));
  const magnitude = 10 ** exp;
  const normalized = rawStep / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

/**
 * Compute axis ticks for a log-scale timeline.
 *
 * Generates ticks at decade boundaries (powers of 10 years before reference)
 * with progressively finer subdivisions as the user zooms in. The tick density
 * is computed from a formula (not a fixed list) so it works at any scale —
 * from billions of years down to days.
 */
export function computeLogAxisTicks(
  startYear: number,
  endYear: number,
  availablePixels: number,
  referenceYear: number,
): ReadonlyArray<AxisTick> {
  if (availablePixels <= 0) return [];

  const oldestYearsAgo = Math.max(1, referenceYear - startYear);
  const newestYearsAgo = Math.max(1, referenceYear - endYear);

  const logOldest = Math.log10(oldestYearsAgo);
  const logNewest = Math.log10(newestYearsAgo);

  if (logOldest <= logNewest) return [];

  const pixelsPerDecade = availablePixels / (logOldest - logNewest);

  const tickStep = niceLogStep(pixelsPerDecade, MIN_TICK_PX);
  const labelStep = niceLogStep(pixelsPerDecade, MIN_LABEL_PX);

  const ticks: AxisTick[] = [];

  const decadeMin = Math.floor(logNewest);
  const decadeMax = Math.ceil(logOldest);

  for (let d = decadeMin; d <= decadeMax; d++) {
    const decadeBase = 10 ** d;

    // Generate ticks at m × 10^d for integer multiples of tickStep in [1, 10).
    // Use integer arithmetic (scaled by 1/tickStep) to avoid float accumulation.
    const stepsPerDecade = Math.round(9 / tickStep);
    for (let i = 0; i <= stepsPerDecade; i++) {
      const m = 1 + i * tickStep;
      // Clean up float noise: round to a reasonable number of decimal places
      const mClean = Math.round(m * 1e6) / 1e6;
      if (mClean >= 10) break;

      const yearsAgo = mClean * decadeBase;
      // Sub-year ticks produce duplicate CE year labels
      if (yearsAgo < 1) continue;

      const fractionalYear = referenceYear - yearsAgo;
      if (fractionalYear > endYear || fractionalYear < startYear) continue;

      const isMajor = i === 0;
      // Label this tick if it falls on a labelStep boundary
      const showLabel = isMajor || (labelStep < 10 && isStepMultiple(mClean - 1, labelStep));

      ticks.push({
        fractionalYear,
        label: showLabel ? formatLogTick(yearsAgo, referenceYear) : '',
        isMajor,
        showLabel,
      });
    }
  }

  return deduplicateLabels(ticks);
}

/** Check whether `value` is approximately a multiple of `step`. */
function isStepMultiple(value: number, step: number): boolean {
  if (step <= 0) return false;
  const remainder = Math.abs(value - Math.round(value / step) * step);
  return remainder < step * 0.01;
}

/**
 * Remove duplicate labels: if two adjacent labeled ticks have the same text
 * (common near the reference year where CE years round to the same value),
 * suppress the label on the non-major tick.
 */
function deduplicateLabels(ticks: ReadonlyArray<AxisTick>): ReadonlyArray<AxisTick> {
  const sorted = [...ticks].sort((a, b) => a.fractionalYear - b.fractionalYear);
  const seen = new Set<string>();
  const result: AxisTick[] = [];

  // First pass: collect labels from major ticks
  for (const tick of sorted) {
    if (tick.isMajor && tick.showLabel) seen.add(tick.label);
  }

  // Second pass: suppress minor tick labels that duplicate a major tick
  for (const tick of sorted) {
    if (!tick.isMajor && tick.showLabel && seen.has(tick.label)) {
      result.push({ ...tick, showLabel: false, label: '' });
    } else {
      if (tick.showLabel) seen.add(tick.label);
      result.push(tick);
    }
  }

  return result;
}
