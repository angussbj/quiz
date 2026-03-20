import { useEffect, useState } from 'react';
import { fetchQuizData } from '@/quiz-definitions/fetchQuizData';
import type { LakePath } from '../VisualizationRendererProps';
import { parseLakePaths } from './loadLakePaths';
import { WRAP_LONGITUDE } from './projectGeo';

/**
 * Fetch and parse lake CSV into LakePath[] for map rendering.
 * Returns undefined while loading, empty array on error.
 */
export function useLakePaths(
  dataPath: string | undefined,
): ReadonlyArray<LakePath> | undefined {
  const [paths, setPaths] = useState<ReadonlyArray<LakePath> | undefined>(undefined);

  useEffect(() => {
    if (!dataPath) {
      setPaths(undefined);
      return;
    }
    let cancelled = false;
    fetchQuizData(dataPath)
      .then((rows) => {
        if (!cancelled) setPaths(parseLakePaths(rows, WRAP_LONGITUDE));
      })
      .catch(() => {
        if (!cancelled) setPaths([]);
      });
    return () => { cancelled = true; };
  }, [dataPath]);

  return paths;
}
