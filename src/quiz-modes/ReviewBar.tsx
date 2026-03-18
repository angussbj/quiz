import { motion } from 'framer-motion';
import { formatTime } from './Timer';
import styles from './ReviewBar.module.css';

export interface ReviewBarProps {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
  readonly elapsedSeconds: number;
  readonly onRetry: () => void;
}

export function ReviewBar({
  correct,
  total,
  percentage,
  elapsedSeconds,
  onRetry,
}: ReviewBarProps) {
  return (
    <motion.div
      className={styles.bar}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <span className={styles.score}>
        {correct}/{total} ({percentage}%)
      </span>
      <span className={styles.time}>{formatTime(elapsedSeconds)}</span>
      <button className={styles.retryButton} onClick={onRetry}>
        Try again
      </button>
    </motion.div>
  );
}
