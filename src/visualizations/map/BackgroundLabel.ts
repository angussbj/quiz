import type { ViewBoxPosition } from '../VisualizationElement';

/** A label positioned at a background shape's centroid (e.g., country name). */
export interface BackgroundLabel {
  readonly id: string;
  readonly name: string;
  /** Primary center position (polygon centroid). Used as fallback. */
  readonly center: ViewBoxPosition;
  /**
   * Multiple candidate center positions, ordered: polylabel, bbox center, polygon centroid.
   * The placement algorithm tries all of these before falling back to search patterns.
   */
  readonly centers: ReadonlyArray<ViewBoxPosition>;
  readonly code?: string;
  /** Sovereign country name. Matches name for sovereign states; blank for territories/disputed. */
  readonly sovereign?: string;
  /** Approximate area of the largest path segment (used for importance ranking). */
  readonly area: number;
  /** Region (e.g., 'Europe', 'Asia') for filtering. May be pipe-separated for multi-region. */
  readonly region?: string;
  /** Subregion / group (e.g., 'South America', 'Caribbean') for filtering. */
  readonly group?: string;
}
