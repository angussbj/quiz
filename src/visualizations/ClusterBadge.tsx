import { motion } from 'framer-motion';
import type { ElementCluster } from './VisualizationRendererProps';
import type { ElementVisualState } from './VisualizationElement';
import { STATUS_COLORS } from './elementStateColors';
import styles from './ClusterBadge.module.css';

interface ClusterBadgeProps {
  readonly cluster: ElementCluster;
  readonly matchedCount: number;
  readonly elementStates?: Readonly<Record<string, ElementVisualState>>;
  readonly scale: number;
  readonly basePixelsPerViewBoxUnit: number;
  readonly onClick?: (cluster: ElementCluster) => void;
}

/** Radius of the badge circle in screen pixels (constant regardless of zoom). */
const BADGE_SCREEN_RADIUS = 18;

/** Stroke width as a fraction of radius — thinner than city dots for a lighter look. */
const STROKE_FRACTION = 0.12;

/** Base character count (e.g. "0/3") for max font size. Font shrinks proportionally. */
const BASE_CHAR_COUNT = 3;


/**
 * Compute the aggregate visual state for a cluster from its elements' states.
 * Priority: highlighted (any) > correct (all) > missed (all) > incorrect (all) > default.
 */
function clusterState(
  elementIds: ReadonlyArray<string>,
  elementStates?: Readonly<Record<string, ElementVisualState>>,
): ElementVisualState {
  if (!elementStates || elementIds.length === 0) return 'default';

  let allCorrect = true;
  let allMissed = true;
  let allIncorrect = true;

  for (const id of elementIds) {
    const state = elementStates[id];
    if (state === 'highlighted') return 'highlighted';
    if (state !== 'correct') allCorrect = false;
    if (state !== 'missed') allMissed = false;
    if (state !== 'incorrect') allIncorrect = false;
  }

  if (allCorrect) return 'correct';
  if (allMissed) return 'missed';
  if (allIncorrect) return 'incorrect';
  return 'default';
}

/**
 * Badge rendered at a cluster's centroid showing "matched/total".
 *
 * Color is derived from the aggregate state of all elements in the cluster,
 * using the same color mapping as city dots.
 */
export function ClusterBadge({
  cluster,
  matchedCount,
  elementStates,
  scale,
  basePixelsPerViewBoxUnit,
  onClick,
}: ClusterBadgeProps) {
  const { x, y } = cluster.center;

  const viewBoxRadius = BADGE_SCREEN_RADIUS / (scale * basePixelsPerViewBoxUnit);

  const label = `${matchedCount}/${cluster.count}`;
  const charCount = label.length;
  const fontScale = BASE_CHAR_COUNT / charCount;
  const fontSize = viewBoxRadius * 0.9 * fontScale;
  const strokeWidth = viewBoxRadius * STROKE_FRACTION;

  const state = clusterState(cluster.elementIds, elementStates);
  const fillColor = state !== 'hidden' ? STATUS_COLORS[state].main : STATUS_COLORS['default'].main;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <motion.g
        className={styles.badge}
        onClick={() => onClick?.(cluster)}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.6 }}
        transition={{ duration: 0.2 }}
        style={{ originX: 0, originY: 0 }}
      >
        <circle
          cx={0}
          cy={0}
          r={viewBoxRadius}
          fill={fillColor}
          stroke="var(--color-bg-primary)"
          strokeWidth={strokeWidth}
        />
        <text
          className={styles.count}
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
        >
          {label}
        </text>
      </motion.g>
    </g>
  );
}
