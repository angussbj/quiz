import { motion, AnimatePresence } from 'framer-motion';
import type { LocateFeedbackItem } from './LocateFeedbackItem';
import { STATUS_COLORS } from '@/visualizations/elementStateColors';
import { formatDistance } from './formatDistance';

function feedbackColor(item: LocateFeedbackItem): string {
  if (item.elementState === 'hidden') return STATUS_COLORS['default'].main;
  return STATUS_COLORS[item.elementState].main;
}

interface DistanceFeedbackLineProps {
  readonly feedbackItems: ReadonlyArray<LocateFeedbackItem>;
}

/**
 * SVG overlay showing feedback lines from click positions to correct targets.
 * Each feedback item fades in immediately and fades out after ~2s.
 * Renders inside the SVG viewBox coordinate space.
 */
export function DistanceFeedbackLine({ feedbackItems }: DistanceFeedbackLineProps) {
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

/** Animation parameters that vary by guess quality. */
function feedbackIntensity(score: number) {
  if (score > 0.8) {
    // Close guess — energetic animation
    return { ringRadius: 0.8, ringRepeats: 2, markerScale: 1.3, lineOpacity: 0.9 };
  }
  if (score >= 0.3) {
    // Medium guess — standard animation
    return { ringRadius: 0.6, ringRepeats: 1, markerScale: 1.0, lineOpacity: 0.7 };
  }
  // Far guess — subtle/muted animation
  return { ringRadius: 0.4, ringRepeats: 0, markerScale: 0.8, lineOpacity: 0.4 };
}

function FeedbackLine({ item }: FeedbackLineProps) {
  const color = feedbackColor(item);
  const midX = (item.clickPosition.x + item.targetPosition.x) / 2;
  const midY = (item.clickPosition.y + item.targetPosition.y) / 2;
  const intensity = feedbackIntensity(item.score);

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
        opacity={intensity.lineOpacity}
      />

      {/* Click position marker */}
      <motion.circle
        cx={item.clickPosition.x}
        cy={item.clickPosition.y}
        r={0.25}
        fill={color}
        fillOpacity={0.6}
        stroke={color}
        strokeWidth={0.08}
        initial={{ scale: 0.5 }}
        animate={{ scale: intensity.markerScale }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
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
        animate={{ r: intensity.ringRadius, opacity: 0 }}
        transition={{ duration: 1, repeat: intensity.ringRepeats }}
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
