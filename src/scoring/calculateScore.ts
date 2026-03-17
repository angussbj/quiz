import type { ScoreResult } from './ScoreResult';

/** Calculate score from correct/total counts. Placeholder. */
export function calculateScore(correct: number, total: number): ScoreResult {
  return {
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}
