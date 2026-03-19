import { useCallback, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { QuizSessionState } from '../QuizSessionState';
import type { ToggleDefinition } from '../ToggleDefinition';
import { resolveElementToggles, type ElementQuizState } from '../resolveElementToggles';
import { calculateUnorderedRecallScore } from '@/scoring/calculateUnorderedRecallScore';
import { matchAnswer } from './matchAnswer';

interface FreeRecallSessionConfig {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly answerColumn: string;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
}

interface FreeRecallSessionResult {
  readonly session: QuizSessionState;
  readonly elementToggles: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  readonly handleTextAnswer: (text: string) => void;
  readonly handleGiveUp: () => void;
}

/**
 * Manages quiz session state for free recall (unordered) mode.
 *
 * Handles answer matching, score tracking, element state updates,
 * and per-element toggle resolution.
 */
export function useFreeRecallSession({
  elements,
  dataRows,
  answerColumn,
  toggleDefinitions,
  toggleValues,
}: FreeRecallSessionConfig): FreeRecallSessionResult {
  const [correctIds, setCorrectIds] = useState<ReadonlyArray<string>>([]);
  const [givenUp, setGivenUp] = useState(false);
  const [lastMatchedElementId, setLastMatchedElementId] = useState<string | undefined>(undefined);
  const [lastMatchedAnswer, setLastMatchedAnswer] = useState<string | undefined>(undefined);

  const correctIdSet = useMemo(() => new Set(correctIds), [correctIds]);
  const interactiveElements = useMemo(
    () => elements.filter((el) => el.interactive !== false),
    [elements],
  );
  const totalElements = interactiveElements.length;

  const remainingRows = useMemo(
    () => dataRows.filter((row) => !correctIdSet.has(row['id'] ?? '')),
    [dataRows, correctIdSet],
  );

  const remainingElementIds = useMemo(
    () => interactiveElements.filter((el) => !correctIdSet.has(el.id)).map((el) => el.id),
    [interactiveElements, correctIdSet],
  );

  const elementStates = useMemo(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const element of elements) {
      if (correctIdSet.has(element.id)) {
        states[element.id] = 'correct';
      } else if (givenUp) {
        states[element.id] = 'missed';
      } else {
        states[element.id] = 'default';
      }
    }
    return states;
  }, [elements, correctIdSet, givenUp]);

  const score = useMemo(
    () => calculateUnorderedRecallScore(correctIds.length, totalElements),
    [correctIds.length, totalElements],
  );

  const status: QuizSessionState['status'] = givenUp || correctIds.length === totalElements
    ? 'finished'
    : 'active';

  // Build per-element quiz state for toggle resolution.
  // In free recall: no wrong attempts, isAnswered = correct or given up.
  const elementQuizStates = useMemo(() => {
    const states: Record<string, ElementQuizState> = {};
    for (const element of elements) {
      states[element.id] = {
        isAnswered: correctIdSet.has(element.id) || givenUp,
        wrongAttempts: 0, // no wrong answer tracking in free recall
      };
    }
    return states;
  }, [elements, correctIdSet, givenUp]);

  const elementToggles = useMemo(
    () => resolveElementToggles(toggleDefinitions, toggleValues, elementQuizStates),
    [toggleDefinitions, toggleValues, elementQuizStates],
  );

  // Use ref for remainingRows in callback to avoid stale closures
  const remainingRowsRef = useRef(remainingRows);
  remainingRowsRef.current = remainingRows;

  const handleTextAnswer = useCallback((text: string) => {
    if (givenUp) return;

    const match = matchAnswer(text, remainingRowsRef.current, answerColumn);
    if (match) {
      setCorrectIds((prev) => [...prev, match.elementId]);
      setLastMatchedElementId(match.elementId);
      setLastMatchedAnswer(match.displayAnswer);
    }
  }, [answerColumn, givenUp]);

  const handleGiveUp = useCallback(() => {
    setGivenUp(true);
  }, []);

  const session: QuizSessionState = useMemo(() => ({
    toggles: toggleValues,
    elementStates,
    remainingElementIds,
    correctElementIds: correctIds,
    incorrectElementIds: [],
    status,
    elapsedMs: 0,
    score,
    lastMatchedElementId,
    lastMatchedAnswer,
  }), [toggleValues, elementStates, remainingElementIds, correctIds, status, score, lastMatchedElementId, lastMatchedAnswer]);

  return {
    session,
    elementToggles,
    handleTextAnswer,
    handleGiveUp,
  };
}
