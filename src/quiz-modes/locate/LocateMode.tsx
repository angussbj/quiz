import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { QuizModeProps } from '../QuizModeProps';
import type { DistanceFeedbackLine as DistanceFeedbackLineType } from '@/visualizations/VisualizationRendererProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { QuizPromptBar } from '../QuizPromptBar';
import { useLocateQuiz } from './useLocateQuiz';
import { DistanceFeedbackLine } from './DistanceFeedbackLine';
import { useRevealPulse } from '@/visualizations/useRevealPulse';
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
  const { revealingElementIds, triggerReveal } = useRevealPulse();

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
          <QuizPromptBar
            promptKey={quiz.currentTarget?.label ?? ''}
            prompt={<>{promptVerb} <strong>{quiz.currentTarget?.label ?? ''}</strong>{promptSuffix}</>}
            promptSubtitle={quiz.currentTarget?.promptSubtitle}
            counter={quiz.isFinished ? undefined : `${quiz.currentTargetIndex + 1}/${quiz.totalTargets}`}
            progressCurrent={quiz.currentTargetIndex}
            progressTotal={quiz.totalTargets}
            scoreLabel={`${quiz.correctCount}/${quiz.currentTargetIndex} correct`}
            onSkip={handleSkip}
            onGiveUp={handleGiveUp}
            isFinished={quiz.isFinished}
            finishedContent={
              <span className={styles.finishedText}>
                Finished — {quiz.correctCount}/{quiz.totalTargets} correct
              </span>
            }
          />
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
          autoRevealElementIds={revealingElementIds}
        />
      </div>
    </div>
  );
}
