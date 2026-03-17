import type { ScoreResult } from './ScoreResult';
import { isLocateAnswerCorrect } from './calculateLocateAnswerScore';

/**
 * Aggregate locate mode results into a ScoreResult with LocateScoreDetails.
 * Takes the list of per-answer distances in km.
 */
export function calculateLocateScore(
  distances: ReadonlyArray<number>,
  total: number,
): ScoreResult {
  const correct = distances.filter((d) => isLocateAnswerCorrect(d)).length;
  const averageDistance =
    distances.length > 0
      ? distances.reduce((sum, d) => sum + d, 0) / distances.length
      : 0;

  return {
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
    details: {
      kind: 'locate',
      averageDistance,
      distances,
    },
  };
}
