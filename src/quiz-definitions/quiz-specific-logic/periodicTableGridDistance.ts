import type { ViewBoxPosition } from '@/visualizations/VisualizationElement';
import { CELL_SIZE, CELL_STEP } from '@/visualizations/periodic-table/cellLayout';
import { computeTrueGridPosition, computeTrueGridPath } from './periodicTableTrueGrid';

function viewBoxToGridCell(pos: ViewBoxPosition): { readonly row: number; readonly column: number } {
  return {
    row: Math.round((pos.y - CELL_SIZE / 2) / CELL_STEP),
    column: Math.round((pos.x - CELL_SIZE / 2) / CELL_STEP),
  };
}

/**
 * Build a set of occupied visual grid positions from element viewBox centers.
 * Returns a Set of "row,column" strings for O(1) lookup.
 */
export function buildOccupiedCells(
  elementCenters: ReadonlyArray<ViewBoxPosition>,
): ReadonlySet<string> {
  const set = new Set<string>();
  for (const center of elementCenters) {
    const cell = viewBoxToGridCell(center);
    set.add(`${cell.row},${cell.column}`);
  }
  return set;
}

/**
 * Compute the distance between a click position and a target position,
 * counting distinct occupied cells along the L-shaped true-grid path
 * (excluding the start cell). Phantom true-grid positions are already
 * filtered out by computeTrueGridPath.
 */
export function periodicTableGridDistance(
  clickPos: ViewBoxPosition,
  targetPos: ViewBoxPosition,
  occupiedCells: ReadonlySet<string>,
): number {
  const clickCell = viewBoxToGridCell(clickPos);
  const targetCell = viewBoxToGridCell(targetPos);

  const clickTrue = computeTrueGridPosition(clickCell.row, clickCell.column);
  const targetTrue = computeTrueGridPosition(targetCell.row, targetCell.column);

  const pathCells = computeTrueGridPath(clickTrue, targetTrue);

  // Count distinct occupied cells along the path, excluding the start cell.
  const visited = new Set<string>();
  visited.add(`${pathCells[0].row},${pathCells[0].column}`);
  let count = 0;
  for (let i = 1; i < pathCells.length; i++) {
    const key = `${pathCells[i].row},${pathCells[i].column}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (occupiedCells.has(key)) {
      count++;
    }
  }
  return count;
}
