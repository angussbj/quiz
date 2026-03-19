import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { useFreeRecallSession } from './useFreeRecallSession';
import styles from './FreeRecallMode.module.css';

/**
 * Free recall (unordered) quiz mode.
 *
 * Text input where users type answers in any order. Matches are detected
 * automatically as the user types. On match: input clears, element is marked
 * correct, progress updates. On give up: remaining answers are revealed.
 * Renders the visualization above the controls.
 */
export function FreeRecallMode({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  initialViewBox,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
}: QuizModeProps) {
  const { session, elementToggles, handleTextAnswer, handleGiveUp } = useFreeRecallSession({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
    toggleDefinitions,
    toggleValues,
  });

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCorrectCount = useRef(session.correctElementIds.length);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const hasReportedFinish = useRef(false);

  useEffect(() => {
    if (session.status === 'finished' && !hasReportedFinish.current) {
      hasReportedFinish.current = true;
      onFinishRef.current(session.score);
    }
  }, [session.status, session.score]);

  useEffect(() => {
    if (forceGiveUp && session.status !== 'finished') {
      handleGiveUp();
    }
  }, [forceGiveUp, session.status, handleGiveUp]);

  // Detect when a new correct answer is registered and clear input
  useEffect(() => {
    if (session.correctElementIds.length > prevCorrectCount.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevCorrectCount.current = session.correctElementIds.length;
  }, [session.correctElementIds.length]);

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(session.elementStates) : session.elementStates,
    [reviewing, session.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);
    handleTextAnswer(text);
  }, [handleTextAnswer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setInputText('');
    }
  }, []);

  const isFinished = session.status === 'finished';
  const correctCount = session.correctElementIds.length;
  const totalCount = correctCount + session.remainingElementIds.length;
  const percentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
        />
      </div>

      <div className={styles.controlsArea}>
        {!reviewing ? (
          <div className={styles.controls}>
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
                  onClick={handleGiveUp}
                  type="button"
                >
                  Give up
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {session.lastMatchedAnswer && (
                <motion.div
                  key={session.lastMatchedElementId}
                  className={styles.lastAnswer}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  ✓ {session.lastMatchedAnswer}
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
        ) : (
          reviewResult && <InlineResults result={reviewResult} />
        )}
      </div>
    </div>
  );
}
