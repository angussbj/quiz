import {
  calculateLocateAnswerScore,
  isLocateAnswerCorrect,
} from '../calculateLocateAnswerScore';

describe('calculateLocateAnswerScore', () => {
  it('returns 1 for distance of 0', () => {
    expect(calculateLocateAnswerScore(0)).toBe(1);
  });

  it('returns 1 at exactly 50km', () => {
    expect(calculateLocateAnswerScore(50)).toBe(1);
  });

  it('returns 1 for distances under 50km', () => {
    expect(calculateLocateAnswerScore(25)).toBe(1);
    expect(calculateLocateAnswerScore(49.9)).toBe(1);
  });

  it('returns 0 at exactly 500km', () => {
    expect(calculateLocateAnswerScore(500)).toBe(0);
  });

  it('returns 0 for distances over 500km', () => {
    expect(calculateLocateAnswerScore(1000)).toBe(0);
    expect(calculateLocateAnswerScore(10000)).toBe(0);
  });

  it('returns 0.5 at 275km (midpoint of linear decay)', () => {
    expect(calculateLocateAnswerScore(275)).toBe(0.5);
  });

  it('decays linearly between 50km and 500km', () => {
    const at100 = calculateLocateAnswerScore(100);
    const at200 = calculateLocateAnswerScore(200);
    const at300 = calculateLocateAnswerScore(300);

    // Linear: equal steps in distance should produce equal steps in score
    expect(at100 - at200).toBeCloseTo(at200 - at300, 10);
  });

  it('returns expected values at specific distances', () => {
    // 50km -> 1.0, 500km -> 0.0, range = 450km
    expect(calculateLocateAnswerScore(95)).toBeCloseTo(0.9, 1);
    expect(calculateLocateAnswerScore(140)).toBeCloseTo(0.8, 1);
    expect(calculateLocateAnswerScore(275)).toBeCloseTo(0.5, 1);
    expect(calculateLocateAnswerScore(455)).toBeCloseTo(0.1, 1);
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

  it('returns true at exactly 50km', () => {
    expect(isLocateAnswerCorrect(50)).toBe(true);
  });

  it('returns false at 51km', () => {
    expect(isLocateAnswerCorrect(51)).toBe(false);
  });

  it('returns false at 500km', () => {
    expect(isLocateAnswerCorrect(500)).toBe(false);
  });
});
