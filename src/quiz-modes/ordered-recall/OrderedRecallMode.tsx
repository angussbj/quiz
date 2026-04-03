import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizModeProps } from '../QuizModeProps';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { RecallInputBar } from '../RecallInputBar';
import { useOrderedRecallSession } from './useOrderedRecallSession';
import { sortDataRows } from './sortDataRows';
import { groupByTiedValue } from './groupByTiedValue';
import { useRevealPulse } from '@/visualizations/useRevealPulse';
import { useWindowSize } from '@/utilities/useWindowSize';
import { NARROW_WIDTH } from '@/utilities/breakpoints';
import styles from './OrderedRecallMode.module.css';

function formatPromptLabel(start: number, end: number, total: number): string {
  if (start === end) return `${start} of ${total}`;
  return `${start}\u2013${end} of ${total}`;
}

/**
 * Ordered recall mode: elements must be named in sort order.
 * Supports tie groups — when multiple elements share the same sort value,
 * they are all highlighted simultaneously and can be answered in any order.
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
  const { width } = useWindowSize();
  const isNarrow = width < NARROW_WIDTH;

  const orderByColumn = selectValues?.['orderBy'];

  const sortedDataRows = useMemo(() => {
    if (!orderByColumn) return dataRows;
    const descending = selectValues?.['sortOrder'] === 'descending';
    const missingValues = selectValues?.['missingValues'] ?? 'exclude';
    return sortDataRows(dataRows, orderByColumn, descending, missingValues);
  }, [dataRows, selectValues, orderByColumn]);

  const interactiveIds = useMemo(
    () => new Set(elements.filter((e) => e.interactive !== false).map((e) => e.id)),
    [elements],
  );

  const orderedGroups = useMemo(
    () => groupByTiedValue(sortedDataRows, orderByColumn, interactiveIds),
    [sortedDataRows, orderByColumn, interactiveIds],
  );

  const highlightNext = toggleValues['highlightNext'] !== false;

  const quiz = useOrderedRecallSession({
    elements,
    dataRows: sortedDataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
    normalizeOptions,
    orderedGroups,
    highlightNext,
  });
  const { revealingElementIds, triggerReveal } = useRevealPulse();

  const wrappedHandleSkip = useCallback(() => {
    if (quiz.remainingGroupIds.length > 0) {
      triggerReveal([...quiz.remainingGroupIds], quiz.totalPrompts);
    }
    quiz.handleSkip();
  }, [quiz.remainingGroupIds, quiz.totalPrompts, quiz.handleSkip, triggerReveal]);

  const wrappedHandleGiveUp = useCallback(() => {
    const remainingIds = elements
      .filter((e) => e.interactive !== false && !quiz.answeredElementIds.has(e.id))
      .map((e) => e.id);
    triggerReveal(remainingIds, quiz.totalPrompts);
    quiz.handleGiveUp();
  }, [elements, quiz.answeredElementIds, quiz.totalPrompts, quiz.handleGiveUp, triggerReveal]);

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevRemainingCount = useRef(quiz.remainingGroupIds.length);

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

  // Clear input and refocus when an element is answered or group advances
  useEffect(() => {
    if (quiz.remainingGroupIds.length < prevRemainingCount.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevRemainingCount.current = quiz.remainingGroupIds.length;
  }, [quiz.remainingGroupIds.length]);

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

  // putInView: all remaining group IDs (when highlight is on), with delay after skip
  const [putInViewIds, setPutInViewIds] = useState<ReadonlyArray<string>>(quiz.remainingGroupIds);
  const prevGroupIdsRef = useRef<ReadonlyArray<string>>(quiz.remainingGroupIds);
  const elementStatesRef = useRef(quiz.elementStates);
  elementStatesRef.current = quiz.elementStates;
  const putInViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prevIds = prevGroupIdsRef.current;
    prevGroupIdsRef.current = quiz.remainingGroupIds;

    if (!highlightNext) {
      setPutInViewIds([]);
      return;
    }

    if (putInViewTimerRef.current) {
      clearTimeout(putInViewTimerRef.current);
      putInViewTimerRef.current = null;
    }

    // If previous group was skipped (elements now 'missed'), wait before panning
    const prevWasSkipped = prevIds.length > 0 && prevIds.some((id) => elementStatesRef.current[id] === 'missed');
    if (quiz.remainingGroupIds.length > 0 && prevWasSkipped) {
      const nextIds = [...quiz.remainingGroupIds];
      putInViewTimerRef.current = setTimeout(() => {
        setPutInViewIds(nextIds);
        putInViewTimerRef.current = null;
      }, 500);
    } else {
      setPutInViewIds([...quiz.remainingGroupIds]);
    }

    return () => {
      if (putInViewTimerRef.current) {
        clearTimeout(putInViewTimerRef.current);
        putInViewTimerRef.current = null;
      }
    };
  }, [quiz.remainingGroupIds, highlightNext]);

  const putInView = useMemo(
    () => (putInViewIds.length > 0 ? putInViewIds : undefined),
    [putInViewIds],
  );

  const promptLabel = isNarrow
    ? undefined
    : formatPromptLabel(quiz.promptStart, quiz.promptEnd, quiz.totalPrompts);

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
        promptLabel={promptLabel}
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
