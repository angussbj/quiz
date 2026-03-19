import type { TimelineTimestamp } from '@/visualizations/timeline/TimelineTimestamp';

const MONTH_NAMES: Readonly<Record<string, number>> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseMonthName(text: string): number | undefined {
  return MONTH_NAMES[text.toLowerCase()];
}

function isValidDate(year: number, month?: number, day?: number): boolean {
  if (year < 1 || year > 9999) return false;
  if (month !== undefined) {
    if (month < 1 || month > 12) return false;
    if (day !== undefined) {
      if (day < 1) return false;
      const maxDay = new Date(year, month, 0).getDate();
      if (day > maxDay) return false;
    }
  }
  return true;
}

/**
 * Parse a user-entered date string into a TimelineTimestamp.
 *
 * Supported formats:
 * - Year only: "1944"
 * - Month name + year: "Jun 1944", "June 1944"
 * - Numeric month/year: "6/1944"
 * - Day month year: "6 Jun 1944", "6 June 1944", "June 6 1944", "Jun 6 1944"
 * - Numeric: "6/6/1944", "06/06/1944"
 * - ISO: "1944-06-06"
 *
 * Returns undefined if the input cannot be parsed.
 */
export function parseDateInput(input: string): TimelineTimestamp | undefined {
  const trimmed = input.trim();
  if (trimmed === '') return undefined;

  // ISO format: 1944-06-06 or 1944-06 or 1944
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = isoMatch[3] ? parseInt(isoMatch[3], 10) : undefined;
    if (isValidDate(year, month, day)) {
      return day !== undefined ? [year, month, day] : [year, month];
    }
    return undefined;
  }

  // Year only: "1944"
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = parseInt(yearOnly[1], 10);
    if (isValidDate(year)) return [year];
    return undefined;
  }

  // Numeric with slashes: "6/6/1944", "06/06/1944", "6/1944"
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2}|\d{4})(?:\/(\d{4}))?$/);
  if (slashMatch) {
    if (slashMatch[3]) {
      // Three parts: M/D/Y
      const month = parseInt(slashMatch[1], 10);
      const day = parseInt(slashMatch[2], 10);
      const year = parseInt(slashMatch[3], 10);
      if (isValidDate(year, month, day)) return [year, month, day];
      return undefined;
    }
    // Two parts: M/Y (month/year where second part is 4 digits)
    const first = parseInt(slashMatch[1], 10);
    const second = parseInt(slashMatch[2], 10);
    if (slashMatch[2].length === 4) {
      // M/YYYY
      if (isValidDate(second, first)) return [second, first];
      return undefined;
    }
    return undefined;
  }

  // Split into tokens for text-based formats
  const tokens = trimmed.split(/[\s,]+/).filter(Boolean);

  if (tokens.length === 2) {
    // "Jun 1944" or "June 1944" or "1944 June"
    const monthFirst = parseMonthName(tokens[0]);
    const yearFirst = tokens[0].match(/^\d{4}$/) ? parseInt(tokens[0], 10) : undefined;
    const monthSecond = parseMonthName(tokens[1]);
    const yearSecond = tokens[1].match(/^\d{4}$/) ? parseInt(tokens[1], 10) : undefined;

    if (monthFirst !== undefined && yearSecond !== undefined) {
      if (isValidDate(yearSecond, monthFirst)) return [yearSecond, monthFirst];
    }
    if (yearFirst !== undefined && monthSecond !== undefined) {
      if (isValidDate(yearFirst, monthSecond)) return [yearFirst, monthSecond];
    }
    return undefined;
  }

  if (tokens.length === 3) {
    // "6 Jun 1944" or "June 6 1944" or "6 June 1944" or "Jun 6 1944"
    const year = tokens[2].match(/^\d{4}$/) ? parseInt(tokens[2], 10) : undefined;
    if (year === undefined) return undefined;

    const monthA = parseMonthName(tokens[0]);
    const dayA = tokens[1].match(/^\d{1,2}$/) ? parseInt(tokens[1], 10) : undefined;
    if (monthA !== undefined && dayA !== undefined) {
      // "June 6 1944"
      if (isValidDate(year, monthA, dayA)) return [year, monthA, dayA];
      return undefined;
    }

    const dayB = tokens[0].match(/^\d{1,2}$/) ? parseInt(tokens[0], 10) : undefined;
    const monthB = parseMonthName(tokens[1]);
    if (dayB !== undefined && monthB !== undefined) {
      // "6 June 1944"
      if (isValidDate(year, monthB, dayB)) return [year, monthB, dayB];
      return undefined;
    }

    return undefined;
  }

  return undefined;
}
