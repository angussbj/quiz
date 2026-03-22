import type { TimelineTimestamp } from './TimelineTimestamp';
import { timestampToFractionalYear } from './TimelineTimestamp';

interface TrackableElement {
  readonly id: string;
  readonly start: TimelineTimestamp;
  readonly end?: TimelineTimestamp;
  readonly track?: number;
}

/**
 * Assign track indices to timeline elements to minimise vertical overlaps.
 *
 * Elements with an explicit `track` keep their assignment.
 * Unassigned elements are greedily placed in the lowest available track
 * where they don't overlap any existing element (with a small gap).
 *
 * @param elements         Elements to assign tracks to.
 * @param minimumGapUnits  Minimum gap (in position units) between adjacent elements.
 * @param toPosition       Optional mapping from fractional year to a position value
 *                         used for overlap comparisons. Defaults to identity.
 *                         Use `logYearToViewBoxX` for log-scale timelines so that
 *                         track assignment reflects visual proximity, not year distance.
 *
 * Returns a map from element ID to track index.
 */
export function assignTracks(
  elements: ReadonlyArray<TrackableElement>,
  minimumGapUnits: number = 0,
  toPosition: (fractionalYear: number) => number = (y) => y,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};

  // Track end positions: trackEnds[i] is the position where track i becomes free
  const trackEnds: number[] = [];

  // Sort by start position, then by span (shorter first) for stable packing
  const sorted = [...elements].sort((a, b) => {
    const aStart = toPosition(timestampToFractionalYear(a.start, false));
    const bStart = toPosition(timestampToFractionalYear(b.start, false));
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = toPosition(a.end ? timestampToFractionalYear(a.end, true) : timestampToFractionalYear(a.start, false));
    const bEnd = toPosition(b.end ? timestampToFractionalYear(b.end, true) : timestampToFractionalYear(b.start, false));
    return (aEnd - aStart) - (bEnd - bStart);
  });

  for (const element of sorted) {
    const start = toPosition(timestampToFractionalYear(element.start, false));
    const end = element.end
      ? toPosition(timestampToFractionalYear(element.end, true))
      : start;

    if (element.track !== undefined) {
      result[element.id] = element.track;
      // Extend track end if needed
      while (trackEnds.length <= element.track) {
        trackEnds.push(-Infinity);
      }
      trackEnds[element.track] = Math.max(trackEnds[element.track], end + minimumGapUnits);
      continue;
    }

    // Find the lowest track where this element fits
    let assignedTrack = -1;
    for (let t = 0; t < trackEnds.length; t++) {
      if (trackEnds[t] <= start) {
        assignedTrack = t;
        break;
      }
    }

    if (assignedTrack === -1) {
      assignedTrack = trackEnds.length;
      trackEnds.push(-Infinity);
    }

    result[element.id] = assignedTrack;
    trackEnds[assignedTrack] = end + minimumGapUnits;
  }

  return result;
}
