import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import type { ToggleDefinition } from '../ToggleDefinition';
import { resolveElementToggles } from '../resolveElementToggles';
import { useIdentifyQuiz } from './useIdentifyQuiz';
import styles from './IdentifyMode.module.css';

export interface IdentifyModeProps extends QuizModeProps {
  readonly toggleDefinitions?: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues?: Readonly<Record<string, boolean>>;
  readonly renderVisualization: (props: {
    readonly elementStates: Readonly<Record<string, import('@/visualizations/VisualizationElement').ElementVisualState>>;
    readonly onElementClick: (elementId: string) => void;
    readonly targetElementId?: string;
    readonly toggles: Readonly<Record<string, boolean>>;
    readonly elementToggles: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  }) => React.ReactNode;
}

/**
 * Identify mode: "Click on X" — user clicks elements in the visualization.
 * Manages its own quiz state. Calls QuizModeProps callbacks to notify parent.
 */
export function IdentifyMode({
  elements,
  onElementSelect,
  onSkip,
  onGiveUp,
  toggleDefinitions = [],
  toggleValues = {},
  renderVisualization,
}: IdentifyModeProps) {
  const quiz = useIdentifyQuiz(elements);

  const handleElementClick = (elementId: string) => {
    quiz.handleElementClick(elementId);
    onElementSelect(elementId);
  };

  const handleSkip = () => {
    quiz.handleSkip();
    onSkip();
  };

  const handleGiveUp = () => {
    quiz.handleGiveUp();
    onGiveUp();
  };

  const elementToggles = useMemo(() => {
    const elementQuizStates: Record<string, { isAnswered: boolean; wrongAttempts: number }> = {};
    for (const el of elements) {
      elementQuizStates[el.id] = {
        isAnswered: quiz.answeredElementIds.has(el.id),
        wrongAttempts: quiz.wrongAttemptsPerElement[el.id] ?? 0,
      };
    }
    return resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates);
  }, [elements, quiz.answeredElementIds, quiz.wrongAttemptsPerElement, toggleDefinitions, toggleValues]);

  const progressPercent = quiz.totalPrompts > 0
    ? (quiz.correctCount + quiz.skippedCount) / quiz.totalPrompts * 100
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {!quiz.isFinished && (
        <div className={styles.promptBar}>
          <span className={styles.promptText}>
            Click on <span className={styles.promptLabel}>{quiz.currentElementLabel}</span>
          </span>
          <span className={styles.progress}>
            {quiz.correctCount + quiz.skippedCount}/{quiz.totalPrompts}
          </span>
          <div className={styles.controls}>
            <button
              className={styles.skipButton}
              onClick={handleSkip}
              type="button"
            >
              Skip
            </button>
            <button
              className={styles.giveUpButton}
              onClick={handleGiveUp}
              type="button"
            >
              Give up
            </button>
          </div>
        </div>
      )}

      {quiz.isFinished && (
        <div className={styles.promptBar}>
          <div className={styles.finishedOverlay}>
            <AnimatePresence>
              <motion.span
                className={styles.finishedPercentage}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                {quiz.score.percentage}%
              </motion.span>
            </AnimatePresence>
            <span className={styles.finishedScore}>
              {quiz.correctCount} of {quiz.totalPrompts} correct
            </span>
          </div>
        </div>
      )}

      <div className={styles.visualizationArea}>
        {renderVisualization({
          elementStates: quiz.elementStates,
          onElementClick: handleElementClick,
          targetElementId: quiz.currentElementId,
          toggles: toggleValues,
          elementToggles,
        })}
      </div>
    </div>
  );
}
