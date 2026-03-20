import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { usePromptedRecallQuiz } from './usePromptedRecallQuiz';
import styles from './PromptedRecallMode.module.css';

/**
 * Prompted recall mode: an element is highlighted on the visualization
 * and the user types its name. Auto-matches as the user types.
 * On Enter with wrong text, flashes incorrect briefly.
 */
export function PromptedRecallMode({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues = {},
  Renderer,
  backgroundPaths,
  clustering,
  initialCameraPosition,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
}: QuizModeProps) {
  const quiz = usePromptedRecallQuiz({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
  });

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPromptIndex = useRef(quiz.promptIndex);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const hasCalledFinish = useRef(false);

  useEffect(() => {
    if (forceGiveUp && !quiz.isFinished) {
      quiz.handleGiveUp();
    }
  }, [forceGiveUp, quiz.isFinished, quiz.handleGiveUp]); // eslint-disable-line react-hooks/exhaustive-deps -- quiz property access is intentional

  useEffect(() => {
    if (quiz.isFinished && !hasCalledFinish.current) {
      hasCalledFinish.current = true;
      onFinishRef.current(quiz.score);
    }
     
  }, [quiz.isFinished, quiz.score]);

  useEffect(() => {
    if (quiz.promptIndex > prevPromptIndex.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevPromptIndex.current = quiz.promptIndex;
  }, [quiz.promptIndex]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);
    quiz.handleTextInput(text);
  }, [quiz.handleTextInput]); // eslint-disable-line react-hooks/exhaustive-deps -- quiz property access is intentional

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      quiz.handleSubmit(inputText);
    } else if (event.key === 'Escape') {
      setInputText('');
      quiz.handleTextInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quiz property access is intentional
  }, [quiz.handleSubmit, quiz.handleTextInput, inputText]);

  const elementToggles = useMemo(() => {
    const elementQuizStates: Record<string, ElementQuizState> = {};
    for (const el of elements) {
      elementQuizStates[el.id] = {
        isAnswered: quiz.answeredElementIds.has(el.id),
        wrongAttempts: quiz.wrongAttemptsPerElement[el.id] ?? 0,
      };
    }
    return resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates);
  }, [elements, quiz.answeredElementIds, quiz.wrongAttemptsPerElement, toggleDefinitions, toggleValues]);

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(quiz.elementStates) : quiz.elementStates,
    [reviewing, quiz.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  const progressPercent = quiz.totalPrompts > 0
    ? (quiz.correctCount + quiz.skippedCount) / quiz.totalPrompts * 100
    : 0;

  const inputClassName = quiz.flashIncorrect
    ? `${styles.answerInput} ${styles.answerInputIncorrect}`
    : styles.answerInput;

  return (
    <div className={styles.container}>
      <div className={styles.visualizationArea}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          initialCameraPosition={initialCameraPosition}
        />
      </div>

      <div className={styles.controlsArea}>
        {!reviewing ? (
          <>
            <div className={styles.progressRow}>
              <span className={styles.progressText}>
                {quiz.correctCount}/{quiz.totalPrompts}
              </span>
              <div className={styles.progressBarTrack}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className={styles.progressText}>
                {Math.round(progressPercent)}%
              </span>
            </div>

            {!quiz.isFinished && (
              <div className={styles.inputRow}>
                <input
                  ref={inputRef}
                  className={inputClassName}
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type the name..."
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  className={styles.skipButton}
                  onClick={() => quiz.handleSkip()}
                  type="button"
                >
                  Skip
                </button>
                <button
                  className={styles.giveUpButton}
                  onClick={() => quiz.handleGiveUp()}
                  type="button"
                >
                  Give up
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={quiz.lastMatchedElementId ?? 'empty'}
                className={styles.lastAnswer}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: quiz.lastMatchedAnswer ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                aria-hidden={!quiz.lastMatchedAnswer}
              >
                {quiz.lastMatchedAnswer ? `✓ ${quiz.lastMatchedAnswer}` : '\u00a0'}
              </motion.div>
            </AnimatePresence>

            {quiz.isFinished && (
              <div className={styles.finishedMessage}>
                <span className={styles.scoreHighlight}>{quiz.correctCount}/{quiz.totalPrompts}</span>
                {quiz.correctCount === quiz.totalPrompts ? ' — Perfect!' : ' answered'}
              </div>
            )}
          </>
        ) : (
          reviewResult && <InlineResults result={reviewResult} />
        )}
      </div>
    </div>
  );
}
