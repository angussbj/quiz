import type { TimelineElement } from './TimelineElement';
import type { TimelineTimestamp } from './TimelineTimestamp';
import { timestampToFractionalYear } from './TimelineTimestamp';
import { assignTracks } from './assignTracks';
import { computeLogReferenceYear, logYearToViewBoxX } from './logTimeScale';

/**
 * ViewBox units per year on the X axis.
 */
export const UNITS_PER_YEAR = 20;

/** Minimum bar width in viewBox units (for point events and very short intervals). */
const MINIMUM_BAR_WIDTH = UNITS_PER_YEAR * 0.5;

/**
 * Maximum aspect ratio (width / height) before track heights are scaled up.
 * Prevents very wide timelines from having tiny sliver-height bars.
 */
const MAX_ASPECT_RATIO = 5;

/** Minimum track height in viewBox units. */
const MIN_TRACK_HEIGHT = 40;

/** Gap between tracks as a fraction of track height. */
const GAP_FRACTION = 0.2;

export type TimeScale = 'linear' | 'log';

export interface TimelineElementInput {
  readonly id: string;
  readonly label: string;
  readonly start: TimelineTimestamp;
  readonly end?: TimelineTimestamp;
  readonly category: string;
  readonly track?: number;
  readonly group?: string;
  readonly interactive?: boolean;
  readonly wikipediaSlug?: string;
}

/**
 * Build TimelineElements with viewBox positions computed from timestamps.
 *
 * Track height is scaled dynamically so the viewBox aspect ratio stays
 * reasonable for both short and long timelines.
 *
 * @param timeScale 'log' uses log10(years before present) for x positions,
 *                  giving equal visual space to each order of magnitude.
 *                  Suited to deep-time timelines spanning millions of years.
 */
export function buildTimelineElements(
  inputs: ReadonlyArray<TimelineElementInput>,
  timeScale: TimeScale = 'linear',
): ReadonlyArray<TimelineElement> {
  if (inputs.length === 0) return [];

  // For log scale, compute the reference year from the latest event in the data.
  let referenceYear = 0;
  if (timeScale === 'log') {
    let maxYear = -Infinity;
    for (const input of inputs) {
      const endYear = input.end
        ? timestampToFractionalYear(input.end, true)
        : timestampToFractionalYear(input.start, false);
      maxYear = Math.max(maxYear, endYear);
    }
    referenceYear = computeLogReferenceYear(maxYear);
  }

  const toViewBoxX = timeScale === 'log'
    ? (y: number) => logYearToViewBoxX(y, referenceYear)
    : (y: number) => y * UNITS_PER_YEAR;

  // Compute X extent in viewBox units
  let minViewBoxX = Infinity;
  let maxViewBoxX = -Infinity;
  for (const input of inputs) {
    const start = toViewBoxX(timestampToFractionalYear(input.start, false));
    const end = Math.max(
      toViewBoxX(timestampToFractionalYear(input.end ?? input.start, true)),
      start + MINIMUM_BAR_WIDTH,
    );
    minViewBoxX = Math.min(minViewBoxX, start);
    maxViewBoxX = Math.max(maxViewBoxX, end);
  }
  const totalXExtent = maxViewBoxX - minViewBoxX;

  // Minimum gap between adjacent bars in viewBox units — prevents track
  // assignment treating visually-overlapping minimum-width bars as separate.
  const ESTIMATED_CONTAINER_PX = 1000;
  const VISUAL_MIN_BAR_PX = 8;
  const minimumGapUnits = totalXExtent > 0
    ? totalXExtent * VISUAL_MIN_BAR_PX / ESTIMATED_CONTAINER_PX
    : 0;

  const toPosition = timeScale === 'log'
    ? (y: number) => logYearToViewBoxX(y, referenceYear)
    : (y: number) => y * UNITS_PER_YEAR;

  const trackAssignments = assignTracks(inputs, minimumGapUnits, toPosition);

  // Count tracks
  const trackCount = Math.max(1, ...Object.values(trackAssignments).map((t) => t + 1));

  // Compute track height: scale up only if the natural layout is too wide
  const naturalDenom = trackCount * (1 + GAP_FRACTION) - GAP_FRACTION;
  const naturalHeight = MIN_TRACK_HEIGHT * naturalDenom;
  const naturalAspectRatio = totalXExtent / naturalHeight;

  let trackHeight: number;
  if (naturalAspectRatio > MAX_ASPECT_RATIO) {
    const targetTotalHeight = totalXExtent / MAX_ASPECT_RATIO;
    trackHeight = targetTotalHeight / naturalDenom;
  } else {
    trackHeight = MIN_TRACK_HEIGHT;
  }
  const trackGap = trackHeight * GAP_FRACTION;

  const elements: TimelineElement[] = inputs.map((input) => {
    const startFractional = timestampToFractionalYear(input.start, false);
    const endFractional = timestampToFractionalYear(input.end ?? input.start, true);

    const x = toViewBoxX(startFractional);
    const rawWidth = toViewBoxX(endFractional) - x;
    const barWidth = Math.max(rawWidth, MINIMUM_BAR_WIDTH);
    const track = trackAssignments[input.id] ?? 0;
    const y = track * (trackHeight + trackGap);

    return {
      id: input.id,
      label: input.label,
      start: input.start,
      end: input.end,
      category: input.category,
      track,
      group: input.group ?? input.category,
      interactive: input.interactive ?? true,
      wikipediaSlug: input.wikipediaSlug,
      viewBoxCenter: {
        x: x + barWidth / 2,
        y: y + trackHeight / 2,
      },
      viewBoxBounds: {
        minX: x,
        minY: y,
        maxX: x + barWidth,
        maxY: y + trackHeight,
      },
    };
  });

  return elements;
}
