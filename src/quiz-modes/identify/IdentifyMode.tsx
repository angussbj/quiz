import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { useIdentifyQuiz } from './useIdentifyQuiz';
import { IdentifyPromptFields, type PromptField } from './IdentifyPromptFields';
import styles from './IdentifyMode.module.css';

/**
 * Identify mode: "Click on X" — user clicks elements in the visualization.
 * Manages its own quiz state. Renders the visualization with a prompt bar above.
 */
export function IdentifyMode({
  elements,
  dataRows,
  toggleDefinitions,
  toggleValues = {},
  Renderer,
  backgroundPaths,
  backgroundLabels,
  clustering,
  initialViewBox,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
}: QuizModeProps) {
  const quiz = useIdentifyQuiz(elements);

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
      onFinishRef.current(quiz.score);
    }
  }, [quiz.isFinished, quiz.score]);

  const handleElementClick = (elementId: string) => {
    quiz.handleElementClick(elementId);
  };

  const handleSkip = () => {
    quiz.handleSkip();
  };

  const handleGiveUp = () => {
    quiz.handleGiveUp();
  };

  const elementToggles = useMemo(() => {
    const elementQuizStates: Record<string, ElementQuizState> = {};
    for (const el of elements) {
      elementQuizStates[el.id] = {
        isAnswered: quiz.answeredElementIds.has(el.id),
        wrongAttempts: quiz.wrongAttemptsPerElement[el.id] ?? 0,
      };
    }
    const baseToggles = resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates);

    // Force on-reveal toggles to true for elements in 'incorrect' state,
    // so labels show during wrong-click flash and for skipped/exhausted elements.
    const onRevealKeys = toggleDefinitions
      .filter((t) => t.hiddenBehavior === 'on-reveal' && !toggleValues[t.key])
      .map((t) => t.key);

    if (onRevealKeys.length === 0) return baseToggles;

    const overrides: Record<string, Record<string, boolean>> = {};
    for (const [id, toggles] of Object.entries(baseToggles)) {
      overrides[id] = { ...toggles };
    }
    for (const el of elements) {
      const state = quiz.elementStates[el.id];
      if (state === 'incorrect') {
        if (!overrides[el.id]) overrides[el.id] = {};
        for (const key of onRevealKeys) {
          overrides[el.id][key] = true;
        }
      }
    }
    return overrides;
  }, [elements, quiz.answeredElementIds, quiz.wrongAttemptsPerElement, quiz.elementStates, toggleDefinitions, toggleValues]);

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

  const rowById = useMemo(() => {
    const map = new Map<string, Readonly<Record<string, string>>>();
    for (const row of dataRows) {
      const id = row['id'];
      if (id) map.set(id, row);
    }
    return map;
  }, [dataRows]);

  const promptFields = useMemo((): ReadonlyArray<PromptField> => {
    if (!quiz.currentElementId) return [];
    const row = rowById.get(quiz.currentElementId);
    if (!row) return [];

    const fields: PromptField[] = [];
    for (const toggleDef of toggleDefinitions) {
      if (!toggleDef.promptField) continue;
      if (!toggleValues[toggleDef.key]) continue;
      const value = row[toggleDef.promptField.column];
      if (value) {
        fields.push({ type: toggleDef.promptField.type, value });
      }
    }
    return fields;
  }, [quiz.currentElementId, rowById, toggleDefinitions, toggleValues]);

  const progressPercent = quiz.totalPrompts > 0
    ? (quiz.correctCount + quiz.skippedCount) / quiz.totalPrompts * 100
    : 0;

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
          {promptFields.length > 0 && <IdentifyPromptFields fields={promptFields} />}
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
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onElementClick={reviewing ? undefined : handleElementClick}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialViewBox={initialViewBox}
        />
      </div>
    </div>
  );
}
