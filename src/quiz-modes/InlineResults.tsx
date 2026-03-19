import { motion } from 'framer-motion';
import type { ReviewResult } from './QuizModeProps';
import { formatTime } from './Timer';
import styles from './InlineResults.module.css';

interface InlineResultsProps {
  readonly result: ReviewResult;
}

export function InlineResults({ result }: InlineResultsProps) {
  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <span className={styles.score}>
        {result.correct}/{result.total} ({result.percentage}%)
      </span>
      <span className={styles.time}>{formatTime(result.elapsedSeconds)}</span>
      <button className={styles.retryButton} onClick={result.onRetry}>
        Try again
      </button>
    </motion.div>
  );
}
