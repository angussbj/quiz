import type { ScoreResult } from './ScoreResult';
import {
  calculateLocateAnswerScore,
  isLocateAnswerCorrect,
} from './calculateLocateAnswerScore';

/**
 * Aggregate locate mode results into a ScoreResult with LocateScoreDetails.
 * Takes the list of per-answer distances in km.
 *
 * Percentage reflects partial credit: the mean of all individual 0–1 scores × 100.
 * The `correct` count uses the binary threshold for "X/50" display.
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

  const meanScore =
    total > 0
      ? distances.reduce((sum, d) => sum + calculateLocateAnswerScore(d), 0) /
        total
      : 0;

  return {
    correct,
    total,
    percentage: Math.round(meanScore * 100),
    details: {
      kind: 'locate',
      averageDistance,
      distances,
    },
  };
}
