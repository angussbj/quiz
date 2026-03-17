import type { ScoreResult } from './ScoreResult';

/** Calculate score from correct/total counts. Used by binary answer types (identify, multiple choice, unordered recall). */
export function calculateScore(correct: number, total: number): ScoreResult {
  return {
    correct,
    total,
    percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}
