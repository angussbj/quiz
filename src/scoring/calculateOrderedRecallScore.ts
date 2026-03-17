import type { HintLevel, ScoreResult } from './ScoreResult';

/**
 * Calculate the score for an ordered recall quiz. Only answers with no hints
 * count as correct. The hint level per answer is preserved in the details for
 * visualization (green/yellow/red).
 */
export function calculateOrderedRecallScore(
  answerHintLevels: ReadonlyArray<HintLevel>,
  total: number,
): ScoreResult {
  const correctWithoutHints = answerHintLevels.filter(
    (level) => level === 'none',
  ).length;
  const hintsUsed = answerHintLevels.filter(
    (level) => level !== 'none',
  ).length;

  return {
    correct: correctWithoutHints,
    total,
    percentage: total > 0 ? Math.round((correctWithoutHints / total) * 100) : 0,
    details: {
      kind: 'ordered-recall',
      hintsUsed,
      correctWithoutHints,
      answerHintLevels,
    },
  };
}
