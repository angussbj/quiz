import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizModeProps } from '../QuizModeProps';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { RecallInputBar } from '../RecallInputBar';
import { useFreeRecallSession } from './useFreeRecallSession';
import { useRevealPulse } from '@/visualizations/useRevealPulse';
import styles from './FreeRecallMode.module.css';

/**
 * Free recall (unordered) quiz mode.
 *
 * Text input where users type answers in any order. Matches are detected
 * automatically as the user types. On match: input clears, element is marked
 * correct, progress updates. On give up: remaining answers are revealed.
 * Renders the visualization above the controls.
 */
export function FreeRecallMode({
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  toggleValues,
  selectValues,
  selectValueLabels,
  selectValueMissingLabels,
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
  normalizeOptions,
  onReconfigure,
}: QuizModeProps) {
  const { session, elementToggles, handleTextAnswer, handleGiveUp: rawHandleGiveUp, ambiguousMessage } = useFreeRecallSession({
    elements,
    dataRows,
    answerColumn: columnMappings['answer'] ?? 'answer',
    toggleDefinitions,
    toggleValues,
    normalizeOptions,
  });
  const { revealingElementIds, triggerReveal } = useRevealPulse();

  const totalInteractive = useMemo(
    () => elements.filter((e) => e.interactive !== false).length,
    [elements],
  );

  const handleGiveUp = useCallback(() => {
    const remainingIds = session.remainingElementIds;
    triggerReveal(remainingIds, totalInteractive);
    rawHandleGiveUp();
  }, [session.remainingElementIds, totalInteractive, rawHandleGiveUp, triggerReveal]);

  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCorrectCount = useRef(session.correctElementIds.length);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const hasReportedFinish = useRef(false);

  useEffect(() => {
    if (session.status === 'finished' && !hasReportedFinish.current) {
      hasReportedFinish.current = true;
      onFinishRef.current(session.score);
    }
  }, [session.status, session.score]);

  useEffect(() => {
    if (forceGiveUp && session.status !== 'finished') {
      handleGiveUp();
    }
  }, [forceGiveUp, session.status, handleGiveUp]);

  // Detect when a new correct answer is registered and clear input
  useEffect(() => {
    if (session.correctElementIds.length > prevCorrectCount.current) {
      setInputText('');
      inputRef.current?.focus();
    }
    prevCorrectCount.current = session.correctElementIds.length;
  }, [session.correctElementIds.length]);

  const reviewElementStates = useMemo(
    () => reviewing ? buildReviewElementStates(session.elementStates) : session.elementStates,
    [reviewing, session.elementStates],
  );

  const reviewElementToggles = useMemo(
    () => reviewing ? buildReviewElementToggles(elementToggles, reviewElementStates, toggleDefinitions) : elementToggles,
    [reviewing, elementToggles, reviewElementStates, toggleDefinitions],
  );

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setInputText(text);
    handleTextAnswer(text);
  }, [handleTextAnswer]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setInputText('');
    }
  }, []);

  const putInView = useMemo(
    () => (session.lastMatchedElementId ? [session.lastMatchedElementId] : undefined),
    [session.lastMatchedElementId],
  );

  const isFinished = session.status === 'finished';
  const correctCount = session.correctElementIds.length;
  const totalCount = correctCount + session.remainingElementIds.length;

  return (
    <div className={styles.container}>
      <div className={styles.visualization} onMouseDown={(e) => e.preventDefault()}>
        <Renderer
          elements={elements}
          elementStates={reviewElementStates}
          toggles={toggleValues}
          selectValues={selectValues}
          selectValueLabels={selectValueLabels}
          selectValueMissingLabels={selectValueMissingLabels}
          elementToggles={reviewElementToggles}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          backgroundLabels={backgroundLabels}
          clustering={clustering}
          initialCameraPosition={initialCameraPosition}
          putInView={putInView}
          autoRevealElementIds={revealingElementIds}
        />
      </div>

      <RecallInputBar
        correctCount={correctCount}
        totalCount={totalCount}
        inputValue={inputText}
        inputRef={inputRef}
        onInputChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Type an answer…"
        onGiveUp={handleGiveUp}
        onReconfigure={onReconfigure}
        lastMatchedElementId={session.lastMatchedElementId}
        lastMatchedAnswer={session.lastMatchedAnswer}
        ambiguousMessage={ambiguousMessage}
        isFinished={isFinished}
        reviewing={reviewing}
        reviewResult={reviewResult}
      />
    </div>
  );
}
