import type { VisualizationElement, GeoCoordinates, ViewBoxPosition } from '../VisualizationElement';

/** Map element with geographic data and SVG shape */
export interface MapElement extends VisualizationElement {
  readonly geoCoordinates: GeoCoordinates;
  /** SVG path data for the country/region shape or river line */
  readonly svgPathData: string;
  /** ISO code or similar machine-readable identifier */
  readonly code: string;
  /** How to render the SVG path: 'fill' for closed polygons (countries), 'stroke' for lines (rivers). Defaults to 'fill'. */
  readonly pathRenderStyle?: 'fill' | 'stroke';
  /** Anchor point for label rendering (e.g. point along river path). Falls back to viewBoxCenter. */
  readonly labelAnchor?: ViewBoxPosition;
  /** Name of the direct parent river (e.g. 'Mississippi' for 'Ohio'). Undefined for top-level rivers. */
  readonly tributaryOf?: string;
  /** Name of the parent river this distributary branches from (e.g. 'Nile' for 'Rosetta Branch'). */
  readonly distributaryOf?: string;
  /** Canonical river name when this element is a named section of a larger river
   *  (e.g. 'Tigris' for 'Dicle'). When the 'includeSegmentNames' toggle is off,
   *  all segments are answered together with the canonical. */
  readonly segmentOf?: string;
}

export function isMapElement(element: VisualizationElement): element is MapElement {
  return 'geoCoordinates' in element && 'svgPathData' in element;
}
