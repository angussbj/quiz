/**
 * Variable-precision timestamp as an array of numbers:
 * [year, month?, day?, hour?, minute?, second?]
 *
 * Month is 1-indexed (1 = January, 12 = December).
 * Omitted trailing values are ignored for display.
 * For rendering, start timestamps round to the beginning of the
 * smallest specified period, and end timestamps round to the end.
 */
export type TimelineTimestamp = readonly [
  year: number,
  month?: number,
  day?: number,
  hour?: number,
  minute?: number,
  second?: number,
];

/** Number of days in each month for a non-leap year. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/** Day-of-year (1-indexed) for a given date. */
function dayOfYear(year: number, month: number, day: number): number {
  let result = 0;
  for (let m = 1; m < month; m++) {
    result += daysInMonth(year, m);
  }
  return result + day;
}

/**
 * Convert a timestamp to a fractional year for positioning on the axis.
 *
 * @param roundEnd When true, rounds to the END of the smallest specified
 *   period (used for end timestamps). When false, rounds to the START.
 */
export function timestampToFractionalYear(
  timestamp: TimelineTimestamp,
  roundEnd: boolean,
): number {
  const [year, month, day, hour, minute, second] = timestamp;

  if (month === undefined) {
    return roundEnd ? year + 1 : year;
  }
  if (day === undefined) {
    if (roundEnd) {
      // End of the month
      const endDay = daysInMonth(year, month);
      return year + (dayOfYear(year, month, endDay) / daysInYear(year));
    }
    return year + ((dayOfYear(year, month, 1) - 1) / daysInYear(year));
  }

  const baseDayFraction = (dayOfYear(year, month, day) - 1) / daysInYear(year);

  if (hour === undefined) {
    if (roundEnd) {
      return year + baseDayFraction + (1 / daysInYear(year));
    }
    return year + baseDayFraction;
  }

  const hourFraction = hour / (24 * daysInYear(year));
  if (minute === undefined) {
    if (roundEnd) {
      return year + baseDayFraction + hourFraction + (1 / (24 * daysInYear(year)));
    }
    return year + baseDayFraction + hourFraction;
  }

  const minuteFraction = minute / (24 * 60 * daysInYear(year));
  if (second === undefined) {
    if (roundEnd) {
      return year + baseDayFraction + hourFraction + minuteFraction + (1 / (24 * 60 * daysInYear(year)));
    }
    return year + baseDayFraction + hourFraction + minuteFraction;
  }

  const secondsPerYear = 24 * 60 * 60 * daysInYear(year);
  const secondFraction = second / secondsPerYear;
  if (roundEnd) {
    return year + baseDayFraction + hourFraction + minuteFraction + secondFraction + (1 / secondsPerYear);
  }
  return year + baseDayFraction + hourFraction + minuteFraction + secondFraction;
}

/**
 * Format a year with comma separators for |year| > 9999.
 * E.g. 12212 → "12,212", -65000000 → "-65,000,000".
 */
export function formatYear(year: number): string {
  const abs = Math.abs(year);
  if (abs <= 9999) return String(year);
  const digits = String(abs);
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return year < 0 ? `-${withCommas}` : withCommas;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format a timestamp for display, showing only specified components. */
export function formatTimestamp(timestamp: TimelineTimestamp, short?: boolean): string {
  const [year, month, day, hour, minute, second] = timestamp;

  if (month === undefined) {
    return formatYear(year);
  }

  const monthName = short
    ? MONTH_NAMES_SHORT[month - 1]
    : MONTH_NAMES[month - 1];

  if (day === undefined) {
    return `${monthName} ${formatYear(year)}`;
  }

  if (hour === undefined) {
    return `${day} ${monthName} ${formatYear(year)}`;
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  if (minute === undefined) {
    return `${day} ${monthName} ${formatYear(year)}, ${pad(hour)}:00`;
  }

  if (second === undefined) {
    return `${day} ${monthName} ${formatYear(year)}, ${pad(hour)}:${pad(minute)}`;
  }

  return `${day} ${monthName} ${formatYear(year)}, ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

/**
 * Format a range between two timestamps for tooltip display.
 * Point events (no end) show just the start.
 */
export function formatTimestampRange(
  start: TimelineTimestamp,
  end?: TimelineTimestamp,
): string {
  if (!end) return formatTimestamp(start);
  return `${formatTimestamp(start)} \u2013 ${formatTimestamp(end)}`;
}
