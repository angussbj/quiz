import { parseDateInput } from '../parseDateInput';

describe('parseDateInput', () => {
  describe('year only', () => {
    it('parses a 4-digit year', () => {
      expect(parseDateInput('1944')).toEqual([1944]);
    });

    it('returns undefined for invalid year', () => {
      expect(parseDateInput('0')).toBeUndefined();
      expect(parseDateInput('abc')).toBeUndefined();
    });
  });

  describe('month and year', () => {
    it('parses "Jun 1944"', () => {
      expect(parseDateInput('Jun 1944')).toEqual([1944, 6]);
    });

    it('parses "June 1944"', () => {
      expect(parseDateInput('June 1944')).toEqual([1944, 6]);
    });

    it('parses "December 1941"', () => {
      expect(parseDateInput('December 1941')).toEqual([1941, 12]);
    });

    it('parses numeric month/year "6/1944"', () => {
      expect(parseDateInput('6/1944')).toEqual([1944, 6]);
    });
  });

  describe('full date with month name', () => {
    it('parses "6 Jun 1944" (day month year)', () => {
      expect(parseDateInput('6 Jun 1944')).toEqual([1944, 6, 6]);
    });

    it('parses "6 June 1944"', () => {
      expect(parseDateInput('6 June 1944')).toEqual([1944, 6, 6]);
    });

    it('parses "June 6 1944" (month day year)', () => {
      expect(parseDateInput('June 6 1944')).toEqual([1944, 6, 6]);
    });

    it('parses "Dec 7 1941"', () => {
      expect(parseDateInput('Dec 7 1941')).toEqual([1941, 12, 7]);
    });
  });

  describe('numeric formats', () => {
    it('parses "6/6/1944" (M/D/Y)', () => {
      expect(parseDateInput('6/6/1944')).toEqual([1944, 6, 6]);
    });

    it('parses "06/06/1944"', () => {
      expect(parseDateInput('06/06/1944')).toEqual([1944, 6, 6]);
    });

    it('parses "12/7/1941"', () => {
      expect(parseDateInput('12/7/1941')).toEqual([1941, 12, 7]);
    });
  });

  describe('ISO format', () => {
    it('parses "1944-06-06"', () => {
      expect(parseDateInput('1944-06-06')).toEqual([1944, 6, 6]);
    });

    it('parses "1944-06" (year-month)', () => {
      expect(parseDateInput('1944-06')).toEqual([1944, 6]);
    });

    it('parses "1941-12-07"', () => {
      expect(parseDateInput('1941-12-07')).toEqual([1941, 12, 7]);
    });
  });

  describe('edge cases', () => {
    it('returns undefined for empty string', () => {
      expect(parseDateInput('')).toBeUndefined();
    });

    it('returns undefined for whitespace only', () => {
      expect(parseDateInput('   ')).toBeUndefined();
    });

    it('trims whitespace', () => {
      expect(parseDateInput('  1944  ')).toEqual([1944]);
    });

    it('returns undefined for invalid month', () => {
      expect(parseDateInput('13/1944')).toBeUndefined();
    });

    it('returns undefined for invalid day', () => {
      expect(parseDateInput('2/30/1944')).toBeUndefined();
    });

    it('handles Feb 29 in leap year', () => {
      expect(parseDateInput('2/29/1944')).toEqual([1944, 2, 29]);
    });

    it('rejects Feb 29 in non-leap year', () => {
      expect(parseDateInput('2/29/1943')).toBeUndefined();
    });
  });
});
