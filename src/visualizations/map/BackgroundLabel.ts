import type { ViewBoxPosition } from '../VisualizationElement';

/** A label positioned at a background shape's centroid (e.g., country name). */
export interface BackgroundLabel {
  readonly id: string;
  readonly name: string;
  readonly center: ViewBoxPosition;
  readonly code?: string;
  /** Sovereign country name. Matches name for sovereign states; blank for territories/disputed. */
  readonly sovereign?: string;
  /** Approximate area of the largest path segment (used for importance ranking). */
  readonly area: number;
}
