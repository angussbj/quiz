import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import type { DatePrecision } from '@/scoring/calculateTimelineLocateScore';
import { formatTimestamp } from '@/visualizations/timeline/TimelineTimestamp';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { useTimelineLocateQuiz } from './useTimelineLocateQuiz';
import styles from './TimelineLocateMode.module.css';

export function TimelineLocateMode({
  elements,
  toggleValues,
  toggleDefinitions = [],
  selectValues,
  Renderer,
  backgroundPaths,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
}: QuizModeProps) {
  const rawPrecision = selectValues?.['datePrecision'];
  const datePrecision: DatePrecision =
    rawPrecision === 'year' || rawPrecision === 'month' || rawPrecision === 'day'
      ? rawPrecision
      : 'month';

  const quiz = useTimelineLocateQuiz(elements, datePrecision);
  const [dateInput, setDateInput] = useState('');
  const [inputError, setInputError] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const hasCalledFinish = useRef(false);

  useEffect(() => {
    if (forceGiveUp && !quiz.isFinished) {
      quiz.handleGiveUp();
    }
  }, [forceGiveUp, quiz.isFinished, quiz.handleGiveUp]);

  useEffect(() => {
    if (quiz.isFinished && !hasCalledFinish.current) {
      hasCalledFinish.current = true;
      onFinishRef.current({
        correct: quiz.correctCount,
        total: quiz.totalTargets,
        percentage: quiz.totalTargets > 0 ? Math.round((quiz.correctCount / quiz.totalTargets) * 100) : 0,
      });
    }
  }, [quiz.isFinished, quiz.correctCount, quiz.totalTargets]);

  const elementToggles = useMemo(() => {
    const elementQuizStates: Record<string, ElementQuizState> = {};
    for (const el of elements) {
      elementQuizStates[el.id] = {
        isAnswered: quiz.elementStates[el.id] !== 'hidden',
        wrongAttempts: 0,
      };
    }
    return resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates);
  }, [elements, quiz.elementStates, toggleDefinitions, toggleValues]);

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(quiz.elementStates) : quiz.elementStates,
    [reviewing, quiz.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  useEffect(() => {
    setDateInput('');
    setInputError(false);
  }, [quiz.currentTargetIndex, quiz.rangePhase]);

  const handleDateSubmit = useCallback(() => {
    if (dateInput.trim() === '') return;
    const accepted = quiz.handleDateInput(dateInput);
    if (accepted) {
      setDateInput('');
      setInputError(false);
    } else {
      setInputError(true);
    }
  }, [dateInput, quiz]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleDateSubmit();
    }
  }, [handleDateSubmit]);

  const precisionLabel = datePrecision === 'year' ? 'year' : datePrecision === 'month' ? 'month & year' : 'date';
  const placeholderExamples: Readonly<Record<DatePrecision, string>> = {
    year: 'e.g. 1944',
    month: 'e.g. Jun 1944',
    day: 'e.g. 6 Jun 1944',
  };

  return (
    <div className={styles.container}>
      {!reviewing ? (
        <>
          <div className={styles.promptBar}>
            {quiz.isFinished ? (
              <FinishedPrompt
                correctCount={quiz.correctCount}
                totalTargets={quiz.totalTargets}
              />
            ) : (
              <div className={styles.promptArea}>
                <PromptDisplay
                  targetLabel={quiz.currentTarget?.label ?? ''}
                  currentIndex={quiz.currentTargetIndex}
                  total={quiz.totalTargets}
                  needsRange={quiz.currentNeedsRange}
                  rangePhase={quiz.rangePhase}
                  pendingStartAnswer={quiz.pendingStartAnswer}
                />
                <div className={styles.inputRow}>
                  <input
                    className={`${styles.dateInput} ${inputError ? styles.dateInputError : ''}`}
                    type="text"
                    value={dateInput}
                    onChange={(e) => {
                      setDateInput(e.target.value);
                      setInputError(false);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={`Type ${precisionLabel} or click timeline (${placeholderExamples[datePrecision]})`}
                  />
                  <button
                    className={styles.submitButton}
                    onClick={handleDateSubmit}
                    disabled={dateInput.trim() === ''}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
            {!quiz.isFinished && (
              <div className={styles.controls}>
                <button className={styles.controlButton} onClick={quiz.handleSkip}>
                  Skip
                </button>
                <button className={styles.controlButton} onClick={quiz.handleGiveUp}>
                  Give up
                </button>
              </div>
            )}
          </div>

          <div className={styles.scoreBar}>
            <span className={styles.scoreLabel}>
              {quiz.correctCount}/{quiz.currentTargetIndex} correct
            </span>
            <div className={styles.progressTrack}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: '0%' }}
                animate={{ width: `${quiz.totalTargets > 0 ? (quiz.currentTargetIndex / quiz.totalTargets) * 100 : 0}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </>
      ) : (
        reviewResult && <InlineResults result={reviewResult} />
      )}

      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onPositionClick={reviewing || quiz.isFinished ? undefined : quiz.handlePositionClick}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
        />
      </div>
    </div>
  );
}

function PromptDisplay({
  targetLabel,
  currentIndex,
  total,
  needsRange,
  rangePhase,
  pendingStartAnswer,
}: {
  readonly targetLabel: string;
  readonly currentIndex: number;
  readonly total: number;
  readonly needsRange: boolean;
  readonly rangePhase: string;
  readonly pendingStartAnswer: import('@/visualizations/timeline/TimelineTimestamp').TimelineTimestamp | undefined;
}) {
  let instruction: string;
  if (needsRange && rangePhase === 'end' && pendingStartAnswer) {
    instruction = `Now enter the end date (start: ${formatTimestamp(pendingStartAnswer)})`;
  } else if (needsRange) {
    instruction = 'Enter the start date';
  } else {
    instruction = 'Place on the timeline';
  }

  return (
    <div className={styles.prompt}>
      <span className={styles.promptCounter}>{currentIndex + 1}/{total}</span>
      <motion.span
        key={`${targetLabel}-${rangePhase}`}
        className={styles.promptText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <strong>{targetLabel}</strong> — {instruction}
      </motion.span>
    </div>
  );
}

function FinishedPrompt({
  correctCount,
  totalTargets,
}: {
  readonly correctCount: number;
  readonly totalTargets: number;
}) {
  return (
    <div className={styles.prompt}>
      <span className={styles.promptText}>
        Finished — {correctCount}/{totalTargets} correct
      </span>
    </div>
  );
}

