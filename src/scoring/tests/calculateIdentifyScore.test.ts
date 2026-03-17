import { calculateIdentifyScore } from '../calculateIdentifyScore';

describe('calculateIdentifyScore', () => {
  it('scores binary correct/total', () => {
    const result = calculateIdentifyScore(8, 10);
    expect(result.correct).toBe(8);
    expect(result.total).toBe(10);
    expect(result.percentage).toBe(80);
  });

  it('returns 100% for perfect score', () => {
    expect(calculateIdentifyScore(20, 20).percentage).toBe(100);
  });

  it('returns 0% for no correct answers', () => {
    expect(calculateIdentifyScore(0, 15).percentage).toBe(0);
  });

  it('handles zero total', () => {
    const result = calculateIdentifyScore(0, 0);
    expect(result.percentage).toBe(0);
  });

  it('does not include details', () => {
    expect(calculateIdentifyScore(5, 10).details).toBeUndefined();
  });
});
