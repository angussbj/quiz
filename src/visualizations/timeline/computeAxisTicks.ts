import { formatYear } from './TimelineTimestamp';

/**
 * A tick mark on the time axis.
 * Major ticks get larger labels (e.g., century/decade); minor ticks get smaller ones (e.g., year/month).
 */
export interface AxisTick {
  readonly fractionalYear: number;
  readonly label: string;
  readonly isMajor: boolean;
  /** Whether to render a text label for this tick. False for minor ticks at coarse zoom levels to prevent overlap. */
  readonly showLabel: boolean;
  /** High-priority ticks (e.g. year boundaries when months are visible) survive overlap culling before lower-priority ones. */
  readonly priority: boolean;
}

/**
 * Format a year value using geological notation (Ga = gigayears, Ma = megayears, ka = kiloyears).
 * Used for deep-time tick levels where raw year numbers would be unreadable.
 */
function formatGeologicalYear(year: number, unitDivisor: number, unitSuffix: string): string {
  if (year === 0) return '0';
  const absVal = Math.abs(year) / unitDivisor;
  const formatted = Number.isInteger(absVal) ? `${absVal}` : absVal.toPrecision(2);
  return `${formatted} ${unitSuffix}`;
}

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Get 0-based month index from a fractional year. */
function monthIndexFromFractionalYear(fractionalYear: number): number {
  const frac = fractionalYear - Math.floor(fractionalYear);
  return Math.min(11, Math.max(0, Math.round(frac * 12)));
}

/** Get 1-based day-of-month from a fractional year. */
function dayFromFractionalYear(fractionalYear: number): number {
  const year = Math.floor(fractionalYear);
  const frac = fractionalYear - year;
  const totalDays = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  // Round to nearest whole day to avoid float drift producing duplicate day labels
  const dayOfYear = Math.round(frac * totalDays);
  // Walk months to find which month and day
  const daysPerMonth = [31, (totalDays === 366 ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = dayOfYear;
  for (let m = 0; m < 12; m++) {
    if (remaining < daysPerMonth[m]) {
      return Math.max(1, remaining + 1);
    }
    remaining -= daysPerMonth[m];
  }
  return 31;
}

/** Number of days in each month (0-indexed). */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 1 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month];
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Fractional year for the start of a given day (0-indexed month, 1-indexed day). */
function dayToFractionalYear(year: number, month: number, day: number): number {
  let dayOfYear = 0;
  for (let m = 0; m < month; m++) dayOfYear += daysInMonth(year, m);
  dayOfYear += day - 1;
  return year + dayOfYear / daysInYear(year);
}

/** Decompose a fractional year into {year, month (0-indexed), day (1-indexed)}. */
function fractionalYearToDate(fractionalYear: number): { year: number; month: number; day: number } {
  const year = Math.floor(fractionalYear);
  const frac = fractionalYear - year;
  const totalDays = daysInYear(year);
  const dayOfYear = Math.round(frac * totalDays);
  let remaining = dayOfYear;
  for (let m = 0; m < 12; m++) {
    const dim = daysInMonth(year, m);
    if (remaining < dim) {
      return { year, month: m, day: Math.max(1, remaining + 1) };
    }
    remaining -= dim;
  }
  return { year, month: 11, day: 31 };
}

/**
 * Standard intervals for axis ticks, ordered from largest to smallest (coarsest first).
 * Each entry defines the interval in years, and how to format major/minor labels.
 * The coarsest levels handle geological time (billions/millions of years);
 * the finest handle historical time (years/months).
 */
const TICK_LEVELS: ReadonlyArray<{
  readonly majorInterval: number;
  readonly minorInterval: number;
  readonly formatMajor: (year: number) => string;
  readonly formatMinor: (year: number) => string;
  /** Approximate minimum screen pixels between minor ticks for this level to activate */
  readonly minPixelsPerMinorTick: number;
  /** Whether to show labels on minor ticks. False at coarse scales where minor labels would overlap. */
  readonly showMinorLabels: boolean;
  /** When true, generate ticks by iterating actual calendar dates instead of fixed-interval stepping.
   *  This avoids misalignment from leap years and non-uniform month lengths. */
  readonly calendarDays?: boolean;
}> = [
  // Geological: billion-year scale (Hadean, Archean, Proterozoic eons)
  {
    majorInterval: 1_000_000_000,
    minorInterval: 100_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000_000, 'Ga'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000_000, 'Ga'),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Geological: hundred-million-year scale (Phanerozoic eons, eras)
  {
    majorInterval: 100_000_000,
    minorInterval: 10_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Geological: ten-million-year scale (geological periods)
  {
    majorInterval: 10_000_000,
    minorInterval: 1_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Deep time: million-year scale (evolution, early hominids)
  {
    majorInterval: 1_000_000,
    minorInterval: 100_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Prehistoric: hundred-thousand-year scale (Ice Ages, early humans)
  {
    majorInterval: 100_000,
    minorInterval: 10_000,
    formatMajor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k BCE` : formatYear(y),
    formatMinor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k` : formatYear(y),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Prehistoric: ten-thousand-year scale (early civilizations, stone age)
  {
    majorInterval: 10_000,
    minorInterval: 1_000,
    formatMajor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k BCE` : formatYear(y),
    formatMinor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k` : formatYear(y),
    minPixelsPerMinorTick: 40,
    showMinorLabels: false,
  },
  // Historical: thousand-year scale (ancient history)
  {
    majorInterval: 1000,
    minorInterval: 100,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => formatYear(y),
    minPixelsPerMinorTick: 40,
    showMinorLabels: true,
  },
  {
    majorInterval: 100,
    minorInterval: 10,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => formatYear(y),
    minPixelsPerMinorTick: 40,
    showMinorLabels: true,
  },
  {
    majorInterval: 10,
    minorInterval: 1,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => formatYear(y),
    minPixelsPerMinorTick: 40,
    showMinorLabels: true,
  },
  // Month letters (single character)
  {
    majorInterval: 1,
    minorInterval: 1 / 12,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => MONTH_LETTERS[monthIndexFromFractionalYear(y)] ?? '',
    minPixelsPerMinorTick: 20,
    showMinorLabels: true,
  },
  // 3-letter month abbreviations
  {
    majorInterval: 1,
    minorInterval: 1 / 12,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => MONTH_SHORT[monthIndexFromFractionalYear(y)] ?? '',
    minPixelsPerMinorTick: 40,
    showMinorLabels: true,
  },
  // Full month names
  {
    majorInterval: 1,
    minorInterval: 1 / 12,
    formatMajor: (y) => formatYear(y),
    formatMinor: (y) => MONTH_FULL[monthIndexFromFractionalYear(y)] ?? '',
    minPixelsPerMinorTick: 80,
    showMinorLabels: true,
  },
  // Day ticks (major = month, minor = day) — uses calendar iteration for exact alignment
  {
    majorInterval: 1 / 12,
    minorInterval: 1 / 365,
    formatMajor: (y) => {
      const mi = monthIndexFromFractionalYear(y);
      return `${MONTH_FULL[mi]} ${formatYear(Math.floor(y))}`;
    },
    formatMinor: (y) => String(dayFromFractionalYear(y)),
    minPixelsPerMinorTick: 20,
    showMinorLabels: true,
    calendarDays: true,
  },
];

/**
 * Compute axis tick marks for the visible range at the current zoom level.
 *
 * @param startYear - Start of the visible range (fractional year)
 * @param endYear - End of the visible range (fractional year)
 * @param availablePixels - Width of the axis in screen pixels
 */
export function computeAxisTicks(
  startYear: number,
  endYear: number,
  availablePixels: number,
): ReadonlyArray<AxisTick> {
  const range = endYear - startYear;
  if (range <= 0 || availablePixels <= 0) return [];

  const pixelsPerYear = availablePixels / range;

  // Find the finest level where minor ticks are spaced far enough apart (not too dense).
  let levelIndex = 0;
  for (let i = 0; i < TICK_LEVELS.length; i++) {
    const level = TICK_LEVELS[i];
    const pixelsPerMinorTick = pixelsPerYear * level.minorInterval;
    if (pixelsPerMinorTick >= level.minPixelsPerMinorTick) {
      levelIndex = i;
    }
  }

  // Advance to finer levels until the visible range spans at least one full major interval
  // (guaranteeing ≥2 major tick labels on screen). This prevents a too-sparse axis when
  // falling back to a coarse level for a range smaller than its major interval.
  while (levelIndex < TICK_LEVELS.length - 1) {
    const level = TICK_LEVELS[levelIndex];
    if (range >= level.majorInterval) break;
    levelIndex++;
  }

  const bestLevel = TICK_LEVELS[levelIndex];

  const ticks: AxisTick[] = [];

  // Cap total ticks to prevent runaway generation at extreme zoom levels.
  // 500 accommodates the padded viewport range (up to ~2.5× visible width).
  const MAX_TICKS = 500;

  if (bestLevel.calendarDays) {
    // Calendar-accurate day ticks: iterate actual dates so tick positions
    // match timestampToFractionalYear exactly (handles leap years, variable month lengths).
    return generateCalendarDayTicks(startYear, endYear, MAX_TICKS);
  }

  // When major and minor intervals are incommensurable (e.g. 1/12 months and 1/365 days),
  // minor ticks won't land on major boundaries. Generate major ticks first at exact positions,
  // then fill minor ticks in between.
  const majorPositions = new Set<number>();
  const majorStart = Math.ceil((startYear - bestLevel.minorInterval) / bestLevel.majorInterval) * bestLevel.majorInterval;
  for (
    let m = majorStart;
    m <= endYear + bestLevel.minorInterval;
    m += bestLevel.majorInterval
  ) {
    if (ticks.length >= MAX_TICKS) break;
    // Snap to clean boundary to avoid float drift in the label formatter
    const snapped = Math.round(m / bestLevel.majorInterval) * bestLevel.majorInterval;
    majorPositions.add(snapped);
    ticks.push({
      fractionalYear: snapped,
      label: bestLevel.formatMajor(snapped),
      isMajor: true,
      showLabel: true,
      priority: true,
    });
  }

  const minorStart = Math.floor(startYear / bestLevel.minorInterval) * bestLevel.minorInterval;
  for (
    let t = minorStart;
    t <= endYear + bestLevel.minorInterval;
    t += bestLevel.minorInterval
  ) {
    if (t < startYear - bestLevel.minorInterval) continue;
    if (ticks.length >= MAX_TICKS) break;

    // Skip if this position is already covered by a major tick
    const nearestMajor = Math.round(t / bestLevel.majorInterval) * bestLevel.majorInterval;
    const tolerance = bestLevel.minorInterval * 0.1;
    if (Math.abs(t - nearestMajor) < tolerance && majorPositions.has(nearestMajor)) continue;

    ticks.push({
      fractionalYear: t,
      label: bestLevel.showMinorLabels ? bestLevel.formatMinor(t) : '',
      isMajor: false,
      showLabel: bestLevel.showMinorLabels,
      priority: false,
    });
  }

  // Sort by position for correct rendering order
  ticks.sort((a, b) => a.fractionalYear - b.fractionalYear);

  return ticks;
}

/**
 * Generate calendar-accurate day ticks by iterating actual dates.
 * Major ticks at month boundaries, minor ticks at each day.
 * Positions use the same (dayOfYear-1)/daysInYear formula as timestampToFractionalYear,
 * ensuring bar start/end edges align exactly with tick marks.
 */
function generateCalendarDayTicks(
  startYear: number,
  endYear: number,
  maxTicks: number,
): ReadonlyArray<AxisTick> {
  const ticks: AxisTick[] = [];

  // Find the starting date (back up one day for padding)
  const startDate = fractionalYearToDate(startYear);
  let { year, month, day } = startDate;
  // Back up one day for padding
  day -= 1;
  if (day < 1) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
    day = daysInMonth(year, month);
  }

  while (ticks.length < maxTicks) {
    const frac = dayToFractionalYear(year, month, day);
    if (frac > endYear + 1 / 365) break;

    const isMajor = day === 1;
    if (isMajor) {
      ticks.push({
        fractionalYear: frac,
        label: `${MONTH_FULL[month]} ${formatYear(year)}`,
        isMajor: true,
        showLabel: true,
        priority: true,
      });
    } else {
      ticks.push({
        fractionalYear: frac,
        label: String(day),
        isMajor: false,
        showLabel: true,
        priority: false,
      });
    }

    // Advance to next day
    day += 1;
    if (day > daysInMonth(year, month)) {
      day = 1;
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
  }

  return ticks;
}
