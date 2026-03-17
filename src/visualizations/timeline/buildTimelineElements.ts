import type { TimelineElement } from './TimelineElement';
import type { TimelineTimestamp } from './TimelineTimestamp';
import { timestampToFractionalYear } from './TimelineTimestamp';
import { assignTracks } from './assignTracks';

/**
 * ViewBox units per year on the X axis.
 */
export const UNITS_PER_YEAR = 20;

/** Minimum bar width in viewBox units (for point events and very short intervals). */
const MINIMUM_BAR_WIDTH = UNITS_PER_YEAR * 0.5;

/**
 * Target viewBox aspect ratio (width / height).
 * Track height is scaled so the overall extent approaches this ratio.
 */
const TARGET_ASPECT_RATIO = 5;

/** Minimum track height in viewBox units. */
const MIN_TRACK_HEIGHT = 40;

/** Gap between tracks as a fraction of track height. */
const GAP_FRACTION = 0.2;

export interface TimelineElementInput {
  readonly id: string;
  readonly label: string;
  readonly start: TimelineTimestamp;
  readonly end?: TimelineTimestamp;
  readonly category: string;
  readonly track?: number;
  readonly group?: string;
  readonly interactive?: boolean;
}

/**
 * Build TimelineElements with viewBox positions computed from timestamps.
 *
 * Track height is scaled dynamically so the viewBox aspect ratio stays
 * reasonable for both short and long timelines.
 */
export function buildTimelineElements(
  inputs: ReadonlyArray<TimelineElementInput>,
): ReadonlyArray<TimelineElement> {
  if (inputs.length === 0) return [];

  const trackAssignments = assignTracks(inputs);

  // Compute X extent
  let minFractional = Infinity;
  let maxFractional = -Infinity;
  for (const input of inputs) {
    const start = timestampToFractionalYear(input.start, false);
    const end = input.end
      ? timestampToFractionalYear(input.end, true)
      : start + MINIMUM_BAR_WIDTH / UNITS_PER_YEAR;
    minFractional = Math.min(minFractional, start);
    maxFractional = Math.max(maxFractional, end);
  }
  const totalXExtent = (maxFractional - minFractional) * UNITS_PER_YEAR;

  // Count tracks
  const trackCount = Math.max(1, ...Object.values(trackAssignments).map((t) => t + 1));

  // Compute track height: scale up only if the natural layout is too wide
  const naturalDenom = trackCount * (1 + GAP_FRACTION) - GAP_FRACTION;
  const naturalHeight = MIN_TRACK_HEIGHT * naturalDenom;
  const naturalAspectRatio = totalXExtent / naturalHeight;

  let trackHeight: number;
  if (naturalAspectRatio > TARGET_ASPECT_RATIO) {
    const targetTotalHeight = totalXExtent / TARGET_ASPECT_RATIO;
    trackHeight = targetTotalHeight / naturalDenom;
  } else {
    trackHeight = MIN_TRACK_HEIGHT;
  }
  const trackGap = trackHeight * GAP_FRACTION;

  const elements: TimelineElement[] = inputs.map((input) => {
    const startFractional = timestampToFractionalYear(input.start, false);
    const endFractional = input.end
      ? timestampToFractionalYear(input.end, true)
      : startFractional;

    const rawWidth = (endFractional - startFractional) * UNITS_PER_YEAR;
    const barWidth = Math.max(rawWidth, MINIMUM_BAR_WIDTH);
    const x = startFractional * UNITS_PER_YEAR;
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

  // For narrow timelines, ensure landscape by padding X extent
  ensureLandscapeExtent(elements);

  return elements;
}

/**
 * If the overall extent is portrait, extend element bounds
 * symmetrically so the viewBox ends up landscape.
 */
function ensureLandscapeExtent(elements: TimelineElement[]): void {
  if (elements.length === 0) return;

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0;
  for (const el of elements) {
    minX = Math.min(minX, el.viewBoxBounds.minX);
    maxX = Math.max(maxX, el.viewBoxBounds.maxX);
    maxY = Math.max(maxY, el.viewBoxBounds.maxY);
  }

  const currentWidth = maxX - minX;
  const requiredWidth = maxY * TARGET_ASPECT_RATIO;

  if (currentWidth >= requiredWidth) return;

  const padding = (requiredWidth - currentWidth) / 2;
  const first = elements[0];
  (first as { viewBoxBounds: { minX: number } }).viewBoxBounds = {
    ...first.viewBoxBounds,
    minX: first.viewBoxBounds.minX - padding,
  };

  const last = elements[elements.length - 1];
  (last as { viewBoxBounds: { maxX: number } }).viewBoxBounds = {
    ...last.viewBoxBounds,
    maxX: last.viewBoxBounds.maxX + padding,
  };
}
