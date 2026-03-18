import { AnimatePresence, motion } from 'framer-motion';
import { formatTime } from './Timer';
import styles from './QuizResults.module.css';

export interface QuizResultsProps {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
  readonly elapsedSeconds: number;
  readonly onRetry: () => void;
  readonly onReview: () => void;
}

const CONFETTI_COUNT = 25;

const CONFETTI_COLORS = [
  'var(--color-accent)',
  'var(--color-correct)',
  'var(--color-accent-hover)',
];

function generateConfettiPieces(): ReadonlyArray<{
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly delay: number;
}> {
  const pieces = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / CONFETTI_COUNT + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 120;
    pieces.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.3,
    });
  }
  return pieces;
}

const confettiPieces = generateConfettiPieces();

export function QuizResults({
  correct,
  total,
  percentage,
  elapsedSeconds,
  onRetry,
  onReview,
}: QuizResultsProps) {
  const isPerfect = percentage === 100;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={styles.card}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <button
            className={styles.closeButton}
            onClick={onReview}
            aria-label="Close results and review answers"
          >
            ×
          </button>

          {isPerfect &&
            confettiPieces.map((piece, index) => (
              <motion.div
                key={index}
                className={styles.confettiPiece}
                aria-hidden="true"
                data-testid="confetti"
                style={{ background: piece.color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: piece.x,
                  y: piece.y,
                  opacity: 0,
                  scale: 0.5,
                }}
                transition={{
                  duration: 1.2,
                  delay: 0.4 + piece.delay,
                  ease: 'easeOut',
                }}
              />
            ))}

          <motion.div
            className={styles.percentage}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.3,
            }}
          >
            {percentage}%
          </motion.div>

          <div className={styles.progressBarTrack}>
            <motion.div
              className={styles.progressBarFill}
              initial={{ width: '0%' }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className={styles.correctCount}>
            {correct} of {total} correct
          </div>

          <div className={styles.elapsedTime}>
            {formatTime(elapsedSeconds)}
          </div>

          <div className={styles.buttonRow}>
            <motion.button
              className={styles.retryButton}
              onClick={onRetry}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try again
            </motion.button>
            <motion.button
              className={styles.reviewButton}
              onClick={onReview}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Review answers
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
