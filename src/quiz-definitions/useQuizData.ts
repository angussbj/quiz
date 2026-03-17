import { useEffect, useState } from 'react';
import { fetchQuizData } from './fetchQuizData';
import type { DataFilter } from './QuizDefinition';
import { applyDataFilter } from './applyDataFilter';

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
 * Optionally filters rows by a column value (e.g., region) using DataFilter.
 * Returns a discriminated union so the consumer can render loading/error/loaded states.
 */
export function useQuizData(
  dataPath: string | undefined,
  dataFilter?: DataFilter,
): QuizDataState {
  const filterKey = dataFilter ? `${dataFilter.column}:${dataFilter.values.join(',')}` : '';
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
          const filtered = dataFilter ? applyDataFilter(rows, dataFilter) : rows;
          setState({ status: 'loaded', rows: filtered });
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
  }, [dataPath, filterKey]);

  return state;
}
