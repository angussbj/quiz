import { useEffect, useState } from 'react';
import { fetchQuizData } from '@/quiz-definitions/fetchQuizData';
import type { BackgroundPath } from '../VisualizationRendererProps';
import { parseBackgroundPaths } from './loadBackgroundPaths';

/**
 * Fetch and parse supporting data CSV into BackgroundPath[] for map borders.
 * Returns undefined while loading, empty array on error.
 */
export function useBackgroundPaths(
  dataPath: string | undefined,
): ReadonlyArray<BackgroundPath> | undefined {
  const [paths, setPaths] = useState<ReadonlyArray<BackgroundPath> | undefined>(undefined);

  useEffect(() => {
    if (!dataPath) {
      setPaths(undefined);
      return;
    }
    let cancelled = false;
    fetchQuizData(dataPath)
      .then((rows) => {
        if (!cancelled) setPaths(parseBackgroundPaths(rows));
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      });
    return () => { cancelled = true; };
  }, [dataPath]);

  return paths;
}
