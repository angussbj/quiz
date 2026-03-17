import { useCallback, useMemo } from 'react';
import type { QuizAttempt, QuizProgress } from './QuizProgress';
import { useLocalStorage } from './useLocalStorage';

interface UseQuizProgressResult {
  readonly progress: QuizProgress | null;
  readonly loading: boolean;
  readonly addAttempt: (attempt: QuizAttempt) => void;
  readonly reset: () => void;
}

const NO_PROGRESS = null;

/**
 * Convenience hook for reading/writing quiz progress.
 * Wraps useLocalStorage with a typed key and helpers.
 *
 * Usage:
 *   const { progress, loading, addAttempt, reset } = useQuizProgress('europe-capitals');
 */
export function useQuizProgress(quizId: string): UseQuizProgressResult {
  const storageKey = `progress:${quizId}`;
  const { value, loading, set } = useLocalStorage<QuizProgress | null>(storageKey, NO_PROGRESS);

  const addAttempt = useCallback(
    (attempt: QuizAttempt) => {
      const current = value ?? {
        quizId,
        attempts: [],
        bestScore: attempt.score,
      };
      const newAttempts = [...current.attempts, attempt];
      const bestScore =
        attempt.score.percentage > current.bestScore.percentage
          ? attempt.score
          : current.bestScore;
      set({ quizId, attempts: newAttempts, bestScore });
    },
    [value, quizId, set],
  );

  const reset = useCallback(() => {
    set(NO_PROGRESS);
  }, [set]);

  return useMemo(
    () => ({ progress: value, loading, addAttempt, reset }),
    [value, loading, addAttempt, reset],
  );
}
