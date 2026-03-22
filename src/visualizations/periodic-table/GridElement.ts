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
  /** Row in the extended 32-column periodic table (lanthanides/actinides inserted inline). */
  readonly trueRow: number;
  /** Column in the extended 32-column periodic table. */
  readonly trueColumn: number;
}

export function isGridElement(element: VisualizationElement): element is GridElement {
  return 'row' in element && 'column' in element && 'symbol' in element && 'atomicNumber' in element
    && 'trueRow' in element && 'trueColumn' in element;
}
