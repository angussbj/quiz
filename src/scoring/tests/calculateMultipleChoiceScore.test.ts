import { calculateMultipleChoiceScore } from '../calculateMultipleChoiceScore';

describe('calculateMultipleChoiceScore', () => {
  it('scores binary correct/total', () => {
    const result = calculateMultipleChoiceScore(3, 5);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(5);
    expect(result.percentage).toBe(60);
  });

  it('returns 100% for perfect score', () => {
    expect(calculateMultipleChoiceScore(10, 10).percentage).toBe(100);
  });

  it('returns 0% for no correct answers', () => {
    expect(calculateMultipleChoiceScore(0, 8).percentage).toBe(0);
  });

  it('handles zero total', () => {
    const result = calculateMultipleChoiceScore(0, 0);
    expect(result.percentage).toBe(0);
  });
});
