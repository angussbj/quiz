import { useEffect, useState } from 'react';
import { fetchQuizData } from './fetchQuizData';

interface QuizDataIdle {
  readonly status: 'idle';
}

interface QuizDataLoading {
  readonly status: 'loading';
}

interface QuizDataLoaded {
  readonly status: 'loaded';
  readonly rows: ReadonlyArray<Readonly<Record<string, string>>>;
}

interface QuizDataError {
  readonly status: 'error';
  readonly error: string;
}

export type QuizDataState = QuizDataIdle | QuizDataLoading | QuizDataLoaded | QuizDataError;

/**
 * Lazily fetch and parse quiz CSV data when a dataPath is provided.
 * Returns a discriminated union so the consumer can render loading/error/loaded states.
 */
export function useQuizData(dataPath: string | undefined): QuizDataState {
  const [state, setState] = useState<QuizDataState>({ status: 'idle' });

  useEffect(() => {
    if (!dataPath) {
      setState({ status: 'idle' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    fetchQuizData(dataPath)
      .then((rows) => {
        if (!cancelled) {
          setState({ status: 'loaded', rows });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error loading quiz data';
          setState({ status: 'error', error: message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dataPath]);

  return state;
}
