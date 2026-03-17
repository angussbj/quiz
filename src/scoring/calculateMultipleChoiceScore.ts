import type { ScoreResult } from './ScoreResult';
import { calculateScore } from './calculateScore';

/** Calculate score for multiple choice mode. Binary: each answer is correct or not. */
export function calculateMultipleChoiceScore(
  correct: number,
  total: number,
): ScoreResult {
  return calculateScore(correct, total);
}
