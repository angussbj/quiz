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
 * Format a year value using geological notation (Ga = gigayears, Ma = megayears, ka = kiloyears).
 * Used for deep-time tick levels where raw year numbers would be unreadable.
 */
function formatGeologicalYear(year: number, unitDivisor: number, unitSuffix: string): string {
  const absVal = Math.abs(year) / unitDivisor;
  const formatted = Number.isInteger(absVal) ? `${absVal}` : absVal.toPrecision(2);
  if (year === 0) return '0';
  return `${formatted} ${unitSuffix}`;
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
}> = [
  // Geological: billion-year scale (Hadean, Archean, Proterozoic eons)
  {
    majorInterval: 1_000_000_000,
    minorInterval: 100_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000_000, 'Ga'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000_000, 'Ga'),
    minPixelsPerMinorTick: 40,
  },
  // Geological: hundred-million-year scale (Phanerozoic eons, eras)
  {
    majorInterval: 100_000_000,
    minorInterval: 10_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
  },
  // Geological: ten-million-year scale (geological periods)
  {
    majorInterval: 10_000_000,
    minorInterval: 1_000_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
  },
  // Deep time: million-year scale (evolution, early hominids)
  {
    majorInterval: 1_000_000,
    minorInterval: 100_000,
    formatMajor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    formatMinor: (y) => formatGeologicalYear(y, 1_000_000, 'Ma'),
    minPixelsPerMinorTick: 40,
  },
  // Prehistoric: hundred-thousand-year scale (Ice Ages, early humans)
  {
    majorInterval: 100_000,
    minorInterval: 10_000,
    formatMajor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k BCE` : `${y}`,
    formatMinor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k` : `${y}`,
    minPixelsPerMinorTick: 40,
  },
  // Prehistoric: ten-thousand-year scale (early civilizations, stone age)
  {
    majorInterval: 10_000,
    minorInterval: 1_000,
    formatMajor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k BCE` : `${y}`,
    formatMinor: (y) => y < 0 ? `${Math.abs(y) / 1_000}k` : `${y}`,
    minPixelsPerMinorTick: 40,
  },
  // Historical: thousand-year scale (ancient history)
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

  // Generate minor ticks (cap at 300 to prevent runaway generation at extreme zoom levels)
  const MAX_TICKS = 300;
  const minorStart = Math.floor(startYear / bestLevel.minorInterval) * bestLevel.minorInterval;
  for (
    let t = minorStart;
    t <= endYear + bestLevel.minorInterval;
    t += bestLevel.minorInterval
  ) {
    if (t < startYear - bestLevel.minorInterval) continue;
    if (ticks.length >= MAX_TICKS) break;

    const isMajor = Math.abs(t % bestLevel.majorInterval) < bestLevel.minorInterval * 0.01;
    ticks.push({
      fractionalYear: t,
      label: isMajor ? bestLevel.formatMajor(Math.round(t)) : bestLevel.formatMinor(t),
      isMajor,
    });
  }

  return ticks;
}
