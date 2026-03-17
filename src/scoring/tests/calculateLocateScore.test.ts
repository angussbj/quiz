import { calculateLocateScore } from '../calculateLocateScore';

describe('calculateLocateScore', () => {
  it('counts answers within 100km as correct', () => {
    const result = calculateLocateScore([10, 20, 30, 200, 600], 5);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(5);
    // Percentage reflects partial credit: mean of [1, 1, 1, 0.75, 0] = 75%
    expect(result.percentage).toBe(75);
  });

  it('includes locate details with distances and average', () => {
    const distances = [100, 200, 300];
    const result = calculateLocateScore(distances, 3);
    expect(result.details).toEqual({
      kind: 'locate',
      averageDistance: 200,
      distances: [100, 200, 300],
    });
  });

  it('handles all answers within 100km', () => {
    const result = calculateLocateScore([10, 20, 30, 40, 100], 5);
    expect(result.correct).toBe(5);
    expect(result.percentage).toBe(100);
  });

  it('handles all answers beyond 100km with partial credit', () => {
    const result = calculateLocateScore([150, 200, 600], 3);
    expect(result.correct).toBe(0);
    // Partial credit: mean of [0.875, 0.75, 0] = 54%
    expect(result.percentage).toBe(54);
  });

  it('handles all answers beyond 500km as 0%', () => {
    const result = calculateLocateScore([600, 700, 800], 3);
    expect(result.correct).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('handles empty distances with remaining total (gave up early)', () => {
    const result = calculateLocateScore([], 10);
    expect(result.correct).toBe(0);
    expect(result.total).toBe(10);
    expect(result.percentage).toBe(0);
    expect(result.details).toEqual({
      kind: 'locate',
      averageDistance: 0,
      distances: [],
    });
  });

  it('calculates correct average distance', () => {
    const result = calculateLocateScore([0, 100, 500], 3);
    if (result.details?.kind === 'locate') {
      expect(result.details.averageDistance).toBe(200);
    }
  });

  it('handles exactly 100km as correct', () => {
    const result = calculateLocateScore([100], 1);
    expect(result.correct).toBe(1);
  });

  it('handles 101km as not correct', () => {
    const result = calculateLocateScore([101], 1);
    expect(result.correct).toBe(0);
  });
});
