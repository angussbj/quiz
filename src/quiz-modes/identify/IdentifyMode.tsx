import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { InlineResults } from '../InlineResults';
import { QuizPromptBar } from '../QuizPromptBar';
import { useIdentifyQuiz } from './useIdentifyQuiz';
import { buildPromptFields } from '../buildPromptFields';
import styles from './IdentifyMode.module.css';

/**
 * Identify mode: "Click on X" — user clicks elements in the visualization.
 * Manages its own quiz state. Renders the visualization with a prompt bar above.
 */
export function IdentifyMode({
  elements,
  dataRows,
  toggleDefinitions,
  selectToggleDefinitions = [],
  toggleValues = {},
  selectValues = {},
  Renderer,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  clustering,
  initialCameraPosition,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
}: QuizModeProps) {
  const quiz = useIdentifyQuiz(elements);

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

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(quiz.elementStates) : quiz.elementStates,
    [reviewing, quiz.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  const rowById = useMemo(() => {
    const map = new Map<string, Readonly<Record<string, string>>>();
    for (const row of dataRows) {
      const id = row['id'];
      if (id) map.set(id, row);
    }
    return map;
  }, [dataRows]);

  const currentWrongAttempts = quiz.currentElementId
    ? (quiz.wrongAttemptsPerElement[quiz.currentElementId] ?? 0)
    : 0;

  const promptFields = useMemo(() => {
    if (!quiz.currentElementId) return [];
    const row = rowById.get(quiz.currentElementId);
    if (!row) return [];
    return buildPromptFields(row, toggleDefinitions, toggleValues, selectToggleDefinitions, selectValues, currentWrongAttempts);
  }, [quiz.currentElementId, rowById, toggleDefinitions, toggleValues, selectToggleDefinitions, selectValues, currentWrongAttempts]);

  const putInView = useMemo(
    () => (quiz.autoRevealId ? [quiz.autoRevealId] : undefined),
    [quiz.autoRevealId],
  );

  return (
    <div className={styles.container}>
      <div className={styles.controlsArea}>
        {!reviewing ? (
          <QuizPromptBar
            promptKey={quiz.currentElementId ?? ''}
            prompt={<>Click on <strong>{quiz.currentElementLabel}</strong></>}
            promptSubtitle={quiz.currentElementId ? elements.find((el) => el.id === quiz.currentElementId)?.promptSubtitle : undefined}
            promptFields={promptFields}
            counter={`${quiz.correctCount + quiz.skippedCount}/${quiz.totalPrompts}`}
            progressCurrent={quiz.correctCount + quiz.skippedCount}
            progressTotal={quiz.totalPrompts}
            scoreLabel={`${quiz.correctCount}/${quiz.totalPrompts} correct`}
            onSkip={handleSkip}
            onGiveUp={handleGiveUp}
            isFinished={quiz.isFinished}
            finishedContent={
              <div className={styles.finishedContent}>
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
            }
          />
        ) : (
          reviewResult && <InlineResults result={reviewResult} />
        )}
      </div>

      <div className={styles.visualizationArea}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          onElementClick={reviewing ? undefined : handleElementClick}
          toggles={toggleValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialCameraPosition={initialCameraPosition}
          putInView={putInView}
        />
      </div>
    </div>
  );
}
