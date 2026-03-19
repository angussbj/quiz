import type { VisualizationElement, GeoCoordinates } from '../VisualizationElement';

/** Map element with geographic data and SVG shape */
export interface MapElement extends VisualizationElement {
  readonly geoCoordinates: GeoCoordinates;
  /** SVG path data for the country/region shape or river line */
  readonly svgPathData: string;
  /** ISO code or similar machine-readable identifier */
  readonly code: string;
  /** How to render the SVG path: 'fill' for closed polygons (countries), 'stroke' for lines (rivers). Defaults to 'fill'. */
  readonly pathRenderStyle?: 'fill' | 'stroke';
}

export function isMapElement(element: VisualizationElement): element is MapElement {
  return 'geoCoordinates' in element && 'svgPathData' in element;
}
