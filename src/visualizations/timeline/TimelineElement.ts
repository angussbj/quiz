import type { VisualizationElement } from '../VisualizationElement';

/** Timeline element with date range and track assignment */
export interface TimelineElement extends VisualizationElement {
  readonly startYear: number;
  readonly endYear?: number;
  readonly category: string;
  /**
   * Track index for vertical positioning.
   * If undefined, auto-calculated to minimise overlaps.
   */
  readonly track?: number;
}

export function isTimelineElement(element: VisualizationElement): element is TimelineElement {
  return 'startYear' in element && 'category' in element;
}
