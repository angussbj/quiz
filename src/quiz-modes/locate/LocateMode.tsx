import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { useLocateQuiz } from './useLocateQuiz';
import { LocateFeedback } from './LocateFeedback';
import styles from './LocateMode.module.css';

/**
 * Locate mode: user clicks on the map to locate prompted targets.
 * Self-contained — manages its own quiz state internally.
 */
export function LocateMode({
  elements,
  toggleValues,
  toggleDefinitions = [],
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
  initialCameraPosition,
}: QuizModeProps) {
  const quiz = useLocateQuiz(elements);

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
                <PromptDisplay
                  targetLabel={quiz.currentTarget?.label ?? ''}
                  currentIndex={quiz.currentTargetIndex}
                  total={quiz.totalTargets}
                />
              )}
              {!quiz.isFinished && (
                <div className={styles.controls}>
                  <button
                    className={styles.skipButton}
                    onClick={quiz.handleSkip}
                  >
                    Skip
                  </button>
                  <button
                    className={styles.giveUpButton}
                    onClick={quiz.handleGiveUp}
                  >
                    Give up
                  </button>
                </div>
              )}
            </div>

            <div className={styles.scoreBar}>
              <span className={styles.scoreLabel}>
                {quiz.correctCount}/{quiz.currentTargetIndex} correct
              </span>
              <ProgressBar
                current={quiz.currentTargetIndex}
                total={quiz.totalTargets}
              />
            </div>
          </>
        ) : (
          reviewResult && <InlineResults result={reviewResult} />
        )}
      </div>

      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onPositionClick={reviewing || quiz.isFinished ? undefined : quiz.handlePositionClick}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialCameraPosition={initialCameraPosition}
          svgOverlay={<LocateFeedback feedbackItems={quiz.feedbackItems} />}
        />
      </div>
    </div>
  );
}

interface PromptDisplayProps {
  readonly targetLabel: string;
  readonly currentIndex: number;
  readonly total: number;
}

function PromptDisplay({ targetLabel, currentIndex, total }: PromptDisplayProps) {
  return (
    <div className={styles.prompt}>
      <span className={styles.promptCounter}>{currentIndex + 1}/{total}</span>
      <motion.span
        key={targetLabel}
        className={styles.promptText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        Click where <strong>{targetLabel}</strong> is
      </motion.span>
    </div>
  );
}

interface FinishedPromptProps {
  readonly correctCount: number;
  readonly totalTargets: number;
}

function FinishedPrompt({ correctCount, totalTargets }: FinishedPromptProps) {
  return (
    <div className={styles.prompt}>
      <span className={styles.promptText}>
        Finished — {correctCount}/{totalTargets} correct
      </span>
    </div>
  );
}

interface ProgressBarProps {
  readonly current: number;
  readonly total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className={styles.progressTrack}>
      <motion.div
        className={styles.progressFill}
        initial={{ width: '0%' }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}
