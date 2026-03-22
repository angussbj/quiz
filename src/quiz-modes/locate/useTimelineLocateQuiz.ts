import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { VisualizationElement, ViewBoxPosition, ElementVisualState } from '@/visualizations/VisualizationElement';
import { isTimelineElement, type TimelineElement } from '@/visualizations/timeline/TimelineElement';
import type { TimelineTimestamp } from '@/visualizations/timeline/TimelineTimestamp';
import { timestampToFractionalYear } from '@/visualizations/timeline/TimelineTimestamp';
import { UNITS_PER_YEAR, type TimeScale } from '@/visualizations/timeline/buildTimelineElements';
import {
  computeLogReferenceYear,
  logYearToViewBoxX,
  viewBoxXToLogYear,
  scoreLogScaleAnswer,
} from '@/visualizations/timeline/logTimeScale';
import {
  type DatePrecision,
  needsRangeAnswer,
  scorePointAnswer,
  scoreRangeAnswer,
  isTimelineAnswerCorrect,
  truncateToPrecision,
} from '@/scoring/calculateTimelineLocateScore';
import { parseDateInput } from './parseDateInput';
import { shuffle } from '@/utilities/shuffle';

export type TimelineLocatePhase = 'start' | 'end' | 'done';

export interface TimelineLocateQuizState {
  readonly currentTarget: TimelineElement | undefined;
  readonly currentTargetIndex: number;
  readonly totalTargets: number;
  readonly correctCount: number;
  readonly totalScore: number;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly isFinished: boolean;
  /** Whether the current target needs a range answer. */
  readonly currentNeedsRange: boolean;
  /** Which part of the range we're collecting: 'start', 'end', or 'done'. */
  readonly rangePhase: TimelineLocatePhase;
  /** The start answer already entered (if in 'end' phase). */
  readonly pendingStartAnswer: TimelineTimestamp | undefined;
}

export interface TimelineLocateQuizActions {
  readonly handlePositionClick: (position: ViewBoxPosition) => void;
  readonly handleDateInput: (text: string) => boolean;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

function viewBoxXToTimestamp(x: number, precision: DatePrecision, timeScale: TimeScale, logReferenceYear: number): TimelineTimestamp {
  const fractionalYear = timeScale === 'log' ? viewBoxXToLogYear(x, logReferenceYear) : x / UNITS_PER_YEAR;
  const year = Math.trunc(fractionalYear);

  if (precision === 'year') return [year];

  const fractPart = fractionalYear - Math.floor(fractionalYear);
  const monthFraction = fractPart * 12;
  const month = Math.max(1, Math.min(12, Math.floor(monthFraction) + 1));

  if (precision === 'month') return [year, month];

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayFraction = (monthFraction - (month - 1)) * daysInMonth;
  const day = Math.max(1, Math.min(daysInMonth, Math.floor(dayFraction) + 1));

  return [year, month, day];
}

export function useTimelineLocateQuiz(
  elements: ReadonlyArray<VisualizationElement>,
  precision: DatePrecision,
  timeScale: TimeScale = 'linear',
): TimelineLocateQuizState & TimelineLocateQuizActions {
  const timelineElements = useMemo(
    () => elements.filter((e): e is TimelineElement => isTimelineElement(e) && e.interactive !== false),
    [elements],
  );

  // Compute the log-scale reference year from the latest event in the data.
  const logReferenceYear = useMemo(() => {
    if (timeScale !== 'log') return 0;
    let maxYear = -Infinity;
    for (const el of timelineElements) {
      const endYear = el.end
        ? timestampToFractionalYear(el.end, true)
        : timestampToFractionalYear(el.start, false);
      maxYear = Math.max(maxYear, endYear);
    }
    return computeLogReferenceYear(maxYear);
  }, [timeScale, timelineElements]);

  const [targetOrder] = useState<ReadonlyArray<string>>(() =>
    shuffle(timelineElements.map((e) => e.id)),
  );
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [scores, setScores] = useState<ReadonlyArray<number>>([]);
  const [elementStates, setElementStates] = useState<Readonly<Record<string, ElementVisualState>>>(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const element of elements) {
      states[element.id] = element.interactive !== false ? 'hidden' : 'context';
    }
    return states;
  });
  const [rangePhase, setRangePhase] = useState<TimelineLocatePhase>('start');
  const [pendingStartAnswer, setPendingStartAnswer] = useState<TimelineTimestamp | undefined>(undefined);

  const elementsById = useRef(
    new Map(timelineElements.map((e) => [e.id, e])),
  ).current;

  const currentTargetId = currentTargetIndex < targetOrder.length
    ? targetOrder[currentTargetIndex]
    : undefined;
  const currentTarget = currentTargetId ? elementsById.get(currentTargetId) : undefined;
  const isFinished = currentTargetIndex >= targetOrder.length;
  const totalTargets = targetOrder.length;

  const correctCount = scores.filter((s) => isTimelineAnswerCorrect(s)).length;
  const totalScore = scores.reduce((sum, s) => sum + s, 0);

  const currentNeedsRange = useMemo(() => {
    if (!currentTarget) return false;
    return needsRangeAnswer(currentTarget.start, currentTarget.end, precision);
  }, [currentTarget, precision]);

  // Reset range phase when target changes
  useEffect(() => {
    setRangePhase('start');
    setPendingStartAnswer(undefined);
  }, [currentTargetIndex]);

  const submitAnswer = useCallback((answer: TimelineTimestamp, endAnswer?: TimelineTimestamp) => {
    if (isFinished || !currentTarget) return;

    let score: number;
    if (timeScale === 'log') {
      // For log-scale timelines, score based on viewBox-space proximity rather than
      // year-space distance (which is meaningless at geological scales).
      const userFrac = timestampToFractionalYear(answer, false);
      const userViewBoxX = logYearToViewBoxX(userFrac, logReferenceYear);
      const eventStartViewBoxX = logYearToViewBoxX(timestampToFractionalYear(currentTarget.start, false), logReferenceYear);
      const eventEndViewBoxX = currentTarget.end
        ? logYearToViewBoxX(timestampToFractionalYear(currentTarget.end, true), logReferenceYear)
        : eventStartViewBoxX;
      score = scoreLogScaleAnswer(userViewBoxX, eventStartViewBoxX, eventEndViewBoxX);
    } else if (endAnswer) {
      score = scoreRangeAnswer(
        answer,
        endAnswer,
        currentTarget.start,
        currentTarget.end ?? currentTarget.start,
        precision,
      );
    } else {
      score = scorePointAnswer(answer, currentTarget.start, currentTarget.end, precision);
    }

    const isCorrect = isTimelineAnswerCorrect(score);

    setScores((prev) => [...prev, score]);
    setElementStates((prev) => ({
      ...prev,
      [currentTarget.id]: isCorrect ? 'correct' : 'incorrect',
    }));
    setCurrentTargetIndex((prev) => prev + 1);
  }, [isFinished, currentTarget, precision, timeScale, logReferenceYear]);

  const handlePositionClick = useCallback((position: ViewBoxPosition) => {
    if (isFinished || !currentTarget) return;

    const clickTimestamp = viewBoxXToTimestamp(position.x, precision, timeScale, logReferenceYear);

    if (currentNeedsRange) {
      if (rangePhase === 'start') {
        setPendingStartAnswer(clickTimestamp);
        setRangePhase('end');
      } else if (rangePhase === 'end' && pendingStartAnswer) {
        submitAnswer(pendingStartAnswer, clickTimestamp);
      }
    } else {
      submitAnswer(clickTimestamp);
    }
  }, [isFinished, currentTarget, precision, timeScale, logReferenceYear, currentNeedsRange, rangePhase, pendingStartAnswer, submitAnswer]);

  const handleDateInput = useCallback((text: string): boolean => {
    if (isFinished || !currentTarget) return false;

    const parsed = parseDateInput(text);
    if (!parsed) return false;

    const truncated = truncateToPrecision(parsed, precision);

    if (currentNeedsRange) {
      if (rangePhase === 'start') {
        setPendingStartAnswer(truncated);
        setRangePhase('end');
        return true;
      } else if (rangePhase === 'end' && pendingStartAnswer) {
        submitAnswer(pendingStartAnswer, truncated);
        return true;
      }
    } else {
      submitAnswer(truncated);
      return true;
    }

    return false;
  }, [isFinished, currentTarget, precision, currentNeedsRange, rangePhase, pendingStartAnswer, submitAnswer]);

  const handleSkip = useCallback(() => {
    if (isFinished || !currentTarget) return;
    setElementStates((prev) => ({
      ...prev,
      [currentTarget.id]: 'incorrect',
    }));
    setCurrentTargetIndex((prev) => prev + 1);
  }, [isFinished, currentTarget]);

  const handleGiveUp = useCallback(() => {
    if (isFinished) return;
    setElementStates((prev) => {
      const next = { ...prev };
      for (let i = currentTargetIndex; i < targetOrder.length; i++) {
        next[targetOrder[i]] = 'missed';
      }
      return next;
    });
    setCurrentTargetIndex(targetOrder.length);
  }, [isFinished, currentTargetIndex, targetOrder]);

  return {
    currentTarget,
    currentTargetIndex,
    totalTargets,
    correctCount,
    totalScore,
    elementStates,
    isFinished,
    currentNeedsRange,
    rangePhase,
    pendingStartAnswer,
    handlePositionClick,
    handleDateInput,
    handleSkip,
    handleGiveUp,
  };
}
