import { useLocalStorage } from './useLocalStorage';
import type { QuizSetupState } from './QuizSetupState';

/**
 * Per-quiz localStorage persistence for setup panel state.
 * Key: `quizzical:setup:${quizId}`
 */
export function useQuizSetupPersistence(
  quizId: string,
  defaultState: QuizSetupState,
): {
  readonly setupState: QuizSetupState;
  readonly setSetupState: (stateOrUpdater: QuizSetupState | ((prev: QuizSetupState) => QuizSetupState)) => void;
} {
  const key = `quizzical:setup:${quizId}`;
  const { value, set } = useLocalStorage<QuizSetupState>(key, defaultState);
  return { setupState: value, setSetupState: set };
}
