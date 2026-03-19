import {
  truncateToPrecision,
  needsRangeAnswer,
  scorePointAnswer,
  scoreRangeAnswer,
  isTimelineAnswerCorrect,
} from '../calculateTimelineLocateScore';
import type { TimelineTimestamp } from '@/visualizations/timeline/TimelineTimestamp';

describe('truncateToPrecision', () => {
  const full: TimelineTimestamp = [1944, 6, 6];

  it('truncates to year', () => {
    expect(truncateToPrecision(full, 'year')).toEqual([1944]);
  });

  it('truncates to month', () => {
    expect(truncateToPrecision(full, 'month')).toEqual([1944, 6]);
  });

  it('keeps day for day precision', () => {
    expect(truncateToPrecision(full, 'day')).toEqual([1944, 6, 6]);
  });

  it('handles year-only timestamp at month precision', () => {
    expect(truncateToPrecision([1944], 'month')).toEqual([1944]);
  });
});

describe('needsRangeAnswer', () => {
  it('returns false for single-day events', () => {
    expect(needsRangeAnswer([1944, 6, 6], undefined, 'day')).toBe(false);
  });

  it('returns false when start and end are in the same month at month precision', () => {
    expect(needsRangeAnswer([1944, 6, 4], [1944, 6, 7], 'month')).toBe(false);
  });

  it('returns true when start and end span different months at month precision', () => {
    expect(needsRangeAnswer([1942, 8, 23], [1943, 2, 2], 'month')).toBe(true);
  });

  it('returns true when start and end span different years at year precision', () => {
    expect(needsRangeAnswer([1940, 9, 7], [1941, 5, 11], 'year')).toBe(true);
  });

  it('returns false when start and end are same year at year precision', () => {
    expect(needsRangeAnswer([1943, 7, 5], [1943, 8, 23], 'year')).toBe(false);
  });
});

describe('scorePointAnswer', () => {
  it('gives full marks for exact match', () => {
    const score = scorePointAnswer([1944, 6], [1944, 6, 6], undefined, 'month');
    expect(score).toBe(1);
  });

  it('gives full marks when answer is within event range', () => {
    const score = scorePointAnswer([1942, 10], [1942, 8, 23], [1943, 2, 2], 'month');
    expect(score).toBe(1);
  });

  it('gives partial score for close answer', () => {
    const score = scorePointAnswer([1944, 7], [1944, 6, 6], undefined, 'month');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('gives zero for far-off answer', () => {
    const score = scorePointAnswer([1940], [1944, 6, 6], undefined, 'year');
    expect(score).toBe(0);
  });
});

describe('scoreRangeAnswer', () => {
  it('gives full marks for exact range match', () => {
    const score = scoreRangeAnswer(
      [1942, 8], [1943, 2],
      [1942, 8, 23], [1943, 2, 2],
      'month',
    );
    expect(score).toBe(1);
  });

  it('gives partial score for close range', () => {
    const score = scoreRangeAnswer(
      [1942, 9], [1943, 3],
      [1942, 8, 23], [1943, 2, 2],
      'month',
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('isTimelineAnswerCorrect', () => {
  it('returns true for score >= 0.5', () => {
    expect(isTimelineAnswerCorrect(0.5)).toBe(true);
    expect(isTimelineAnswerCorrect(1)).toBe(true);
  });

  it('returns false for score < 0.5', () => {
    expect(isTimelineAnswerCorrect(0.49)).toBe(false);
    expect(isTimelineAnswerCorrect(0)).toBe(false);
  });
});
