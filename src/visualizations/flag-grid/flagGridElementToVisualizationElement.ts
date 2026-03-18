import type { FlagGridElement } from './FlagGridElement';
import type { VisualizationElement } from '../VisualizationElement';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y } from './flagGridLayout';

/**
 * Ensures a FlagGridElement has correct viewBoxCenter and viewBoxBounds
 * computed from its row/column position. Needed by ZoomPanContainer
 * for viewBox calculation and clustering.
 */
export function flagGridElementToVisualizationElement(element: FlagGridElement): VisualizationElement {
  const x = element.column * FLAG_CELL_STEP_X;
  const y = element.row * FLAG_CELL_STEP_Y;

  return {
    ...element,
    viewBoxCenter: { x: x + FLAG_CELL_WIDTH / 2, y: y + FLAG_CELL_HEIGHT / 2 },
    viewBoxBounds: { minX: x, minY: y, maxX: x + FLAG_CELL_WIDTH, maxY: y + FLAG_CELL_HEIGHT },
  };
}
