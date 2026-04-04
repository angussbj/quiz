import type { VisualizationElement } from '../VisualizationElement';

/**
 * Grid element for periodic-table-style layouts.
 * Structural fields define position and identity. Numeric data fields
 * (density, electronegativity, cost, etc.) are carried in the generic
 * `dataColumns` record on VisualizationElement.
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
  /** Atomic weight as a display string (e.g. "1.008", "244"). */
  readonly atomicWeight: string;
}

export function isGridElement(element: VisualizationElement): element is GridElement {
  return 'row' in element && 'column' in element && 'symbol' in element && 'atomicNumber' in element
    && 'trueRow' in element && 'trueColumn' in element && 'atomicWeight' in element;
}
