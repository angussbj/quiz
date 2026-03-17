import type { ScoreResult } from './ScoreResult';
import { calculateScore } from './calculateScore';

/** Calculate score for identify mode. Binary: each answer is correct or not. */
export function calculateIdentifyScore(
  correct: number,
  total: number,
): ScoreResult {
  return calculateScore(correct, total);
}
