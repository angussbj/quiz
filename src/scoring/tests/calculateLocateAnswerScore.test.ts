import {
  calculateLocateAnswerScore,
  isLocateAnswerCorrect,
} from '../calculateLocateAnswerScore';

describe('calculateLocateAnswerScore', () => {
  it('returns 1 for distance of 0', () => {
    expect(calculateLocateAnswerScore(0)).toBe(1);
  });

  it('returns 1 at exactly 100km', () => {
    expect(calculateLocateAnswerScore(100)).toBe(1);
  });

  it('returns 1 for distances under 100km', () => {
    expect(calculateLocateAnswerScore(50)).toBe(1);
    expect(calculateLocateAnswerScore(99.9)).toBe(1);
  });

  it('returns 0 at exactly 500km', () => {
    expect(calculateLocateAnswerScore(500)).toBe(0);
  });

  it('returns 0 for distances over 500km', () => {
    expect(calculateLocateAnswerScore(1000)).toBe(0);
    expect(calculateLocateAnswerScore(10000)).toBe(0);
  });

  it('returns 0.5 at 300km (midpoint of linear decay)', () => {
    expect(calculateLocateAnswerScore(300)).toBe(0.5);
  });

  it('decays linearly between 100km and 500km', () => {
    const at150 = calculateLocateAnswerScore(150);
    const at250 = calculateLocateAnswerScore(250);
    const at350 = calculateLocateAnswerScore(350);

    // Linear: equal steps in distance should produce equal steps in score
    expect(at150 - at250).toBeCloseTo(at250 - at350, 10);
  });

  it('returns expected values at specific distances', () => {
    // 100km -> 1.0, 500km -> 0.0, range = 400km
    expect(calculateLocateAnswerScore(140)).toBeCloseTo(0.9, 1);
    expect(calculateLocateAnswerScore(300)).toBeCloseTo(0.5, 1);
    expect(calculateLocateAnswerScore(460)).toBeCloseTo(0.1, 1);
  });

  it('never returns negative values', () => {
    expect(calculateLocateAnswerScore(999999)).toBe(0);
  });

  it('never returns values above 1', () => {
    expect(calculateLocateAnswerScore(-10)).toBe(1);
  });
});

describe('isLocateAnswerCorrect', () => {
  it('returns true at 0km', () => {
    expect(isLocateAnswerCorrect(0)).toBe(true);
  });

  it('returns true at exactly 100km', () => {
    expect(isLocateAnswerCorrect(100)).toBe(true);
  });

  it('returns false at 101km', () => {
    expect(isLocateAnswerCorrect(101)).toBe(false);
  });

  it('returns false at 500km', () => {
    expect(isLocateAnswerCorrect(500)).toBe(false);
  });
});
