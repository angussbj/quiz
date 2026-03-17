import {
  timestampToFractionalYear,
  formatTimestamp,
  formatTimestampRange,
} from '../TimelineTimestamp';
import type { TimelineTimestamp } from '../TimelineTimestamp';

describe('timestampToFractionalYear', () => {
  describe('year-only precision', () => {
    it('rounds start to beginning of year', () => {
      expect(timestampToFractionalYear([1920], false)).toBe(1920);
    });

    it('rounds end to beginning of next year', () => {
      expect(timestampToFractionalYear([1920], true)).toBe(1921);
    });
  });

  describe('year-month precision', () => {
    it('rounds start to beginning of month', () => {
      const result = timestampToFractionalYear([2000, 1], false);
      expect(result).toBe(2000);
    });

    it('July start is approximately mid-year', () => {
      const result = timestampToFractionalYear([2000, 7], false);
      expect(result).toBeGreaterThan(2000.49);
      expect(result).toBeLessThan(2000.51);
    });

    it('rounds end to end of month', () => {
      const result = timestampToFractionalYear([2000, 1], true);
      // End of January = day 31 out of 366 (2000 is a leap year)
      expect(result).toBeCloseTo(2000 + 31 / 366, 4);
    });

    it('handles February in a leap year', () => {
      const result = timestampToFractionalYear([2000, 2], true);
      // End of Feb in leap year = day 60 out of 366
      expect(result).toBeCloseTo(2000 + 60 / 366, 4);
    });

    it('handles February in a non-leap year', () => {
      const result = timestampToFractionalYear([2001, 2], true);
      // End of Feb in non-leap year = day 59 out of 365
      expect(result).toBeCloseTo(2001 + 59 / 365, 4);
    });
  });

  describe('year-month-day precision', () => {
    it('rounds start to beginning of day', () => {
      const result = timestampToFractionalYear([2000, 1, 1], false);
      expect(result).toBe(2000);
    });

    it('rounds end to end of day', () => {
      const result = timestampToFractionalYear([2000, 1, 1], true);
      expect(result).toBeCloseTo(2000 + 1 / 366, 4);
    });
  });

  describe('ordering', () => {
    it('start is always before end for same timestamp', () => {
      const timestamps: ReadonlyArray<TimelineTimestamp> = [
        [1920],
        [1920, 6],
        [1920, 6, 15],
        [1920, 6, 15, 12],
        [1920, 6, 15, 12, 30],
        [1920, 6, 15, 12, 30, 45],
      ];
      for (const ts of timestamps) {
        expect(timestampToFractionalYear(ts, false))
          .toBeLessThan(timestampToFractionalYear(ts, true));
      }
    });

    it('later months produce later fractional years', () => {
      for (let m = 1; m < 12; m++) {
        const earlier = timestampToFractionalYear([2000, m], false);
        const later = timestampToFractionalYear([2000, m + 1], false);
        expect(later).toBeGreaterThan(earlier);
      }
    });
  });

  describe('mixed precision range from spec', () => {
    it('handles the spec example: 1920 to June 1922', () => {
      const start = timestampToFractionalYear([1920], false);
      const end = timestampToFractionalYear([1922, 6], true);
      expect(start).toBe(1920);
      // End of June 1922 (non-leap year)
      // Jan(31) + Feb(28) + Mar(31) + Apr(30) + May(31) + Jun(30) = 181
      expect(end).toBeCloseTo(1922 + 181 / 365, 4);
    });
  });
});

describe('formatTimestamp', () => {
  it('formats year only', () => {
    expect(formatTimestamp([1920])).toBe('1920');
  });

  it('formats year and month', () => {
    expect(formatTimestamp([1920, 6])).toBe('June 1920');
  });

  it('formats short month', () => {
    expect(formatTimestamp([1920, 6], true)).toBe('Jun 1920');
  });

  it('formats full date', () => {
    expect(formatTimestamp([1920, 6, 15])).toBe('15 June 1920');
  });

  it('formats with hours', () => {
    expect(formatTimestamp([1920, 6, 15, 9])).toBe('15 June 1920, 09:00');
  });

  it('formats with minutes', () => {
    expect(formatTimestamp([1920, 6, 15, 9, 30])).toBe('15 June 1920, 09:30');
  });

  it('formats with seconds', () => {
    expect(formatTimestamp([1920, 6, 15, 9, 30, 5])).toBe('15 June 1920, 09:30:05');
  });
});

describe('formatTimestampRange', () => {
  it('formats a range', () => {
    expect(formatTimestampRange([1920], [1922, 6])).toBe('1920 \u2013 June 1922');
  });

  it('formats point event (no end)', () => {
    expect(formatTimestampRange([1969, 7, 20])).toBe('20 July 1969');
  });
});
