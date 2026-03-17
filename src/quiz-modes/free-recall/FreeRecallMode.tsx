import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import styles from './FreeRecallMode.module.css';

/**
 * Free recall (unordered) quiz mode.
 *
 * Text input where users type answers in any order. Matches are detected
 * automatically as the user types. On match: input clears, element is marked
 * correct, progress updates. On give up: remaining answers are revealed.
 */
export function FreeRecallMode({
  session,
  onTextAnswer,
  onGiveUp,
}: QuizModeProps) {
  const [inputText, setInputText] = useState('');
  const [lastCorrectAnswer, setLastCorrectAnswer] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCorrectCount = useRef(session.correctElementIds.length);

  const isFinished = session.status === 'finished';
  const correctCount = session.correctElementIds.length;
  const totalCount = correctCount + session.remainingElementIds.length;
  const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  // Detect when a new correct answer is registered and clear input
  useEffect(() => {
    if (session.correctElementIds.length > prevCorrectCount.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevCorrectCount.current = session.correctElementIds.length;
  }, [session.correctElementIds.length]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);
    onTextAnswer(text);
  }, [onTextAnswer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setInputText('');
    }
  }, []);

  // Track the display label of the last correct answer for feedback
  useEffect(() => {
    if (session.correctElementIds.length > 0) {
      const lastId = session.correctElementIds[session.correctElementIds.length - 1];
      if (lastId !== undefined) {
        setLastCorrectAnswer(lastId);
      }
    }
  }, [session.correctElementIds]);

  return (
    <div className={styles.container}>
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          {correctCount}/{totalCount}
        </span>
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {Math.round(percentage)}%
        </span>
      </div>

      {!isFinished && (
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.answerInput}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type an answer…"
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            className={styles.giveUpButton}
            onClick={onGiveUp}
            type="button"
          >
            Give up
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {lastCorrectAnswer && !isFinished && (
          <motion.div
            key={lastCorrectAnswer}
            className={styles.lastAnswer}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            ✓ {lastCorrectAnswer}
          </motion.div>
        )}
      </AnimatePresence>

      {isFinished && (
        <div className={styles.finishedMessage}>
          <span className={styles.scoreHighlight}>{correctCount}/{totalCount}</span>
          {correctCount === totalCount ? ' — Perfect!' : ' answered'}
        </div>
      )}
    </div>
  );
}
