import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';
import { calculateScore } from '@/scoring/calculateScore';
import { shuffle } from '@/utilities/shuffle';

const DEFAULT_CHOICE_COUNT = 6;

export interface MultipleChoiceQuestion {
  readonly targetElement: VisualizationElement;
  readonly choices: ReadonlyArray<VisualizationElement>;
}

export interface MultipleChoiceQuizState {
  readonly currentQuestion: MultipleChoiceQuestion | undefined;
  readonly promptIndex: number;
  readonly totalPrompts: number;
  readonly correctCount: number;
  readonly isFinished: boolean;
  readonly score: ScoreResult;
  /** Index of the choice the user just picked incorrectly, or null. */
  readonly flashIncorrectIndex: number | null;
  /** Index of the correct choice, shown briefly after a correct answer. */
  readonly flashCorrectIndex: number | null;
}

export interface MultipleChoiceQuizActions {
  readonly handleChoiceSelect: (choiceIndex: number) => void;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

/**
 * Builds all questions upfront: shuffled element order, with random distractors per question.
 */
function buildQuestions(
  elements: ReadonlyArray<VisualizationElement>,
  choiceCount: number,
): ReadonlyArray<MultipleChoiceQuestion> {
  const interactiveElements = elements.filter((e) => e.interactive !== false);
  const shuffledElements = shuffle(interactiveElements);
  return shuffledElements.map((target) => {
    const distractors = shuffle(interactiveElements.filter((e) => e.id !== target.id))
      .slice(0, choiceCount - 1);
    const choices = shuffle([target, ...distractors]);
    return { targetElement: target, choices };
  });
}

export function useMultipleChoiceQuiz(
  elements: ReadonlyArray<VisualizationElement>,
  choiceCount: number = DEFAULT_CHOICE_COUNT,
): MultipleChoiceQuizState & MultipleChoiceQuizActions {
  const [questions] = useState(() => buildQuestions(elements, choiceCount));
  const [promptIndex, setPromptIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [flashIncorrectIndex, setFlashIncorrectIndex] = useState<number | null>(null);
  const [flashCorrectIndex, setFlashCorrectIndex] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  const totalPrompts = questions.length;
  const isFinished = promptIndex >= totalPrompts;
  const currentQuestion = isFinished ? undefined : questions[promptIndex];

  const score = useMemo(
    () => calculateScore(correctCount, totalPrompts),
    [correctCount, totalPrompts],
  );

  const advanceAfterDelay = useCallback((delayMs: number) => {
    setAdvancing(true);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      setPromptIndex((prev) => prev + 1);
      setFlashIncorrectIndex(null);
      setFlashCorrectIndex(null);
      setAdvancing(false);
      advanceTimerRef.current = null;
    }, delayMs);
  }, []);

  const handleChoiceSelect = useCallback(
    (choiceIndex: number) => {
      if (isFinished || !currentQuestion || advancing) return;

      const selectedElement = currentQuestion.choices[choiceIndex];
      const correctIndex = currentQuestion.choices.findIndex(
        (c) => c.id === currentQuestion.targetElement.id,
      );

      if (selectedElement.id === currentQuestion.targetElement.id) {
        setCorrectCount((prev) => prev + 1);
        setFlashCorrectIndex(correctIndex);
        advanceAfterDelay(500);
      } else {
        setFlashIncorrectIndex(choiceIndex);
        setFlashCorrectIndex(correctIndex);
        advanceAfterDelay(1200);
      }
    },
    [isFinished, currentQuestion, advancing, advanceAfterDelay],
  );

  const handleSkip = useCallback(() => {
    if (isFinished || advancing) return;
    advanceAfterDelay(0);
  }, [isFinished, advancing, advanceAfterDelay]);

  const handleGiveUp = useCallback(() => {
    if (isFinished) return;
    setPromptIndex(totalPrompts);
    setFlashIncorrectIndex(null);
    setFlashCorrectIndex(null);
    setAdvancing(false);
  }, [isFinished, totalPrompts]);

  return {
    currentQuestion,
    promptIndex,
    totalPrompts,
    correctCount,
    isFinished,
    score,
    flashIncorrectIndex,
    flashCorrectIndex,
    handleChoiceSelect,
    handleSkip,
    handleGiveUp,
  };
}
