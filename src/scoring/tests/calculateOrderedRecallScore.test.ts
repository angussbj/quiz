import { calculateOrderedRecallScore } from '../calculateOrderedRecallScore';
import type { HintLevel } from '../ScoreResult';

describe('calculateOrderedRecallScore', () => {
  it('scores all correct when no hints used', () => {
    const result = calculateOrderedRecallScore(['none', 'none', 'none'], 3);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(3);
    expect(result.percentage).toBe(100);
    expect(result.details).toEqual({
      kind: 'ordered-recall',
      hintsUsed: 0,
      correctWithoutHints: 3,
      answerHintLevels: ['none', 'none', 'none'],
    });
  });

  it('does not count partial hints as correct', () => {
    const result = calculateOrderedRecallScore(['none', 'partial', 'none'], 3);
    expect(result.correct).toBe(2);
    expect(result.percentage).toBe(67);
    expect(result.details?.kind).toBe('ordered-recall');
    if (result.details?.kind === 'ordered-recall') {
      expect(result.details.hintsUsed).toBe(1);
      expect(result.details.correctWithoutHints).toBe(2);
    }
  });

  it('does not count full hints as correct', () => {
    const result = calculateOrderedRecallScore(['full', 'full', 'full'], 3);
    expect(result.correct).toBe(0);
    expect(result.percentage).toBe(0);
    if (result.details?.kind === 'ordered-recall') {
      expect(result.details.hintsUsed).toBe(3);
    }
  });

  it('handles mixed hint levels', () => {
    const levels: ReadonlyArray<HintLevel> = [
      'none',
      'partial',
      'full',
      'none',
      'none',
    ];
    const result = calculateOrderedRecallScore(levels, 5);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(5);
    expect(result.percentage).toBe(60);
    if (result.details?.kind === 'ordered-recall') {
      expect(result.details.hintsUsed).toBe(2);
      expect(result.details.correctWithoutHints).toBe(3);
      expect(result.details.answerHintLevels).toEqual(levels);
    }
  });

  it('handles total greater than answers given (gave up early)', () => {
    const result = calculateOrderedRecallScore(['none', 'none'], 10);
    expect(result.correct).toBe(2);
    expect(result.total).toBe(10);
    expect(result.percentage).toBe(20);
  });

  it('handles empty answers', () => {
    const result = calculateOrderedRecallScore([], 5);
    expect(result.correct).toBe(0);
    expect(result.total).toBe(5);
    expect(result.percentage).toBe(0);
  });

  it('handles zero total', () => {
    const result = calculateOrderedRecallScore([], 0);
    expect(result.correct).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('preserves hint level ordering in details', () => {
    const levels: ReadonlyArray<HintLevel> = ['full', 'none', 'partial', 'none'];
    const result = calculateOrderedRecallScore(levels, 4);
    if (result.details?.kind === 'ordered-recall') {
      expect(result.details.answerHintLevels).toEqual(['full', 'none', 'partial', 'none']);
    }
  });
});
