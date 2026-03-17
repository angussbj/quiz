/**
 * A tick mark on the time axis.
 * Major ticks get larger labels (e.g., century/decade); minor ticks get smaller ones (e.g., year/month).
 */
export interface AxisTick {
  readonly fractionalYear: number;
  readonly label: string;
  readonly isMajor: boolean;
}

/**
 * Standard intervals for axis ticks, ordered from largest to smallest.
 * Each entry defines the interval in years, and how to format major/minor labels.
 */
const TICK_LEVELS: ReadonlyArray<{
  readonly majorInterval: number;
  readonly minorInterval: number;
  readonly formatMajor: (year: number) => string;
  readonly formatMinor: (year: number) => string;
  /** Approximate minimum screen pixels between minor ticks for this level to activate */
  readonly minPixelsPerMinorTick: number;
}> = [
  {
    majorInterval: 1000,
    minorInterval: 100,
    formatMajor: (y) => `${y}`,
    formatMinor: (y) => `${y}`,
    minPixelsPerMinorTick: 40,
  },
  {
    majorInterval: 100,
    minorInterval: 10,
    formatMajor: (y) => `${y}`,
    formatMinor: (y) => `${y}`,
    minPixelsPerMinorTick: 40,
  },
  {
    majorInterval: 10,
    minorInterval: 1,
    formatMajor: (y) => `${y}`,
    formatMinor: (y) => `${y}`,
    minPixelsPerMinorTick: 40,
  },
  {
    majorInterval: 1,
    minorInterval: 1 / 12,
    formatMajor: (y) => `${y}`,
    formatMinor: (y) => {
      const month = Math.round((y % 1) * 12);
      const monthNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
      return monthNames[month] ?? '';
    },
    minPixelsPerMinorTick: 20,
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

  // Find the best tick level: the finest level where minor ticks are spaced far enough apart
  let bestLevel = TICK_LEVELS[0];
  for (const level of TICK_LEVELS) {
    const pixelsPerMinorTick = pixelsPerYear * level.minorInterval;
    if (pixelsPerMinorTick >= level.minPixelsPerMinorTick) {
      bestLevel = level;
    }
  }

  const ticks: AxisTick[] = [];

  // Generate minor ticks
  const minorStart = Math.floor(startYear / bestLevel.minorInterval) * bestLevel.minorInterval;
  for (
    let t = minorStart;
    t <= endYear + bestLevel.minorInterval;
    t += bestLevel.minorInterval
  ) {
    if (t < startYear - bestLevel.minorInterval) continue;

    const isMajor = Math.abs(t % bestLevel.majorInterval) < bestLevel.minorInterval * 0.01;
    ticks.push({
      fractionalYear: t,
      label: isMajor ? bestLevel.formatMajor(Math.round(t)) : bestLevel.formatMinor(t),
      isMajor,
    });
  }

  return ticks;
}
