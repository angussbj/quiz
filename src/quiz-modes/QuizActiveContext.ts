import { createContext, useContext } from 'react';

interface QuizActiveState {
  readonly isActive: boolean;
  readonly onReconfigure: () => void;
}

const defaultState: QuizActiveState = {
  isActive: false,
  onReconfigure: () => {},
};

export const QuizActiveContext = createContext<QuizActiveState>(defaultState);

export function useQuizActiveState(): QuizActiveState {
  return useContext(QuizActiveContext);
}
