import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import type { DatePrecision } from '@/scoring/calculateTimelineLocateScore';
import { formatTimestamp } from '@/visualizations/timeline/TimelineTimestamp';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { OverflowMenu } from '../OverflowMenu';
import { useTimelineLocateQuiz } from './useTimelineLocateQuiz';
import { useRevealPulse } from '@/visualizations/useRevealPulse';
import { useWindowSize } from '@/utilities/useWindowSize';
import { NARROW_WIDTH } from '@/utilities/breakpoints';
import styles from './TimelineLocateMode.module.css';

export function TimelineLocateMode({
  elements,
  toggleValues,
  toggleDefinitions = [],
  selectValues,
  selectValueLabels,
  Renderer,
  backgroundPaths,
  lakePaths,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
  timeScale,
  onReconfigure,
}: QuizModeProps) {
  const { width } = useWindowSize();
  const isNarrow = width < NARROW_WIDTH;
  const rawPrecision = selectValues?.['datePrecision'];
  const datePrecision: DatePrecision =
    rawPrecision === 'year' || rawPrecision === 'month' || rawPrecision === 'day'
      ? rawPrecision
      : 'month';

  const quiz = useTimelineLocateQuiz(elements, datePrecision, timeScale);
  const { revealingElementIds, triggerReveal } = useRevealPulse();
  const [dateInput, setDateInput] = useState('');
  const [inputError, setInputError] = useState(false);

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

  const handleSkip = useCallback(() => {
    if (quiz.currentTarget) {
      triggerReveal([quiz.currentTarget.id], quiz.totalTargets);
    }
    quiz.handleSkip();
  }, [quiz.currentTarget, quiz.totalTargets, quiz.handleSkip, triggerReveal]);

  const handleGiveUp = useCallback(() => {
    const remainingIds: Array<string> = [];
    for (const el of elements) {
      if (el.interactive && quiz.elementStates[el.id] === 'hidden') {
        remainingIds.push(el.id);
      }
    }
    triggerReveal(remainingIds, quiz.totalTargets);
    quiz.handleGiveUp();
  }, [elements, quiz.elementStates, quiz.totalTargets, quiz.handleGiveUp, triggerReveal]);

  const precisionLabel = datePrecision === 'year' ? 'year' : datePrecision === 'month' ? 'month & year' : 'date';
  const placeholderExamples: Readonly<Record<DatePrecision, string>> = {
    year: 'e.g. 1944',
    month: 'e.g. Jun 1944',
    day: 'e.g. 6 Jun 1944',
  };

  return (
    <div className={styles.container}>
      <div className={styles.controlsArea}>
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
                isNarrow ? (
                  <div className={styles.controls}>
                    <button className={styles.controlButton} onClick={handleSkip} type="button">
                      Skip
                    </button>
                    <OverflowMenu items={[
                      { label: 'Reconfigure', onClick: onReconfigure },
                      { label: 'Give up', onClick: handleGiveUp, variant: 'danger' },
                    ]} triggerClassName={styles.controlButton} />
                  </div>
                ) : (
                  <div className={styles.controls}>
                    <button className={styles.reconfigureButton} onClick={onReconfigure}>
                      <span aria-hidden="true">‹</span> Reconfigure
                    </button>
                    <button className={styles.controlButton} onClick={handleSkip}>
                      Skip
                    </button>
                    <button className={styles.controlButton} onClick={handleGiveUp}>
                      Give up
                    </button>
                  </div>
                )
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
      </div>

      <div className={styles.visualization} onMouseDown={(e) => e.preventDefault()}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onPositionClick={reviewing || quiz.isFinished ? undefined : quiz.handlePositionClick}
          toggles={toggleValues}
          selectValues={selectValues}
          selectValueLabels={selectValueLabels}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          clustering={clustering}
          timeScale={timeScale}
          autoRevealElementIds={revealingElementIds}
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

