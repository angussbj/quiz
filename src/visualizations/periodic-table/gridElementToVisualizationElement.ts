import type { GridElement } from './GridElement';
import type { VisualizationElement } from '../VisualizationElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

/**
 * Ensures a GridElement has correct viewBoxCenter and viewBoxBounds
 * computed from its row/column position. This is needed because
 * ZoomPanContainer uses these fields for viewBox calculation and clustering.
 */
export function gridElementToVisualizationElement(element: GridElement): VisualizationElement {
  const x = element.column * CELL_STEP;
  const y = element.row * CELL_STEP;

  return {
    ...element,
    viewBoxCenter: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
    viewBoxBounds: { minX: x, minY: y, maxX: x + CELL_SIZE, maxY: y + CELL_SIZE },
  };
}
