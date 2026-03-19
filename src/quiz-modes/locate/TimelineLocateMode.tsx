import { type ComponentType, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from '../ToggleDefinition';
import type { DatePrecision } from '@/scoring/calculateTimelineLocateScore';
import { formatTimestamp } from '@/visualizations/timeline/TimelineTimestamp';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';
import { useTimelineLocateQuiz } from './useTimelineLocateQuiz';
import styles from './TimelineLocateMode.module.css';

export interface TimelineLocateModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly toggleDefinitions?: ReadonlyArray<ToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
  readonly onFinish?: (score: ScoreResult) => void;
  readonly forceGiveUp?: boolean;
  readonly reviewing?: boolean;
  readonly datePrecision: DatePrecision;
}

export function TimelineLocateMode({
  elements,
  toggles,
  toggleDefinitions = [],
  Renderer,
  backgroundPaths,
  clustering,
  onFinish,
  forceGiveUp = false,
  reviewing = false,
  datePrecision,
}: TimelineLocateModeProps) {
  const quiz = useTimelineLocateQuiz(elements, datePrecision);
  const [showResults, setShowResults] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [inputError, setInputError] = useState(false);

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

  useEffect(() => {
    if (!quiz.isFinished) return;
    const timer = setTimeout(() => setShowResults(true), 1000);
    return () => clearTimeout(timer);
  }, [quiz.isFinished]);

  const handleCloseResults = useCallback(() => setShowResults(false), []);
  const handleOpenResults = useCallback(() => setShowResults(true), []);

  // Clear input when target changes
  useEffect(() => {
    setDateInput('');
    setInputError(false);
  }, [quiz.currentTargetIndex, quiz.rangePhase]);

  const handleDateSubmit = useCallback(() => {
    if (dateInput.trim() === '') return;
    const accepted = quiz.handleDateInput(dateInput);
    if (accepted) {
      setDateInput('');
      setInputError(false);
    } else {
      setInputError(true);
    }
  }, [dateInput, quiz]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleDateSubmit();
    }
  }, [handleDateSubmit]);

  const precisionLabel = datePrecision === 'year' ? 'year' : datePrecision === 'month' ? 'month & year' : 'date';
  const placeholderExamples: Readonly<Record<DatePrecision, string>> = {
    year: 'e.g. 1944',
    month: 'e.g. Jun 1944',
    day: 'e.g. 6 Jun 1944',
  };

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
            <div className={styles.promptArea}>
              <PromptDisplay
                targetLabel={quiz.currentTarget?.label ?? ''}
                currentIndex={quiz.currentTargetIndex}
                total={quiz.totalTargets}
                needsRange={quiz.currentNeedsRange}
                rangePhase={quiz.rangePhase}
                pendingStartAnswer={quiz.pendingStartAnswer}
              />
              <div className={styles.inputRow}>
                <input
                  className={`${styles.dateInput} ${inputError ? styles.dateInputError : ''}`}
                  type="text"
                  value={dateInput}
                  onChange={(e) => {
                    setDateInput(e.target.value);
                    setInputError(false);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Type ${precisionLabel} or click timeline (${placeholderExamples[datePrecision]})`}
                />
                <button
                  className={styles.submitButton}
                  onClick={handleDateSubmit}
                  disabled={dateInput.trim() === ''}
                >
                  Submit
                </button>
              </div>
            </div>
          )}
          <div className={styles.controls}>
            {quiz.isFinished ? (
              <button className={styles.controlButton} onClick={handleOpenResults}>
                Show results
              </button>
            ) : (
              <>
                <button className={styles.controlButton} onClick={quiz.handleSkip}>
                  Skip
                </button>
                <button className={styles.controlButton} onClick={quiz.handleGiveUp}>
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
          clustering={clustering}
        />

        <AnimatePresence>
          {showResults && !reviewing && (
            <TimelineLocateResults
              correctCount={quiz.correctCount}
              totalTargets={quiz.totalTargets}
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
          <div className={styles.progressTrack}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: '0%' }}
              animate={{ width: `${quiz.totalTargets > 0 ? (quiz.currentTargetIndex / quiz.totalTargets) * 100 : 0}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PromptDisplay({
  targetLabel,
  currentIndex,
  total,
  needsRange,
  rangePhase,
  pendingStartAnswer,
}: {
  readonly targetLabel: string;
  readonly currentIndex: number;
  readonly total: number;
  readonly needsRange: boolean;
  readonly rangePhase: string;
  readonly pendingStartAnswer: import('@/visualizations/timeline/TimelineTimestamp').TimelineTimestamp | undefined;
}) {
  let instruction: string;
  if (needsRange && rangePhase === 'end' && pendingStartAnswer) {
    instruction = `Now enter the end date (start: ${formatTimestamp(pendingStartAnswer)})`;
  } else if (needsRange) {
    instruction = 'Enter the start date';
  } else {
    instruction = 'Place on the timeline';
  }

  return (
    <div className={styles.prompt}>
      <span className={styles.promptCounter}>{currentIndex + 1}/{total}</span>
      <motion.span
        key={`${targetLabel}-${rangePhase}`}
        className={styles.promptText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        <strong>{targetLabel}</strong> — {instruction}
      </motion.span>
    </div>
  );
}

function FinishedPrompt({
  correctCount,
  totalTargets,
}: {
  readonly correctCount: number;
  readonly totalTargets: number;
}) {
  return (
    <div className={styles.prompt}>
      <span className={styles.promptText}>
        Finished — {correctCount}/{totalTargets} correct
      </span>
    </div>
  );
}

function TimelineLocateResults({
  correctCount,
  totalTargets,
  totalScore,
  onClose,
}: {
  readonly correctCount: number;
  readonly totalTargets: number;
  readonly totalScore: number;
  readonly onClose: () => void;
}) {
  const percentage = totalTargets > 0 ? Math.round((correctCount / totalTargets) * 100) : 0;
  const avgScore = totalTargets > 0 ? Math.round((totalScore / totalTargets) * 100) : 0;

  return (
    <motion.div
      className={styles.resultsOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className={styles.resultsCard}>
        <h2 className={styles.resultsTitle}>Results</h2>
        <div className={styles.resultsStat}>
          <span className={styles.resultsLabel}>Correct</span>
          <span className={styles.resultsValue}>{correctCount}/{totalTargets} ({percentage}%)</span>
        </div>
        <div className={styles.resultsStat}>
          <span className={styles.resultsLabel}>Average score</span>
          <span className={styles.resultsValue}>{avgScore}%</span>
        </div>
        <button className={styles.resultsClose} onClick={onClose}>
          Close
        </button>
      </div>
    </motion.div>
  );
}
