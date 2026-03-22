import { motion, AnimatePresence } from 'framer-motion';
import type { GridLocateFeedbackItem } from './GridLocateFeedbackItem';

function pathColor(distance: number): string {
  if (distance <= 2) return 'var(--color-highlight)';
  return 'var(--color-incorrect)';
}

interface GridLocateFeedbackProps {
  readonly feedbackItems: ReadonlyArray<GridLocateFeedbackItem>;
}

/**
 * SVG underlay showing an L-shaped path line from clicked element to target element.
 * Rendered BEFORE grid cells so element rectangles naturally cover the line,
 * making it visible only in empty grid areas.
 *
 * The L-path goes vertical first (at clicked element's x), then horizontal
 * (at target element's y) — the horizontal part is at the "bottom" of the vertical.
 */
export function GridLocateFeedback({ feedbackItems }: GridLocateFeedbackProps) {
  return (
    <AnimatePresence>
      {feedbackItems.map((item) => (
        <GridFeedbackPath key={item.id} item={item} />
      ))}
    </AnimatePresence>
  );
}

interface GridFeedbackPathProps {
  readonly item: GridLocateFeedbackItem;
}

function GridFeedbackPath({ item }: GridFeedbackPathProps) {
  const color = pathColor(item.manhattanDistance);
  const { clickedCenter, targetCenter } = item;

  // L-shaped path: vertical at clicked x, then horizontal at target y
  const cornerX = clickedCenter.x;
  const cornerY = targetCenter.y;

  // If same row (no vertical segment), just horizontal
  const sameRow = clickedCenter.y === targetCenter.y;
  // If same column (no horizontal segment), just vertical
  const sameCol = clickedCenter.x === targetCenter.x;

  const points = sameRow || sameCol
    ? `${clickedCenter.x},${clickedCenter.y} ${targetCenter.x},${targetCenter.y}`
    : `${clickedCenter.x},${clickedCenter.y} ${cornerX},${cornerY} ${targetCenter.x},${targetCenter.y}`;

  // Label position near the corner of the L (or midpoint if straight line)
  const labelX = sameRow || sameCol
    ? (clickedCenter.x + targetCenter.x) / 2
    : cornerX;
  const labelY = sameRow || sameCol
    ? (clickedCenter.y + targetCenter.y) / 2
    : cornerY;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={0.7}
      />

      {/* Distance label */}
      <text
        x={labelX}
        y={labelY - 8}
        textAnchor="middle"
        fill={color}
        fontSize={12}
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {item.manhattanDistance} away
      </text>
    </motion.g>
  );
}
