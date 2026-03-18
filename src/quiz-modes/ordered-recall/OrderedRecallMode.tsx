import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { useOrderedRecallSession } from './useOrderedRecallSession';
import styles from './OrderedRecallMode.module.css';

export interface OrderedRecallModeProps extends QuizModeProps {
  readonly toggleValues?: Readonly<Record<string, boolean>>;
  readonly onFinish?: (score: ScoreResult) => void;
  readonly forceGiveUp?: boolean;
  readonly reviewing?: boolean;
  readonly renderVisualization: (props: {
    readonly elementStates: Readonly<Record<string, ElementVisualState>>;
    readonly onElementClick?: (elementId: string) => void;
    readonly toggles: Readonly<Record<string, boolean>>;
    readonly elementToggles: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  }) => React.ReactNode;
}

/**
 * Ordered recall mode: elements must be named in their original data order.
 * The current element is highlighted on the visualization.
 * Shows "Element N of M" as the prompt.
 */
export function OrderedRecallMode({
  elements,
  dataRows,
  columnMappings,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  toggleDefinitions,
  toggleValues = {},
  renderVisualization,
}: OrderedRecallModeProps) {
  const quiz = useOrderedRecallSession({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
  });

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevPromptIndex = useRef(quiz.promptIndex);

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
      onFinishRef.current?.(quiz.score);
    }
  }, [quiz.isFinished, quiz.score]);

  useEffect(() => {
    if (quiz.promptIndex > prevPromptIndex.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevPromptIndex.current = quiz.promptIndex;
  }, [quiz.promptIndex]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);
    quiz.handleTextInput(text);
  }, [quiz.handleTextInput]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      quiz.handleSubmit(inputText);
    } else if (event.key === 'Escape') {
      setInputText('');
      quiz.handleTextInput('');
    }
  }, [quiz.handleSubmit, quiz.handleTextInput, inputText]);

  const elementToggles = useMemo(() => {
    const elementQuizStates: Record<string, ElementQuizState> = {};
    for (const el of elements) {
      elementQuizStates[el.id] = {
        isAnswered: quiz.answeredElementIds.has(el.id),
        wrongAttempts: quiz.wrongAttemptsPerElement[el.id] ?? 0,
      };
    }
    return resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates);
  }, [elements, quiz.answeredElementIds, quiz.wrongAttemptsPerElement, toggleDefinitions, toggleValues]);

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

  const progressPercent = quiz.totalPrompts > 0
    ? (quiz.correctCount + quiz.skippedCount) / quiz.totalPrompts * 100
    : 0;

  const inputClassName = quiz.flashIncorrect
    ? `${styles.answerInput} ${styles.answerInputIncorrect}`
    : styles.answerInput;

  return (
    <div className={styles.container}>
      {!reviewing && (
        <div className={styles.progressBar}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      )}

      {!quiz.isFinished && !reviewing && (
        <div className={styles.promptBar}>
          <span className={styles.promptLabel}>
            {quiz.promptIndex + 1} of {quiz.totalPrompts}
          </span>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={inputClassName}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type the name..."
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div className={styles.controls}>
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
      )}

      {quiz.isFinished && !reviewing && (
        <div className={styles.promptBar}>
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
        </div>
      )}

      <div className={styles.visualizationArea}>
        {renderVisualization({
          elementStates: reviewElementStates,
          toggles: toggleValues,
          elementToggles: reviewElementToggles,
        })}
      </div>
    </div>
  );
}
