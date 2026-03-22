import type { FlagGridElement } from './FlagGridElement';
import type { VisualizationElement } from '../VisualizationElement';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y } from './flagGridLayout';

/**
 * Re-layouts a FlagGridElement at a given index in a grid with the given
 * number of columns. Returns a VisualizationElement with correct viewBox
 * coordinates for ZoomPanContainer.
 */
export function layoutFlagElement(
  element: FlagGridElement,
  index: number,
  columns: number,
): FlagGridElement & VisualizationElement {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const x = col * FLAG_CELL_STEP_X;
  const y = row * FLAG_CELL_STEP_Y;

  return {
    ...element,
    row,
    column: col,
    viewBoxCenter: { x: x + FLAG_CELL_WIDTH / 2, y: y + FLAG_CELL_HEIGHT / 2 },
    viewBoxBounds: { minX: x, minY: y, maxX: x + FLAG_CELL_WIDTH, maxY: y + FLAG_CELL_HEIGHT },
  };
}
