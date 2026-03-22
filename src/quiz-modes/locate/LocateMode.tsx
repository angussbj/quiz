import { useEffect, useMemo, useRef } from 'react';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { QuizPromptBar } from '../QuizPromptBar';
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
  lakePaths,
  backgroundLabels,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
  initialCameraPosition,
  locateDistanceMode,
  hideUnfocusedElements,
}: QuizModeProps) {
  const quiz = useLocateQuiz(elements, { locateDistanceMode, hideUnfocusedElements });

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
          <QuizPromptBar
            promptKey={quiz.currentTarget?.label ?? ''}
            prompt={<>Click where <strong>{quiz.currentTarget?.label ?? ''}</strong> is</>}
            promptSubtitle={quiz.currentTarget?.promptSubtitle}
            counter={quiz.isFinished ? undefined : `${quiz.currentTargetIndex + 1}/${quiz.totalTargets}`}
            progressCurrent={quiz.currentTargetIndex}
            progressTotal={quiz.totalTargets}
            scoreLabel={`${quiz.correctCount}/${quiz.currentTargetIndex} correct`}
            onSkip={quiz.handleSkip}
            onGiveUp={quiz.handleGiveUp}
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
          svgOverlay={<LocateFeedback feedbackItems={quiz.feedbackItems} />}
        />
      </div>
    </div>
  );
}
