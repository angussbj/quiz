import { motion } from 'framer-motion';
import type { ElementCluster } from './VisualizationRendererProps';
import styles from './ClusterBadge.module.css';

interface ClusterBadgeProps {
  readonly cluster: ElementCluster;
  readonly matchedCount: number;
  readonly scale: number;
  readonly basePixelsPerViewBoxUnit: number;
  readonly onClick?: (cluster: ElementCluster) => void;
}

/** Radius of the badge circle in screen pixels (constant regardless of zoom). */
const BADGE_SCREEN_RADIUS = 18;

/**
 * Badge rendered at a cluster's centroid showing "matched/total".
 *
 * Uses an inverse-scale transform so the badge stays the same screen size
 * regardless of the current zoom level. Animates in with Framer Motion.
 */
export function ClusterBadge({
  cluster,
  matchedCount,
  scale,
  basePixelsPerViewBoxUnit,
  onClick,
}: ClusterBadgeProps) {
  const { x, y } = cluster.center;

  // Convert the desired screen-pixel radius to viewBox units so the badge
  // appears the same size at every zoom level.
  const viewBoxRadius = BADGE_SCREEN_RADIUS / (scale * basePixelsPerViewBoxUnit);

  const label = `${matchedCount}/${cluster.count}`;

  return (
    <motion.g
      className={styles.badge}
      onClick={() => onClick?.(cluster)}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.2 }}
      style={{ originX: `${x}px`, originY: `${y}px` }}
    >
      <circle
        className={styles.background}
        cx={x}
        cy={y}
        r={viewBoxRadius}
      />
      <text
        className={styles.count}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={viewBoxRadius * 0.9}
      >
        {label}
      </text>
    </motion.g>
  );
}
