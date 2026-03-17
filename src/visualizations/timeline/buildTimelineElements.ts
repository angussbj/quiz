import type { TimelineElement } from './TimelineElement';
import type { TimelineTimestamp } from './TimelineTimestamp';
import { timestampToFractionalYear } from './TimelineTimestamp';
import { assignTracks } from './assignTracks';

/**
 * ViewBox units per year on the X axis.
 * Scales raw fractional years into viewBox coordinates that produce
 * reasonable bar widths relative to the track height.
 */
export const UNITS_PER_YEAR = 20;

/** Minimum bar width in viewBox units (for point events and very short intervals). */
const MINIMUM_BAR_WIDTH = UNITS_PER_YEAR * 0.5;

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

/** Height of each track in viewBox units. */
export const TRACK_HEIGHT = 40;
/** Vertical gap between tracks. */
export const TRACK_GAP = 8;

/**
 * Build TimelineElements with viewBox positions computed from timestamps.
 *
 * X axis = fractional years * UNITS_PER_YEAR.
 * Y axis = track index * (TRACK_HEIGHT + TRACK_GAP).
 *
 * Auto-assigns tracks for elements without explicit track values.
 */
export function buildTimelineElements(
  inputs: ReadonlyArray<TimelineElementInput>,
): ReadonlyArray<TimelineElement> {
  if (inputs.length === 0) return [];

  const trackAssignments = assignTracks(inputs);

  return inputs.map((input) => {
    const startFractional = timestampToFractionalYear(input.start, false);
    const endFractional = input.end
      ? timestampToFractionalYear(input.end, true)
      : startFractional;

    const rawWidth = (endFractional - startFractional) * UNITS_PER_YEAR;
    const barWidth = Math.max(rawWidth, MINIMUM_BAR_WIDTH);
    const x = startFractional * UNITS_PER_YEAR;
    const track = trackAssignments[input.id] ?? 0;
    const y = track * (TRACK_HEIGHT + TRACK_GAP);

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
        y: y + TRACK_HEIGHT / 2,
      },
      viewBoxBounds: {
        minX: x,
        minY: y,
        maxX: x + barWidth,
        maxY: y + TRACK_HEIGHT,
      },
    };
  });
}
