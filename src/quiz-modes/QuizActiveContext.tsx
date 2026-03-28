import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface QuizActiveState {
  readonly isActive: boolean;
  readonly onReconfigure: () => void;
}

interface QuizActiveContextValue {
  readonly state: QuizActiveState;
  readonly setQuizActive: (onReconfigure: () => void) => void;
  readonly clearQuizActive: () => void;
}

const defaultState: QuizActiveState = {
  isActive: false,
  onReconfigure: () => {},
};

const QuizActiveContext = createContext<QuizActiveContextValue>({
  state: defaultState,
  setQuizActive: () => {},
  clearQuizActive: () => {},
});

export function useQuizActiveState(): QuizActiveState {
  return useContext(QuizActiveContext).state;
}

export function useQuizActiveRegister(): {
  readonly setQuizActive: (onReconfigure: () => void) => void;
  readonly clearQuizActive: () => void;
} {
  const { setQuizActive, clearQuizActive } = useContext(QuizActiveContext);
  return { setQuizActive, clearQuizActive };
}

export function QuizActiveProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<QuizActiveState>(defaultState);

  const setQuizActive = useCallback((onReconfigure: () => void) => {
    setState({ isActive: true, onReconfigure });
  }, []);

  const clearQuizActive = useCallback(() => {
    setState(defaultState);
  }, []);

  const value = useMemo(() => ({
    state,
    setQuizActive,
    clearQuizActive,
  }), [state, setQuizActive, clearQuizActive]);

  return (
    <QuizActiveContext.Provider value={value}>
      {children}
    </QuizActiveContext.Provider>
  );
}
