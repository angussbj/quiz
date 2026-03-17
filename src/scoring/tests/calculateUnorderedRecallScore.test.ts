import { calculateUnorderedRecallScore } from '../calculateUnorderedRecallScore';

describe('calculateUnorderedRecallScore', () => {
  it('counts correct with no penalty', () => {
    const result = calculateUnorderedRecallScore(7, 50);
    expect(result.correct).toBe(7);
    expect(result.total).toBe(50);
    expect(result.percentage).toBe(14);
  });

  it('returns 100% for perfect score', () => {
    expect(calculateUnorderedRecallScore(50, 50).percentage).toBe(100);
  });

  it('returns 0% for no correct answers', () => {
    expect(calculateUnorderedRecallScore(0, 50).percentage).toBe(0);
  });

  it('handles zero total', () => {
    const result = calculateUnorderedRecallScore(0, 0);
    expect(result.percentage).toBe(0);
  });

  it('does not include details', () => {
    expect(calculateUnorderedRecallScore(5, 10).details).toBeUndefined();
  });
});
