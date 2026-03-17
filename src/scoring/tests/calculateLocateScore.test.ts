import { calculateLocateScore } from '../calculateLocateScore';

describe('calculateLocateScore', () => {
  it('counts answers within 50km as correct', () => {
    const result = calculateLocateScore([10, 20, 30, 200, 600], 5);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(5);
    expect(result.percentage).toBe(60);
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

  it('handles all answers within 50km', () => {
    const result = calculateLocateScore([10, 20, 30, 40, 50], 5);
    expect(result.correct).toBe(5);
    expect(result.percentage).toBe(100);
  });

  it('handles all answers beyond 50km', () => {
    const result = calculateLocateScore([100, 200, 600], 3);
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

  it('handles exactly 50km as correct', () => {
    const result = calculateLocateScore([50], 1);
    expect(result.correct).toBe(1);
  });

  it('handles 51km as not correct', () => {
    const result = calculateLocateScore([51], 1);
    expect(result.correct).toBe(0);
  });
});
