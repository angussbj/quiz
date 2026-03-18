import { type ComponentType, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from '../ToggleDefinition';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { useLocateQuiz } from './useLocateQuiz';
import { LocateFeedback } from './LocateFeedback';
import { LocateResults } from './LocateResults';
import styles from './LocateMode.module.css';

const RESULTS_DELAY_MS = 1000;

export interface LocateModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly toggleDefinitions?: ReadonlyArray<ToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly onFinish?: (score: ScoreResult) => void;
  readonly forceGiveUp?: boolean;
  readonly reviewing?: boolean;
}

/**
 * Locate mode: user clicks on the map to locate prompted targets.
 * Self-contained — manages its own quiz state internally.
 */
export function LocateMode({
  elements,
  toggles,
  toggleDefinitions = [],
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
}: LocateModeProps) {
  const quiz = useLocateQuiz(elements);
  const [showResults, setShowResults] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const hasCalledFinish = useRef(false);

  // Force give-up when timer expires
  useEffect(() => {
    if (forceGiveUp && !quiz.isFinished) {
      quiz.handleGiveUp();
    }
  }, [forceGiveUp, quiz.isFinished, quiz.handleGiveUp]);

  useEffect(() => {
    if (quiz.isFinished && !hasCalledFinish.current) {
      hasCalledFinish.current = true;
      onFinishRef.current?.({
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
    return resolveElementToggles(toggleDefinitions, toggles, elementQuizStates);
  }, [elements, quiz.elementStates, toggleDefinitions, toggles]);

  const toggleKeys = useMemo(
    () => toggleDefinitions.map((t) => t.key),
    [toggleDefinitions],
  );

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(quiz.elementStates) : quiz.elementStates,
    [reviewing, quiz.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleKeys) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleKeys],
  );

  // Show results after a short delay when the quiz finishes
  useEffect(() => {
    if (!quiz.isFinished) return;
    const timer = setTimeout(() => setShowResults(true), RESULTS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [quiz.isFinished]);

  const handleCloseResults = useCallback(() => setShowResults(false), []);
  const handleOpenResults = useCallback(() => setShowResults(true), []);

  return (
    <div className={styles.container}>
      {!reviewing && (
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
          <div className={styles.controls}>
            {quiz.isFinished ? (
              <button
                className={styles.skipButton}
                onClick={handleOpenResults}
              >
                Show results
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onPositionClick={reviewing || quiz.isFinished ? undefined : quiz.handlePositionClick}
          toggles={toggles}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          svgOverlay={<LocateFeedback feedbackItems={quiz.feedbackItems} />}
        />

        <AnimatePresence>
          {showResults && !reviewing && (
            <LocateResults
              correctCount={quiz.correctCount}
              totalTargets={quiz.totalTargets}
              averageDistance={quiz.averageDistance}
              totalScore={quiz.totalScore}
              onClose={handleCloseResults}
            />
          )}
        </AnimatePresence>
      </div>

      {!reviewing && (
        <div className={styles.scoreBar}>
          <span className={styles.scoreLabel}>
            {quiz.correctCount}/{quiz.currentTargetIndex} correct
          </span>
          <ProgressBar
            current={quiz.currentTargetIndex}
            total={quiz.totalTargets}
          />
        </div>
      )}
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
