import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizModeProps } from '../QuizModeProps';
import { isFlagGridElement } from '@/visualizations/flag-grid/FlagGridElement';
import { useMultipleChoiceQuiz } from './useMultipleChoiceQuiz';
import styles from './MultipleChoiceMode.module.css';

function renderChoice(element: VisualizationElement): React.ReactNode {
  if (isFlagGridElement(element)) {
    return <img src={element.flagUrl} alt="" />;
  }
  return <span>{element.label}</span>;
}

/**
 * Multiple-choice mode: shows a prompt (target label) and N choices.
 * Does not use a visualization renderer — choices are rendered as cards.
 */
export function MultipleChoiceMode({
  elements,
  onFinish,
  forceGiveUp = false,
  onReconfigure,
}: QuizModeProps) {
  const quiz = useMultipleChoiceQuiz(elements);

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

  const progressPercent = quiz.totalPrompts > 0
    ? (quiz.promptIndex / quiz.totalPrompts) * 100
    : 0;

  const choiceStates = useMemo(() => {
    if (!quiz.currentQuestion) return [];
    return quiz.currentQuestion.choices.map((_, index) => {
      if (index === quiz.flashCorrectIndex) return 'correct' as const;
      if (index === quiz.flashIncorrectIndex) return 'incorrect' as const;
      return 'default' as const;
    });
  }, [quiz.currentQuestion, quiz.flashCorrectIndex, quiz.flashIncorrectIndex]);

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

      {!quiz.isFinished && quiz.currentQuestion && (
        <>
          <div className={styles.promptBar}>
            <span className={styles.promptText}>
              Which flag is <span className={styles.promptLabel}>{quiz.currentQuestion.targetElement.label}</span>?
            </span>
            <span className={styles.progress}>
              {quiz.promptIndex + 1}/{quiz.totalPrompts}
            </span>
            <div className={styles.controls}>
              <button
                className={styles.reconfigureButton}
                onClick={onReconfigure}
                type="button"
              >
                <span aria-hidden="true">‹</span> Reconfigure
              </button>
              <button
                className={styles.skipButton}
                onClick={quiz.handleSkip}
                type="button"
              >
                Skip
              </button>
              <button
                className={styles.giveUpButton}
                onClick={quiz.handleGiveUp}
                type="button"
              >
                Give up
              </button>
            </div>
          </div>

          <div className={styles.choicesGrid}>
            {quiz.currentQuestion.choices.map((choice, index) => (
              <button
                key={choice.id}
                className={`${styles.choiceCard} ${styles[choiceStates[index] ?? 'default']}`}
                onClick={() => quiz.handleChoiceSelect(index)}
                type="button"
              >
                {renderChoice(choice)}
              </button>
            ))}
          </div>
        </>
      )}

      {quiz.isFinished && (
        <div className={styles.finishedOverlay}>
          <motion.span
            className={styles.finishedPercentage}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {quiz.score.percentage}%
          </motion.span>
          <span className={styles.finishedScore}>
            {quiz.correctCount} of {quiz.totalPrompts} correct
          </span>
        </div>
      )}
    </div>
  );
}
