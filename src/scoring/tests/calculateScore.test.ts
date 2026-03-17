import { calculateScore } from '../calculateScore';

describe('calculateScore', () => {
  it('calculates percentage from correct and total', () => {
    const result = calculateScore(7, 10);
    expect(result.correct).toBe(7);
    expect(result.total).toBe(10);
    expect(result.percentage).toBe(70);
  });

  it('returns 100% for perfect score', () => {
    expect(calculateScore(50, 50).percentage).toBe(100);
  });

  it('returns 0% for zero correct', () => {
    expect(calculateScore(0, 10).percentage).toBe(0);
  });

  it('returns 0% for zero total', () => {
    expect(calculateScore(0, 0).percentage).toBe(0);
  });

  it('rounds percentage to nearest integer', () => {
    // 1/3 = 33.33...%
    expect(calculateScore(1, 3).percentage).toBe(33);
    // 2/3 = 66.66...%
    expect(calculateScore(2, 3).percentage).toBe(67);
  });

  it('does not include details', () => {
    expect(calculateScore(5, 10).details).toBeUndefined();
  });
});
