/**
 * Formats a half-life value in seconds into a concise human-readable string.
 * Returns 'Stable' for undefined/null (element has no radioactive decay).
 */

const TIME_UNITS: ReadonlyArray<readonly [string, number]> = [
  ['Gy', 365.25 * 24 * 3600 * 1e9],   // gigayears
  ['My', 365.25 * 24 * 3600 * 1e6],   // megayears
  ['ky', 365.25 * 24 * 3600 * 1e3],   // kiloyears
  ['y', 365.25 * 24 * 3600],           // years
  ['d', 24 * 3600],                     // days
  ['h', 3600],                          // hours
  ['min', 60],                          // minutes
  ['s', 1],                             // seconds
  ['ms', 1e-3],                         // milliseconds
  ['us', 1e-6],                         // microseconds (rendered as \u03bcs)
  ['ns', 1e-9],                         // nanoseconds
];

export function formatHalfLife(seconds: number | undefined): string {
  if (seconds === undefined) return 'Stable';

  for (const [unit, factor] of TIME_UNITS) {
    if (seconds >= factor) {
      const value = seconds / factor;
      const formatted = value >= 100
        ? Math.round(value).toString()
        : value >= 10
          ? value.toFixed(1).replace(/\.0$/, '')
          : value.toFixed(2).replace(/\.?0+$/, '');
      const displayUnit = unit === 'us' ? '\u03bcs' : unit;
      return `${formatted} ${displayUnit}`;
    }
  }

  // Sub-nanosecond: use scientific notation with seconds
  const exponent = Math.floor(Math.log10(seconds));
  const mantissa = seconds / Math.pow(10, exponent);
  return `${mantissa.toFixed(1)}e${exponent} s`;
}
