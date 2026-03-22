import { useState, useCallback, useRef, useEffect } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import { isGridElement } from '@/visualizations/periodic-table/GridElement';
import { computeTrueGridManhattanDistance } from '@/quiz-definitions/quiz-specific-logic/periodicTableTrueGrid';
import { shuffle } from '@/utilities/shuffle';
import type { GridLocateFeedbackItem } from './GridLocateFeedbackItem';

const FEEDBACK_DURATION_MS = 2000;

function distanceToState(distance: number): ElementVisualState {
  if (distance === 0) return 'correct';
  if (distance === 1) return 'correct-second';
  if (distance === 2) return 'correct-third';
  return 'incorrect';
}

export function useGridLocateQuiz(elements: ReadonlyArray<VisualizationElement>) {
  const [targetOrder] = useState<ReadonlyArray<string>>(() =>
    shuffle(elements.filter((e) => e.interactive).map((e) => e.id)),
  );
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [distances, setDistances] = useState<ReadonlyArray<number>>([]);
  const [elementStates, setElementStates] = useState<Readonly<Record<string, ElementVisualState>>>(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const element of elements) {
      states[element.id] = element.interactive ? 'hidden' : 'context';
    }
    return states;
  });
  const [feedbackItems, setFeedbackItems] = useState<ReadonlyArray<GridLocateFeedbackItem>>([]);
  const feedbackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = feedbackTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const elementsById = useRef(
    new Map(elements.map((e) => [e.id, e])),
  ).current;

  const currentTargetId = currentTargetIndex < targetOrder.length
    ? targetOrder[currentTargetIndex]
    : undefined;
  const currentTarget = currentTargetId ? elementsById.get(currentTargetId) : undefined;
  const isFinished = currentTargetIndex >= targetOrder.length;
  const totalTargets = targetOrder.length;
  const correctCount = distances.filter((d) => d === 0).length;

  const scheduleFeedbackRemoval = useCallback((feedbackId: string) => {
    const timer = setTimeout(() => {
      setFeedbackItems((prev) => prev.filter((item) => item.id !== feedbackId));
      feedbackTimersRef.current.delete(feedbackId);
    }, FEEDBACK_DURATION_MS);
    feedbackTimersRef.current.set(feedbackId, timer);
  }, []);

  const handleElementClick = useCallback(
    (clickedElementId: string) => {
      if (isFinished || !currentTarget) return;

      const clickedElement = elementsById.get(clickedElementId);
      if (!clickedElement) return;
      if (!isGridElement(clickedElement) || !isGridElement(currentTarget)) return;

      const distance = computeTrueGridManhattanDistance(clickedElement, currentTarget);
      const state = distanceToState(distance);

      setDistances((prev) => [...prev, distance]);

      setElementStates((prev) => ({
        ...prev,
        [currentTarget.id]: state === 'correct' ? 'correct' : 'incorrect',
        [clickedElementId]: state,
      }));

      if (distance > 0) {
        const feedbackId = `feedback-${currentTargetIndex}`;
        const feedbackItem: GridLocateFeedbackItem = {
          id: feedbackId,
          clickedCenter: clickedElement.viewBoxCenter,
          targetCenter: currentTarget.viewBoxCenter,
          manhattanDistance: distance,
          createdAt: Date.now(),
        };
        setFeedbackItems((prev) => [...prev, feedbackItem]);
        scheduleFeedbackRemoval(feedbackId);
      }

      setCurrentTargetIndex((prev) => prev + 1);
    },
    [isFinished, currentTarget, currentTargetIndex, elementsById, scheduleFeedbackRemoval],
  );

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
    distances,
    elementStates,
    feedbackItems,
    isFinished,
    handleElementClick,
    handleSkip,
    handleGiveUp,
  };
}
