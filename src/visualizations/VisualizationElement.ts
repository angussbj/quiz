/** Position in SVG viewBox coordinate space (stable, does not change with zoom/pan) */
export interface ViewBoxPosition {
  readonly x: number;
  readonly y: number;
  /** Optional third axis for 3D renderers (e.g. anatomy-3d). 2D renderers ignore this. */
  readonly z?: number;
}

/** Bounding box in SVG viewBox coordinate space */
export interface ViewBoxBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Latitude/longitude in geographic coordinate space (raw data) */
export interface GeoCoordinates {
  readonly latitude: number;
  readonly longitude: number;
}

export type ElementVisualState =
  | 'default'
  | 'hidden'
  | 'highlighted'
  | 'context'
  | 'correct'
  | 'correct-second'
  | 'correct-third'
  | 'incorrect'
  | 'missed';

/**
 * Base element in a visualization.
 * Renderers compute viewBox positions from data coordinates once.
 * These positions do NOT change with zoom/pan — the SVG transform handles that.
 */
export interface VisualizationElement {
  readonly id: string;
  readonly label: string;
  /** Center position in SVG viewBox space (computed once from data by renderer) */
  readonly viewBoxCenter: ViewBoxPosition;
  /** Bounding box in SVG viewBox space (computed once from data by renderer) */
  readonly viewBoxBounds: ViewBoxBounds;
  /** Whether this element can be clicked/hovered as a quiz answer */
  readonly interactive: boolean;
  /** Optional group for color coding (e.g., continent, era, element group) */
  readonly group?: string;
  /** Label placement relative to the element center. Default: 'right'. Subtypes may override with a richer type. */
  readonly labelPosition?: 'left' | 'right' | 'above' | 'below' | 'above-left' | 'above-right' | 'below-left' | 'below-right' | LeaderLineLabelPosition;
  /** Optional subtitle shown below the element name in identify/locate prompts.
   *  Set automatically when related elements (tributaries, distributaries) are merged
   *  into this element's paths. E.g. "(and tributaries)". */
  readonly promptSubtitle?: string;
  /** Wikipedia page slug for the hover preview (e.g. "General_relativity").
   *  The last segment of the Wikipedia URL. If set, hovering with a visible label
   *  shows the first paragraph from Wikipedia; Cmd+click opens the page. */
  readonly wikipediaSlug?: string;
}

/** Pre-computed label position for leader-line style labels (e.g. anatomy diagrams) */
export interface LeaderLineLabelPosition {
  readonly labelX: number;
  readonly labelY: number;
  readonly anchorX: number;
  readonly anchorY: number;
}
