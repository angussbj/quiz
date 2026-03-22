import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import type { DistanceFeedbackLine as DistanceFeedbackLineType } from '@/visualizations/VisualizationRendererProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { useLocateQuiz } from './useLocateQuiz';
import { DistanceFeedbackLine } from './DistanceFeedbackLine';
import styles from './LocateMode.module.css';

/**
 * Locate mode: user clicks on the map/grid to locate prompted targets.
 * Self-contained — manages its own quiz state internally.
 */
export function LocateMode({
  elements,
  toggleValues,
  toggleDefinitions = [],
  Renderer,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
  initialCameraPosition,
  locateDistanceMode,
  locateThresholds,
  hideUnfocusedElements,
}: QuizModeProps) {
  const quiz = useLocateQuiz(elements, { locateDistanceMode, locateThresholds, hideUnfocusedElements });

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

  const isGridMode = locateDistanceMode === 'grid-centroid';
  const promptVerb = isGridMode ? 'Click on' : 'Click where';
  const promptSuffix = isGridMode ? '' : ' is';

  // Grid mode: pass feedback data to the renderer (it handles path computation and drawing).
  // Other modes: render straight-line feedback as SVG overlay on top of elements.
  const feedbackOverlay = !isGridMode
    ? <DistanceFeedbackLine feedbackItems={quiz.feedbackItems} />
    : undefined;
  const gridFeedbackLines: ReadonlyArray<DistanceFeedbackLineType> | undefined = useMemo(() => {
    if (!isGridMode) return undefined;
    return quiz.feedbackItems
      .filter((item) => item.distanceKm > 0)
      .map((item) => ({
        id: item.id,
        from: item.clickPosition,
        to: item.targetPosition,
        elementState: item.elementState,
        label: `${item.distanceKm} away`,
      }));
  }, [isGridMode, quiz.feedbackItems]);

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
                  promptVerb={promptVerb}
                  promptSuffix={promptSuffix}
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
          onElementClick={reviewing || quiz.isFinished ? undefined : quiz.handleElementClick}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialCameraPosition={initialCameraPosition}
          svgOverlay={feedbackOverlay}
          distanceFeedbackLines={gridFeedbackLines}
        />
      </div>
    </div>
  );
}

interface PromptDisplayProps {
  readonly targetLabel: string;
  readonly currentIndex: number;
  readonly total: number;
  readonly promptVerb: string;
  readonly promptSuffix: string;
}

function PromptDisplay({ targetLabel, currentIndex, total, promptVerb, promptSuffix }: PromptDisplayProps) {
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
        {promptVerb} <strong>{targetLabel}</strong>{promptSuffix}
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
