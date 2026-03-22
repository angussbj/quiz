import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DistanceFeedbackLine } from '../VisualizationRendererProps';
import type { VisualizationElement, ViewBoxPosition } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { isGridElement } from './GridElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';
import { computeTrueGridPosition, computeTrueGridPath } from '@/quiz-definitions/quiz-specific-logic/periodicTableTrueGrid';

/** Maximum visual distance (in viewBox units) for two cells to be connected by a line segment. */
const MAX_SEGMENT_DISTANCE = CELL_STEP * 2.5;

interface GridFeedbackOverlayProps {
  readonly lines: ReadonlyArray<DistanceFeedbackLine>;
  readonly elements: ReadonlyArray<VisualizationElement>;
}

/**
 * Renders distance feedback paths on top of grid cells.
 * For each feedback line, computes the Manhattan path through the true 32-column
 * grid and draws line segments between visually adjacent cell centers.
 */
export function GridFeedbackOverlay({ lines, elements }: GridFeedbackOverlayProps) {
  const cellCenterMap = useMemo(() => {
    const map = new Map<string, ViewBoxPosition>();
    for (const element of elements) {
      if (!isGridElement(element)) continue;
      map.set(
        `${element.row},${element.column}`,
        { x: element.column * CELL_STEP + CELL_SIZE / 2, y: element.row * CELL_STEP + CELL_SIZE / 2 },
      );
    }
    return map;
  }, [elements]);

  return (
    <AnimatePresence>
      {lines.map((line) => (
        <GridFeedbackPath key={line.id} line={line} cellCenterMap={cellCenterMap} />
      ))}
    </AnimatePresence>
  );
}

interface GridFeedbackPathProps {
  readonly line: DistanceFeedbackLine;
  readonly cellCenterMap: Map<string, ViewBoxPosition>;
}

/**
 * Given a cell center and a true-grid step direction, return the point on the
 * cell edge in that direction. Uses true-grid direction rather than visual
 * displacement so that transitions between the main grid and lanthanide/actinide
 * rows extend horizontally (as they are in the true 32-column layout).
 */
function edgePoint(
  cellCenter: ViewBoxPosition,
  trueColStep: number,
  trueRowStep: number,
): ViewBoxPosition {
  const halfCell = CELL_SIZE / 2;
  if (trueColStep !== 0) {
    return { x: cellCenter.x + (trueColStep > 0 ? halfCell : -halfCell), y: cellCenter.y };
  }
  return { x: cellCenter.x, y: cellCenter.y + (trueRowStep > 0 ? halfCell : -halfCell) };
}

function viewBoxToGridCell(pos: ViewBoxPosition): { readonly row: number; readonly column: number } {
  return {
    row: Math.round((pos.y - CELL_SIZE / 2) / CELL_STEP),
    column: Math.round((pos.x - CELL_SIZE / 2) / CELL_STEP),
  };
}

function GridFeedbackPath({ line, cellCenterMap }: GridFeedbackPathProps) {
  const color = line.elementState === 'hidden'
    ? STATUS_COLORS['default'].main
    : STATUS_COLORS[line.elementState].main;

  const segments = useMemo(() => {
    const fromCell = viewBoxToGridCell(line.from);
    const toCell = viewBoxToGridCell(line.to);
    const fromTrue = computeTrueGridPosition(fromCell.row, fromCell.column);
    const toTrue = computeTrueGridPosition(toCell.row, toCell.column);
    const pathCells = computeTrueGridPath(fromTrue, toTrue);

    // Resolve each path cell to a visual center and its true-grid position,
    // skipping cells that don't exist in the visual layout.
    const resolved: Array<{ center: ViewBoxPosition; trueRow: number; trueCol: number }> = [];
    for (const cell of pathCells) {
      const center = cellCenterMap.get(`${cell.row},${cell.column}`);
      if (!center) continue;
      const truePos = computeTrueGridPosition(cell.row, cell.column);
      resolved.push({ center, trueRow: truePos.trueRow, trueCol: truePos.trueColumn });
    }

    // Group into contiguous segments where consecutive points are visually adjacent.
    // At gap boundaries, extend to the cell edge using the true-grid step direction.
    const result: Array<Array<ViewBoxPosition>> = [];
    let current: Array<ViewBoxPosition> = [];
    for (let i = 0; i < resolved.length; i++) {
      if (current.length === 0) {
        current.push(resolved[i].center);
      } else {
        const prev = resolved[i - 1];
        const cur = resolved[i];
        const dx = Math.abs(cur.center.x - prev.center.x);
        const dy = Math.abs(cur.center.y - prev.center.y);
        if (dx <= MAX_SEGMENT_DISTANCE && dy <= MAX_SEGMENT_DISTANCE) {
          current.push(cur.center);
        } else {
          // True-grid step direction at this gap
          const trueColStep = Math.sign(cur.trueCol - prev.trueCol);
          const trueRowStep = Math.sign(cur.trueRow - prev.trueRow);
          // Extend last point of current segment to its cell edge toward the gap
          current.push(edgePoint(prev.center, trueColStep, trueRowStep));
          result.push(current);
          // Start new segment from the cell edge of the next point toward the gap
          current = [edgePoint(cur.center, -trueColStep, -trueRowStep), cur.center];
        }
      }
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [line.from, line.to, cellCenterMap]);

  // Position label near the midpoint of the first segment (or at the from position)
  const labelPos = useMemo(() => {
    if (segments.length === 0) return line.from;
    const firstSeg = segments[0];
    const mid = Math.floor(firstSeg.length / 2);
    return firstSeg[mid];
  }, [segments, line.from]);

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {segments.map((seg, i) => {
        if (seg.length < 2) return null;
        const pointsStr = seg.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <polyline
            key={i}
            points={pointsStr}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.7}
          />
        );
      })}

      {line.label && (
        <text
          x={labelPos.x}
          y={labelPos.y - 8}
          textAnchor="middle"
          fill={color}
          fontSize={12}
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {line.label}
        </text>
      )}
    </motion.g>
  );
}
