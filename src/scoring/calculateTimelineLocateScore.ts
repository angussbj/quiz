import type { TimelineTimestamp } from '@/visualizations/timeline/TimelineTimestamp';
import { timestampToFractionalYear } from '@/visualizations/timeline/TimelineTimestamp';

export type DatePrecision = 'year' | 'month' | 'day';

/**
 * Truncate a timestamp to the given precision level.
 * - year: [1944]
 * - month: [1944, 6]
 * - day: [1944, 6, 6]
 */
export function truncateToPrecision(
  timestamp: TimelineTimestamp,
  precision: DatePrecision,
): TimelineTimestamp {
  const [year, month, day] = timestamp;
  switch (precision) {
    case 'year':
      return [year];
    case 'month':
      return month !== undefined ? [year, month] : [year];
    case 'day':
      return day !== undefined && month !== undefined
        ? [year, month, day]
        : month !== undefined ? [year, month] : [year];
  }
}

/**
 * Check whether an event needs a range answer at the given precision.
 * True if start and end differ when truncated to that precision.
 */
export function needsRangeAnswer(
  start: TimelineTimestamp,
  end: TimelineTimestamp | undefined,
  precision: DatePrecision,
): boolean {
  if (!end) return false;
  const truncStart = truncateToPrecision(start, precision);
  const truncEnd = truncateToPrecision(end, precision);
  return !timestampsEqual(truncStart, truncEnd);
}

function timestampsEqual(a: TimelineTimestamp, b: TimelineTimestamp): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Tolerance in fractional years for each precision level.
 * Full marks if within tolerance, zero marks at 3x tolerance.
 */
const TOLERANCE: Readonly<Record<DatePrecision, number>> = {
  year: 1.0,     // within 1 year
  month: 2 / 12, // within 2 months
  day: 7 / 365,  // within 7 days
};

/**
 * Score a single-point answer (no range needed).
 * Compares the user's answer to the event's actual timestamp.
 * Returns 0–1.
 *
 * Full marks if the user's answer matches the event at the selected
 * precision (e.g., "June 1944" matches any event in June 1944 at
 * month precision). Otherwise scores by temporal distance.
 */
export function scorePointAnswer(
  userAnswer: TimelineTimestamp,
  eventStart: TimelineTimestamp,
  eventEnd: TimelineTimestamp | undefined,
  precision: DatePrecision,
): number {
  // Check precision-level match: if user's truncated answer overlaps
  // any point in the event's range, full marks
  const userTrunc = truncateToPrecision(userAnswer, precision);
  const startTrunc = truncateToPrecision(eventStart, precision);
  const endTrunc = eventEnd ? truncateToPrecision(eventEnd, precision) : startTrunc;
  if (timestampInRange(userTrunc, startTrunc, endTrunc)) return 1;

  // Fall back to fractional-year distance scoring
  const userFrac = timestampToFractionalYear(userAnswer, false);
  const eventStartFrac = timestampToFractionalYear(eventStart, false);
  const eventEndFrac = eventEnd
    ? timestampToFractionalYear(eventEnd, true)
    : eventStartFrac;

  if (userFrac >= eventStartFrac && userFrac <= eventEndFrac) return 1;

  const distance = userFrac < eventStartFrac
    ? eventStartFrac - userFrac
    : userFrac - eventEndFrac;

  const tolerance = TOLERANCE[precision];
  if (distance <= 0) return 1;
  if (distance >= tolerance * 3) return 0;
  return Math.max(0, 1 - distance / (tolerance * 3));
}

/** Check if a timestamp falls within a range (inclusive), comparing element by element. */
function timestampInRange(
  value: TimelineTimestamp,
  rangeStart: TimelineTimestamp,
  rangeEnd: TimelineTimestamp,
): boolean {
  return compareTimestamps(value, rangeStart) >= 0 && compareTimestamps(value, rangeEnd) <= 0;
}

function compareTimestamps(a: TimelineTimestamp, b: TimelineTimestamp): number {
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/**
 * Score a range answer (user provides start and end).
 * Average of start accuracy and end accuracy.
 */
export function scoreRangeAnswer(
  userStart: TimelineTimestamp,
  userEnd: TimelineTimestamp,
  eventStart: TimelineTimestamp,
  eventEnd: TimelineTimestamp,
  precision: DatePrecision,
): number {
  const startScore = scoreEndpointAccuracy(userStart, eventStart, precision);
  const endScore = scoreEndpointAccuracy(userEnd, eventEnd, precision);
  return (startScore + endScore) / 2;
}

function scoreEndpointAccuracy(
  userTimestamp: TimelineTimestamp,
  eventTimestamp: TimelineTimestamp,
  precision: DatePrecision,
): number {
  // Precision-level match = full marks
  const userTrunc = truncateToPrecision(userTimestamp, precision);
  const eventTrunc = truncateToPrecision(eventTimestamp, precision);
  if (timestampsEqual(userTrunc, eventTrunc)) return 1;

  const userFrac = timestampToFractionalYear(userTimestamp, false);
  const eventFrac = timestampToFractionalYear(eventTimestamp, false);
  const distance = Math.abs(userFrac - eventFrac);

  const tolerance = TOLERANCE[precision];
  if (distance <= 0) return 1;
  if (distance >= tolerance * 3) return 0;
  return Math.max(0, 1 - distance / (tolerance * 3));
}

/** Whether the score counts as "correct" (>= 0.5). */
export function isTimelineAnswerCorrect(score: number): boolean {
  return score >= 0.5;
}
