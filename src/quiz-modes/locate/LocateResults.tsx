import { motion } from 'framer-motion';
import { formatDistance } from './formatDistance';
import styles from './LocateMode.module.css';

interface LocateResultsProps {
  readonly correctCount: number;
  readonly totalTargets: number;
  readonly averageDistance: number;
  readonly totalScore: number;
}

export function LocateResults({
  correctCount,
  totalTargets,
  averageDistance,
  totalScore,
}: LocateResultsProps) {
  const percentage = totalTargets > 0 ? Math.round((correctCount / totalTargets) * 100) : 0;
  const averageScore = totalTargets > 0 ? (totalScore / totalTargets) * 100 : 0;

  return (
    <motion.div
      className={styles.resultsContainer}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className={styles.resultsTitle}>Results</h2>

      <div className={styles.resultsGrid}>
        <div className={styles.resultCard}>
          <span className={styles.resultValue}>{correctCount}/{totalTargets}</span>
          <span className={styles.resultLabel}>within 50 km</span>
        </div>

        <div className={styles.resultCard}>
          <span className={styles.resultValue}>{percentage}%</span>
          <span className={styles.resultLabel}>accuracy</span>
        </div>

        <div className={styles.resultCard}>
          <span className={styles.resultValue}>{formatDistance(averageDistance)}</span>
          <span className={styles.resultLabel}>avg distance</span>
        </div>

        <div className={styles.resultCard}>
          <span className={styles.resultValue}>{averageScore.toFixed(0)}%</span>
          <span className={styles.resultLabel}>avg score</span>
        </div>
      </div>
    </motion.div>
  );
}
