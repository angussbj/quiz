import type { VisualizationElement } from '../VisualizationElement';

/**
 * Grid element for periodic-table-style layouts.
 * Additional data beyond these fields is carried in the
 * quiz data row and rendered by a custom React component.
 */
export interface GridElement extends VisualizationElement {
  readonly row: number;
  readonly column: number;
  readonly symbol: string;
  readonly atomicNumber: number;
}

export function isGridElement(element: VisualizationElement): element is GridElement {
  return 'row' in element && 'column' in element && 'symbol' in element && 'atomicNumber' in element;
}
