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
 * Returns a map from element ID to track index.
 */
export function assignTracks(
  elements: ReadonlyArray<TrackableElement>,
  minimumGapYears: number = 0,
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};

  // Track end times: trackEnds[i] is the fractional year where track i becomes free
  const trackEnds: number[] = [];

  // Sort by start time, then by duration (shorter first) for stable packing
  const sorted = [...elements].sort((a, b) => {
    const aStart = timestampToFractionalYear(a.start, false);
    const bStart = timestampToFractionalYear(b.start, false);
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = a.end ? timestampToFractionalYear(a.end, true) : aStart;
    const bEnd = b.end ? timestampToFractionalYear(b.end, true) : bStart;
    return (aEnd - aStart) - (bEnd - bStart);
  });

  for (const element of sorted) {
    const start = timestampToFractionalYear(element.start, false);
    const end = element.end
      ? timestampToFractionalYear(element.end, true)
      : start;

    if (element.track !== undefined) {
      result[element.id] = element.track;
      // Extend track end if needed
      while (trackEnds.length <= element.track) {
        trackEnds.push(-Infinity);
      }
      trackEnds[element.track] = Math.max(trackEnds[element.track], end + minimumGapYears);
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
    trackEnds[assignedTrack] = end + minimumGapYears;
  }

  return result;
}
