import { useCallback, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import { calculateScore } from '@/scoring/calculateScore';
import { shuffle } from '@/utilities/shuffle';

export interface IdentifyQuizState {
  readonly currentElementId: string | undefined;
  readonly currentElementLabel: string | undefined;
  readonly promptIndex: number;
  readonly totalPrompts: number;
  readonly correctCount: number;
  readonly skippedCount: number;
  readonly isFinished: boolean;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly wrongAttemptsPerElement: Readonly<Record<string, number>>;
  readonly answeredElementIds: ReadonlySet<string>;
  readonly score: ScoreResult;
  /** ID of element that was just incorrectly clicked, cleared after animation. */
  readonly flashIncorrectId: string | null;
}

export interface IdentifyQuizActions {
  readonly handleElementClick: (elementId: string) => void;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

export function useIdentifyQuiz(
  elements: ReadonlyArray<VisualizationElement>,
): IdentifyQuizState & IdentifyQuizActions {
  const [shuffledOrder] = useState(() =>
    shuffle(elements.map((e) => e.id)),
  );

  const elementLabelsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const el of elements) {
      map[el.id] = el.label;
    }
    return map;
  }, [elements]);

  const [promptIndex, setPromptIndex] = useState(0);
  const [correctIds, setCorrectIds] = useState<ReadonlySet<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<ReadonlySet<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Readonly<Record<string, number>>>({});
  const [flashIncorrectId, setFlashIncorrectId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPrompts = shuffledOrder.length;
  const isFinished = promptIndex >= totalPrompts;
  const currentElementId = isFinished ? undefined : shuffledOrder[promptIndex];
  const currentElementLabel = currentElementId ? elementLabelsById[currentElementId] : undefined;

  const elementStates = useMemo(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const el of elements) {
      if (correctIds.has(el.id)) {
        states[el.id] = 'correct';
      } else if (skippedIds.has(el.id)) {
        states[el.id] = 'revealed';
      } else if (el.id === flashIncorrectId) {
        states[el.id] = 'incorrect';
      } else if (el.id === currentElementId) {
        // Don't highlight the target — that would give it away
        states[el.id] = 'hidden';
      } else {
        states[el.id] = 'hidden';
      }
    }
    return states;
  }, [elements, correctIds, skippedIds, flashIncorrectId, currentElementId]);

  const score = useMemo(
    () => calculateScore(correctIds.size, totalPrompts),
    [correctIds.size, totalPrompts],
  );

  const advancePrompt = useCallback(() => {
    setPromptIndex((prev) => prev + 1);
  }, []);

  const clearFlash = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setFlashIncorrectId(null);
  }, []);

  const handleElementClick = useCallback(
    (elementId: string) => {
      if (isFinished || !currentElementId) return;
      // Ignore clicks on already-answered elements
      if (answeredIds.has(elementId)) return;

      clearFlash();

      if (elementId === currentElementId) {
        // Correct!
        setCorrectIds((prev) => new Set([...prev, elementId]));
        setAnsweredIds((prev) => new Set([...prev, elementId]));
        advancePrompt();
      } else {
        // Wrong — flash the clicked element red
        setWrongAttempts((prev) => ({
          ...prev,
          [currentElementId]: (prev[currentElementId] ?? 0) + 1,
        }));
        setFlashIncorrectId(elementId);
        flashTimeoutRef.current = setTimeout(() => {
          setFlashIncorrectId(null);
        }, 600);
      }
    },
    [isFinished, currentElementId, answeredIds, clearFlash, advancePrompt],
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
    currentElementLabel,
    promptIndex,
    totalPrompts,
    correctCount: correctIds.size,
    skippedCount: skippedIds.size,
    isFinished,
    elementStates,
    wrongAttemptsPerElement: wrongAttempts,
    answeredElementIds: answeredIds,
    score,
    flashIncorrectId,
    handleElementClick,
    handleSkip,
    handleGiveUp,
  };
}
