import type { VisualizationElement } from '../VisualizationElement';
import type { TimelineTimestamp } from './TimelineTimestamp';

/** Timeline element with date range and track assignment */
export interface TimelineElement extends VisualizationElement {
  readonly start: TimelineTimestamp;
  readonly end?: TimelineTimestamp;
  readonly category: string;
  /**
   * Track index for vertical positioning.
   * If undefined, auto-calculated to minimise overlaps.
   */
  readonly track?: number;
}

export function isTimelineElement(element: VisualizationElement): element is TimelineElement {
  return 'start' in element && 'category' in element;
}
