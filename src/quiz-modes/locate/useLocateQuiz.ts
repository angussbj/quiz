import { useState, useCallback, useRef, useEffect } from 'react';
import type { VisualizationElement, ViewBoxPosition, ElementVisualState } from '@/visualizations/VisualizationElement';
import { isMapElement } from '@/visualizations/map/MapElement';
import { calculateGreatCircleDistance } from '@/scoring/calculateGreatCircleDistance';
import { calculateLocateAnswerScore, isLocateAnswerCorrect } from '@/scoring/calculateLocateAnswerScore';
import { shuffle } from '@/utilities/shuffle';
import type { LocateFeedbackItem } from './LocateFeedbackItem';

const FEEDBACK_DURATION_MS = 2000;

export interface LocateQuizState {
  readonly currentTarget: VisualizationElement | undefined;
  readonly currentTargetIndex: number;
  readonly totalTargets: number;
  readonly correctCount: number;
  readonly totalScore: number;
  readonly distances: ReadonlyArray<number>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly feedbackItems: ReadonlyArray<LocateFeedbackItem>;
  readonly isFinished: boolean;
  readonly averageDistance: number;
}

export interface LocateQuizActions {
  readonly handlePositionClick: (position: ViewBoxPosition) => void;
  readonly handleSkip: () => void;
  readonly handleGiveUp: () => void;
}

export function useLocateQuiz(
  elements: ReadonlyArray<VisualizationElement>,
): LocateQuizState & LocateQuizActions {
  const [targetOrder] = useState<ReadonlyArray<string>>(() =>
    shuffle(elements.filter((e) => e.interactive).map((e) => e.id)),
  );
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [distances, setDistances] = useState<ReadonlyArray<number>>([]);
  const [elementStates, setElementStates] = useState<Readonly<Record<string, ElementVisualState>>>(() => {
    const states: Record<string, ElementVisualState> = {};
    for (const element of elements) {
      // Interactive elements (quiz targets) start hidden — showing their
      // positions would give away the answers. Non-interactive elements
      // (decorative) start revealed.
      states[element.id] = element.interactive ? 'hidden' : 'context';
    }
    return states;
  });
  const [feedbackItems, setFeedbackItems] = useState<ReadonlyArray<LocateFeedbackItem>>([]);
  const feedbackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up timers on unmount
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

  const correctCount = distances.filter((d) => isLocateAnswerCorrect(d)).length;
  const totalScore = distances.reduce(
    (sum, d) => sum + calculateLocateAnswerScore(d),
    0,
  );
  const averageDistance =
    distances.length > 0
      ? distances.reduce((sum, d) => sum + d, 0) / distances.length
      : 0;

  const scheduleFeedbackRemoval = useCallback((feedbackId: string) => {
    const timer = setTimeout(() => {
      setFeedbackItems((prev) => prev.filter((item) => item.id !== feedbackId));
      feedbackTimersRef.current.delete(feedbackId);
    }, FEEDBACK_DURATION_MS);
    feedbackTimersRef.current.set(feedbackId, timer);
  }, []);

  const computeDistance = useCallback(
    (clickPosition: ViewBoxPosition, targetElement: VisualizationElement): number => {
      if (isMapElement(targetElement)) {
        const clickLat = -clickPosition.y;
        const clickLng = clickPosition.x;
        return calculateGreatCircleDistance(
          clickLat,
          clickLng,
          targetElement.geoCoordinates.latitude,
          targetElement.geoCoordinates.longitude,
        );
      }
      // Fallback for non-map elements: viewBox distance (not meaningful for scoring)
      const dx = clickPosition.x - targetElement.viewBoxCenter.x;
      const dy = clickPosition.y - targetElement.viewBoxCenter.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    [],
  );

  const handlePositionClick = useCallback(
    (position: ViewBoxPosition) => {
      if (isFinished || !currentTarget) return;

      const distanceKm = computeDistance(position, currentTarget);
      const score = calculateLocateAnswerScore(distanceKm);
      const isCorrect = isLocateAnswerCorrect(distanceKm);

      const feedbackId = `feedback-${currentTargetIndex}`;
      const feedbackItem: LocateFeedbackItem = {
        id: feedbackId,
        elementId: currentTarget.id,
        clickPosition: position,
        targetPosition: currentTarget.viewBoxCenter,
        distanceKm,
        score,
        createdAt: Date.now(),
      };

      setDistances((prev) => [...prev, distanceKm]);
      setFeedbackItems((prev) => [...prev, feedbackItem]);
      scheduleFeedbackRemoval(feedbackId);

      setElementStates((prev) => ({
        ...prev,
        [currentTarget.id]: isCorrect ? 'correct' : 'incorrect',
      }));

      setCurrentTargetIndex((prev) => prev + 1);
    },
    [isFinished, currentTarget, currentTargetIndex, computeDistance, scheduleFeedbackRemoval],
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
    totalScore,
    distances,
    elementStates,
    feedbackItems,
    isFinished,
    averageDistance,
    handlePositionClick,
    handleSkip,
    handleGiveUp,
  };
}
