import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import { calculateScore } from '@/scoring/calculateScore';
import { shuffle } from '@/utilities/shuffle';
import { matchAnswer } from '../free-recall/matchAnswer';

interface PromptedRecallConfig {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly answerColumn: string;
}

export interface PromptedRecallState {
  readonly currentElementId: string | undefined;
  readonly promptIndex: number;
  readonly totalPrompts: number;
  readonly correctCount: number;
  readonly skippedCount: number;
  readonly isFinished: boolean;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly wrongAttemptsPerElement: Readonly<Record<string, number>>;
  readonly answeredElementIds: ReadonlySet<string>;
  readonly score: ScoreResult;
  readonly flashIncorrect: boolean;
  readonly lastMatchedElementId: string | undefined;
  readonly lastMatchedAnswer: string | undefined;
}

export interface PromptedRecallActions {
  readonly handleTextInput: (text: string) => boolean;
  readonly handleSubmit: (text: string) => void;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

/**
 * Manages quiz state for prompted recall mode.
 *
 * The inverse of identify: an element is highlighted on the visualization
 * and the user types its name. Elements are prompted in random order.
 * Auto-matches as the user types (against the current element only).
 * On Enter with no match, flashes incorrect briefly.
 */
export function usePromptedRecallQuiz({
  elements,
  dataRows,
  answerColumn,
}: PromptedRecallConfig): PromptedRecallState & PromptedRecallActions {
  const [shuffledOrder] = useState(() =>
    shuffle(elements.map((e) => e.id)),
  );

  const dataRowsById = useMemo(() => {
    const map: Record<string, Readonly<Record<string, string>>> = {};
    for (const row of dataRows) {
      const id = row['id'] ?? '';
      map[id] = row;
    }
    return map;
  }, [dataRows]);

  const elementLabelById = useMemo(
    () => new Map(elements.map((el) => [el.id, el.label])),
    [elements],
  );

  const [promptIndex, setPromptIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<ReadonlySet<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<ReadonlySet<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Readonly<Record<string, number>>>({});
  const [flashIncorrect, setFlashIncorrect] = useState(false);
  const [lastMatchedElementId, setLastMatchedElementId] = useState<string | undefined>(undefined);
  const [lastMatchedAnswer, setLastMatchedAnswer] = useState<string | undefined>(undefined);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  const totalPrompts = shuffledOrder.length;
  const isFinished = promptIndex >= totalPrompts;
  const currentElementId = isFinished ? undefined : shuffledOrder[promptIndex];

  const elementStates = useMemo(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const el of elements) {
      if (correctIds.has(el.id)) {
        states[el.id] = 'correct';
      } else if (skippedIds.has(el.id)) {
        states[el.id] = 'missed';
      } else if (el.id === currentElementId) {
        states[el.id] = 'highlighted';
      } else {
        states[el.id] = 'default';
      }
    }
    return states;
  }, [elements, correctIds, skippedIds, currentElementId]);

  const score = useMemo(
    () => calculateScore(correctIds.size, totalPrompts),
    [correctIds.size, totalPrompts],
  );

  const clearFlash = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    setFlashIncorrect(false);
  }, []);

  const advancePrompt = useCallback(() => {
    clearFlash();
    setPromptIndex((prev) => prev + 1);
  }, [clearFlash]);

  const handleTextInput = useCallback(
    (text: string): boolean => {
      clearFlash();
      if (isFinished || !currentElementId) return false;

      const currentRow = dataRowsById[currentElementId];
      if (!currentRow) return false;

      const match = matchAnswer(text, [currentRow], answerColumn);
      if (match && 'elementId' in match) {
        setCorrectIds((prev) => new Set([...prev, currentElementId]));
        setAnsweredIds((prev) => new Set([...prev, currentElementId]));
        setLastMatchedElementId(match.elementId);
        setLastMatchedAnswer(elementLabelById.get(match.elementId) ?? match.displayAnswer);
        advancePrompt();
        return true;
      }
      return false;
    },
    [isFinished, currentElementId, dataRowsById, answerColumn, elementLabelById, clearFlash, advancePrompt],
  );

  const handleSubmit = useCallback(
    (text: string) => {
      if (isFinished || !currentElementId) return;
      if (text.trim() === '') return;

      const currentRow = dataRowsById[currentElementId];
      if (!currentRow) return;

      const match = matchAnswer(text, [currentRow], answerColumn);
      if (match && 'elementId' in match) {
        clearFlash();
        setCorrectIds((prev) => new Set([...prev, currentElementId]));
        setAnsweredIds((prev) => new Set([...prev, currentElementId]));
        setLastMatchedElementId(match.elementId);
        setLastMatchedAnswer(elementLabelById.get(match.elementId) ?? match.displayAnswer);
        advancePrompt();
        return;
      }

      // Wrong answer — flash incorrect
      setWrongAttempts((prev) => ({
        ...prev,
        [currentElementId]: (prev[currentElementId] ?? 0) + 1,
      }));
      setFlashIncorrect(true);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = setTimeout(() => {
        setFlashIncorrect(false);
      }, 600);
    },
    [isFinished, currentElementId, dataRowsById, answerColumn, elementLabelById, clearFlash, advancePrompt],
  );

  const handleSkip = useCallback(() => {
    if (isFinished || !currentElementId) return;
    clearFlash();
    setSkippedIds((prev) => new Set([...prev, currentElementId]));
    setAnsweredIds((prev) => new Set([...prev, currentElementId]));
    advancePrompt();
  }, [isFinished, currentElementId, clearFlash, advancePrompt]);

  const handleGiveUp = useCallback(() => {
    if (isFinished) return;
    clearFlash();

    const newSkipped = new Set(skippedIds);
    const newAnswered = new Set(answeredIds);
    for (let i = promptIndex; i < totalPrompts; i++) {
      const id = shuffledOrder[i];
      if (!correctIds.has(id)) {
        newSkipped.add(id);
      }
      newAnswered.add(id);
    }
    setSkippedIds(newSkipped);
    setAnsweredIds(newAnswered);
    setPromptIndex(totalPrompts);
  }, [isFinished, promptIndex, totalPrompts, shuffledOrder, correctIds, skippedIds, answeredIds, clearFlash]);

  return {
    currentElementId,
    promptIndex,
    totalPrompts,
    correctCount: correctIds.size,
    skippedCount: skippedIds.size,
    isFinished,
    elementStates,
    wrongAttemptsPerElement: wrongAttempts,
    answeredElementIds: answeredIds,
    score,
    flashIncorrect,
    lastMatchedElementId,
    lastMatchedAnswer,
    handleTextInput,
    handleSubmit,
    handleSkip,
    handleGiveUp,
  };
}
