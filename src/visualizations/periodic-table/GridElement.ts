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
  /** Atomic weight as a display string (e.g. "1.008", "244"). */
  readonly atomicWeight: string;
  /** Half-life of most stable isotope in seconds, or undefined if stable. */
  readonly halfLifeSeconds: number | undefined;
}

export function isGridElement(element: VisualizationElement): element is GridElement {
  return 'row' in element && 'column' in element && 'symbol' in element && 'atomicNumber' in element
    && 'trueRow' in element && 'trueColumn' in element;
}
