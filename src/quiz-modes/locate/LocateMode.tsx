import type { ComponentType } from 'react';
import { motion } from 'framer-motion';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import { useLocateQuiz } from './useLocateQuiz';
import { LocateFeedback } from './LocateFeedback';
import { LocateResults } from './LocateResults';
import styles from './LocateMode.module.css';

export interface LocateModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
}

/**
 * Locate mode: user clicks on the map to locate prompted targets.
 * Self-contained — manages its own quiz state internally.
 */
export function LocateMode({
  elements,
  toggles,
  Renderer,
  backgroundPaths,
  clustering,
}: LocateModeProps) {
  const quiz = useLocateQuiz(elements);

  if (quiz.isFinished) {
    return (
      <LocateResults
        correctCount={quiz.correctCount}
        totalTargets={quiz.totalTargets}
        averageDistance={quiz.averageDistance}
        totalScore={quiz.totalScore}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.promptBar}>
        <PromptDisplay
          targetLabel={quiz.currentTarget?.label ?? ''}
          currentIndex={quiz.currentTargetIndex}
          total={quiz.totalTargets}
        />
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
      </div>

      <div className={styles.visualization}>
        <Renderer
          elements={elements}
          elementStates={quiz.elementStates}
          onPositionClick={quiz.handlePositionClick}
          toggles={toggles}
          backgroundPaths={backgroundPaths}
          clustering={clustering}
          svgOverlay={<LocateFeedback feedbackItems={quiz.feedbackItems} />}
        />
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
