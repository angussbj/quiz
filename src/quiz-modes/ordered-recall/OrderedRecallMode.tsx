import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { RecallInputBar } from '../RecallInputBar';
import { useOrderedRecallSession } from './useOrderedRecallSession';
import { useRevealPulse } from '@/visualizations/useRevealPulse';
import styles from './OrderedRecallMode.module.css';

/**
 * Ordered recall mode: elements must be named in their original data order.
 * The current element is highlighted on the visualization.
 * Shows "Element N of M" as the prompt.
 */
export function OrderedRecallMode({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues = {},
  selectValues,
  Renderer,
  backgroundPaths,
  lakePaths,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  reviewResult,
  normalizeOptions,
  onReconfigure,
}: QuizModeProps) {
  const quiz = useOrderedRecallSession({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
    normalizeOptions,
  });
  const { revealingElementIds, triggerReveal } = useRevealPulse();

  const wrappedHandleSkip = useCallback(() => {
    if (quiz.currentElementId) {
      triggerReveal([quiz.currentElementId], quiz.totalPrompts);
    }
    quiz.handleSkip();
  }, [quiz.currentElementId, quiz.totalPrompts, quiz.handleSkip, triggerReveal]);

  const wrappedHandleGiveUp = useCallback(() => {
    const remainingIds = elements
      .filter((e) => e.interactive !== false && !quiz.answeredElementIds.has(e.id))
      .map((e) => e.id);
    triggerReveal(remainingIds, quiz.totalPrompts);
    quiz.handleGiveUp();
  }, [elements, quiz.answeredElementIds, quiz.totalPrompts, quiz.handleGiveUp, triggerReveal]);

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
  }, [forceGiveUp, quiz.isFinished, quiz.handleGiveUp]); // eslint-disable-line react-hooks/exhaustive-deps -- quiz property access is intentional

  useEffect(() => {
    if (quiz.isFinished && !hasCalledFinish.current) {
      hasCalledFinish.current = true;
      onFinishRef.current(quiz.score);
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
  }, [quiz.handleTextInput]); // eslint-disable-line react-hooks/exhaustive-deps -- quiz property access is intentional

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      quiz.handleSubmit(inputText);
    } else if (event.key === 'Escape') {
      setInputText('');
      quiz.handleTextInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- quiz property access is intentional
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

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(quiz.elementStates) : quiz.elementStates,
    [reviewing, quiz.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  const [putInViewId, setPutInViewId] = useState<string | undefined>(quiz.currentElementId);
  const prevCurrentIdRef = useRef<string | undefined>(quiz.currentElementId);
  const elementStatesRef = useRef(quiz.elementStates);
  elementStatesRef.current = quiz.elementStates;
  const putInViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevId = prevCurrentIdRef.current;
    prevCurrentIdRef.current = quiz.currentElementId;

    if (putInViewTimerRef.current) {
      clearTimeout(putInViewTimerRef.current);
      putInViewTimerRef.current = null;
    }

    // If previous element was skipped (now 'missed'), wait ~500ms before panning to next
    if (quiz.currentElementId && prevId && elementStatesRef.current[prevId] === 'missed') {
      const nextId = quiz.currentElementId;
      putInViewTimerRef.current = setTimeout(() => {
        setPutInViewId(nextId);
        putInViewTimerRef.current = null;
      }, 500);
    } else {
      setPutInViewId(quiz.currentElementId);
    }

    return () => {
      if (putInViewTimerRef.current) {
        clearTimeout(putInViewTimerRef.current);
        putInViewTimerRef.current = null;
      }
    };
  }, [quiz.currentElementId]);

  const putInView = useMemo(
    () => (putInViewId ? [putInViewId] : undefined),
    [putInViewId],
  );

  return (
    <div className={styles.container}>
      <div className={styles.visualizationArea} onMouseDown={(e) => e.preventDefault()}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          toggles={toggleValues}
          selectValues={selectValues}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          clustering={clustering}
          putInView={putInView}
          autoRevealElementIds={revealingElementIds}
        />
      </div>

      <RecallInputBar
        correctCount={quiz.correctCount}
        totalCount={quiz.totalPrompts}
        promptLabel={`${quiz.promptIndex + 1} of ${quiz.totalPrompts}`}
        inputValue={inputText}
        inputRef={inputRef}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type the name..."
        flashIncorrect={quiz.flashIncorrect}
        onSkip={wrappedHandleSkip}
        onGiveUp={wrappedHandleGiveUp}
        onReconfigure={onReconfigure}
        lastMatchedElementId={quiz.lastMatchedElementId}
        lastMatchedAnswer={quiz.lastMatchedAnswer}
        isFinished={quiz.isFinished}
        reviewing={reviewing}
        reviewResult={reviewResult}
      />
    </div>
  );
}
