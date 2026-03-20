import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import { calculateScore } from '@/scoring/calculateScore';
import { shuffle } from '@/utilities/shuffle';

const MAX_WRONG_ATTEMPTS = 3;
const FLASH_DURATION_MS = 800;
const AUTO_REVEAL_DURATION_MS = 1500;

function correctStateForAttempts(wrongAttempts: number): ElementVisualState {
  if (wrongAttempts === 0) return 'correct';
  if (wrongAttempts === 1) return 'correct-second';
  return 'correct-third';
}

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
  /** ID of element that was just incorrectly clicked (flashing red with label). */
  readonly flashIncorrectId: string | null;
  /** ID of element being auto-revealed after max wrong attempts (click guard only, not a state source). */
  readonly autoRevealId: string | null;
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
  const [missedIds, setMissedIds] = useState<ReadonlySet<string>>(new Set());
  const [answeredIds, setAnsweredIds] = useState<ReadonlySet<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState<Readonly<Record<string, number>>>({});
  const [flashIncorrectId, setFlashIncorrectId] = useState<string | null>(null);
  const [autoRevealId, setAutoRevealId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    if (autoRevealTimeoutRef.current) clearTimeout(autoRevealTimeoutRef.current);
  }, []);

  const totalPrompts = shuffledOrder.length;
  const isFinished = promptIndex >= totalPrompts;
  const currentElementId = isFinished ? undefined : shuffledOrder[promptIndex];
  const currentElementLabel = currentElementId ? elementLabelsById[currentElementId] : undefined;

  const elementStates = useMemo(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const el of elements) {
      if (correctIds.has(el.id)) {
        states[el.id] = correctStateForAttempts(wrongAttempts[el.id] ?? 0);
      } else if (missedIds.has(el.id)) {
        states[el.id] = 'missed';
      } else if (skippedIds.has(el.id)) {
        states[el.id] = 'incorrect';
      } else if (el.id === flashIncorrectId) {
        states[el.id] = 'incorrect';
      } else {
        states[el.id] = 'default';
      }
    }
    return states;
  }, [elements, correctIds, missedIds, skippedIds, wrongAttempts, flashIncorrectId]);

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
      flashTimeoutRef.current = null;
    }
    setFlashIncorrectId(null);
  }, []);

  const clearAutoReveal = useCallback(() => {
    if (autoRevealTimeoutRef.current) {
      clearTimeout(autoRevealTimeoutRef.current);
      autoRevealTimeoutRef.current = null;
    }
    setAutoRevealId(null);
  }, []);

  const handleElementClick = useCallback(
    (elementId: string) => {
      if (isFinished || !currentElementId || autoRevealId) return;
      // Ignore clicks on already-answered elements
      if (answeredIds.has(elementId)) return;

      clearFlash();

      if (elementId === currentElementId) {
        // Correct!
        setCorrectIds((prev) => new Set([...prev, elementId]));
        setAnsweredIds((prev) => new Set([...prev, elementId]));
        advancePrompt();
      } else {
        // Wrong — flash the clicked element red with label
        const newAttempts = (wrongAttempts[currentElementId] ?? 0) + 1;
        setWrongAttempts((prev) => ({
          ...prev,
          [currentElementId]: newAttempts,
        }));

        if (newAttempts >= MAX_WRONG_ATTEMPTS) {
          // Max attempts reached — flash incorrect briefly, then auto-reveal correct answer
          setFlashIncorrectId(elementId);
          flashTimeoutRef.current = setTimeout(() => {
            setFlashIncorrectId(null);
            // Show correct answer highlighted
            setAutoRevealId(currentElementId);
            setSkippedIds((prev) => new Set([...prev, currentElementId]));
            setAnsweredIds((prev) => new Set([...prev, currentElementId]));
            autoRevealTimeoutRef.current = setTimeout(() => {
              setAutoRevealId(null);
              advancePrompt();
            }, AUTO_REVEAL_DURATION_MS);
          }, FLASH_DURATION_MS);
        } else {
          // Still have attempts left — just flash incorrect
          setFlashIncorrectId(elementId);
          flashTimeoutRef.current = setTimeout(() => {
            setFlashIncorrectId(null);
          }, FLASH_DURATION_MS);
        }
      }
    },
    [isFinished, currentElementId, answeredIds, wrongAttempts, autoRevealId, clearFlash, advancePrompt],
  );

  const handleSkip = useCallback(() => {
    if (isFinished || !currentElementId || autoRevealId) return;
    clearFlash();
    clearAutoReveal();
    setSkippedIds((prev) => new Set([...prev, currentElementId]));
    setAnsweredIds((prev) => new Set([...prev, currentElementId]));
    advancePrompt();
  }, [isFinished, currentElementId, autoRevealId, clearFlash, clearAutoReveal, advancePrompt]);

  const handleGiveUp = useCallback(() => {
    if (isFinished) return;
    clearFlash();
    clearAutoReveal();

    const newMissed = new Set(missedIds);
    const newAnswered = new Set(answeredIds);
    for (let i = promptIndex; i < totalPrompts; i++) {
      const id = shuffledOrder[i];
      if (!correctIds.has(id) && !skippedIds.has(id)) {
        newMissed.add(id);
      }
      newAnswered.add(id);
    }
    setMissedIds(newMissed);
    setAnsweredIds(newAnswered);
    setPromptIndex(totalPrompts);
  }, [isFinished, promptIndex, totalPrompts, shuffledOrder, correctIds, skippedIds, missedIds, answeredIds, clearFlash, clearAutoReveal]);

  return {
    currentElementId,
    currentElementLabel,
    promptIndex,
    totalPrompts,
    correctCount: correctIds.size,
    skippedCount: skippedIds.size + missedIds.size,
    isFinished,
    elementStates,
    wrongAttemptsPerElement: wrongAttempts,
    answeredElementIds: answeredIds,
    score,
    flashIncorrectId,
    autoRevealId,
    handleElementClick,
    handleSkip,
    handleGiveUp,
  };
}
