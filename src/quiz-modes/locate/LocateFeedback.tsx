import { motion, AnimatePresence } from 'framer-motion';
import type { LocateFeedbackItem } from './LocateFeedbackItem';
import { formatDistance } from './formatDistance';

function scoreColor(score: number): string {
  if (score >= 0.9) return 'var(--color-correct)';
  if (score >= 0.4) return 'var(--color-highlight)';
  return 'var(--color-incorrect)';
}

interface LocateFeedbackProps {
  readonly feedbackItems: ReadonlyArray<LocateFeedbackItem>;
}

/**
 * SVG overlay showing feedback lines from click positions to correct targets.
 * Each feedback item fades in immediately and fades out after ~2s.
 * Renders inside the SVG viewBox coordinate space.
 */
export function LocateFeedback({ feedbackItems }: LocateFeedbackProps) {
  return (
    <AnimatePresence>
      {feedbackItems.map((item) => (
        <FeedbackLine key={item.id} item={item} />
      ))}
    </AnimatePresence>
  );
}

interface FeedbackLineProps {
  readonly item: LocateFeedbackItem;
}

function FeedbackLine({ item }: FeedbackLineProps) {
  const color = scoreColor(item.score);
  const midX = (item.clickPosition.x + item.targetPosition.x) / 2;
  const midY = (item.clickPosition.y + item.targetPosition.y) / 2;

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Line from click to target */}
      <line
        x1={item.clickPosition.x}
        y1={item.clickPosition.y}
        x2={item.targetPosition.x}
        y2={item.targetPosition.y}
        stroke={color}
        strokeWidth={0.15}
        strokeDasharray="0.3 0.2"
        opacity={0.7}
      />

      {/* Click position marker */}
      <circle
        cx={item.clickPosition.x}
        cy={item.clickPosition.y}
        r={0.25}
        fill={color}
        fillOpacity={0.6}
        stroke={color}
        strokeWidth={0.08}
      />

      {/* Target position marker (pulsing ring) */}
      <motion.circle
        cx={item.targetPosition.x}
        cy={item.targetPosition.y}
        r={0.4}
        fill="none"
        stroke={color}
        strokeWidth={0.1}
        initial={{ r: 0.2, opacity: 1 }}
        animate={{ r: 0.6, opacity: 0 }}
        transition={{ duration: 1, repeat: 1 }}
      />

      {/* Distance label */}
      <text
        x={midX}
        y={midY - 0.5}
        textAnchor="middle"
        fill={color}
        fontSize={0.6}
        fontWeight="bold"
        style={{ pointerEvents: 'none' }}
      >
        {formatDistance(item.distanceKm)}
      </text>
    </motion.g>
  );
}
