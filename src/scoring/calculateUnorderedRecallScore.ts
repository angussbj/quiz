import type { ScoreResult } from './ScoreResult';
import { calculateScore } from './calculateScore';

/** Calculate score for unordered recall mode. Count correct, no penalty. */
export function calculateUnorderedRecallScore(
  correct: number,
  total: number,
): ScoreResult {
  return calculateScore(correct, total);
}
