/**
 * Layout constants for the flag grid (in viewBox units).
 * Flags have a ~3:2 aspect ratio, so cells are wider than tall.
 */
export const FLAG_CELL_WIDTH = 90;
export const FLAG_CELL_HEIGHT = 70;
export const FLAG_GAP = 6;
export const FLAG_DEFAULT_COLUMNS = 8;
export const FLAG_CELL_STEP_X = FLAG_CELL_WIDTH + FLAG_GAP;
export const FLAG_CELL_STEP_Y = FLAG_CELL_HEIGHT + FLAG_GAP;

/**
 * Compute the optimal number of columns so the grid's aspect ratio
 * roughly matches the container's aspect ratio.
 */
export function computeFlagColumns(
  containerWidth: number,
  containerHeight: number,
  elementCount: number,
): number {
  if (containerWidth === 0 || containerHeight === 0 || elementCount === 0) {
    return FLAG_DEFAULT_COLUMNS;
  }
  const containerAspect = containerWidth / containerHeight;
  const idealColumns = Math.sqrt(
    elementCount * (FLAG_CELL_STEP_Y / FLAG_CELL_STEP_X) * containerAspect,
  );
  const clamped = Math.max(3, Math.min(Math.round(idealColumns), elementCount));
  return clamped;
}
