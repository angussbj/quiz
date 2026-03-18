import type { ViewBoxPosition } from '../VisualizationElement';

/** A label positioned at a background shape's centroid (e.g., country name). */
export interface BackgroundLabel {
  readonly id: string;
  readonly name: string;
  readonly center: ViewBoxPosition;
  readonly code?: string;
}
