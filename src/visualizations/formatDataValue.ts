/**
 * Generic compact formatter for data display values on visualization elements.
 * Extracts unit information from column labels and formats values compactly.
 *
 * Works for any visualization type (map, grid, etc.) by reading raw CSV string
 * values and inferring formatting from the column label.
 */

import { formatHalfLife } from './periodic-table/formatHalfLife';

/** Format a large number compactly with K/M/B/T suffixes. */
function formatCompactNumber(value: number): string {
  // Extremely large values: use scientific notation
  if (value >= 1e15) {
    const exp = Math.floor(Math.log10(value));
    return `10^${exp}`;
  }
  if (value >= 1e12) return `${formatShort(value / 1e12)}T`;
  if (value >= 1e9) return `${formatShort(value / 1e9)}B`;
  if (value >= 1e6) return `${formatShort(value / 1e6)}M`;
  if (value >= 1e3) return `${formatShort(value / 1e3)}K`;
  return formatShort(value);
}

/** Format a number with minimal decimal places. */
function formatShort(value: number): string {
  if (value >= 100) return Math.round(value).toString();
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
  if (value >= 1) return value.toPrecision(3).replace(/\.?0+$/, '');
  if (value >= 0.001) return value.toPrecision(2).replace(/\.?0+$/, '');
  if (value === 0) return '0';
  return value.toPrecision(2);
}

/** Extract unit text from parentheses in a label, e.g. "GDP nominal (USD)" → "USD". */
function extractUnitFromLabel(label: string): string | undefined {
  const match = label.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : undefined;
}

/** Detect if a label indicates a half-life column. */
function isHalfLifeColumn(label: string): boolean {
  return label.toLowerCase().includes('half-life') || label.toLowerCase().includes('half life');
}

/** Detect if a label indicates a year/date column. */
function isYearColumn(label: string): boolean {
  const lower = label.toLowerCase();
  return lower === 'year discovered' || lower.startsWith('year ');
}

/** Detect if a label indicates a state/phase column (non-numeric). */
function isStateColumn(label: string): boolean {
  return label.toLowerCase() === 'state';
}

/**
 * Format a raw CSV string value for compact display on a visualization element.
 *
 * @param rawValue - The raw CSV cell string (may include `~` prefix or `?` suffix for estimates)
 * @param label - The column label, used to infer units (e.g. "Population density (per km²)")
 * @returns Formatted string for display, or "—" if the value is missing
 */
export function formatDataValue(rawValue: string | undefined, label: string, missingLabel?: string): string {
  if (rawValue === undefined || rawValue === '') return missingLabel ?? '—';

  // Non-numeric special cases
  if (isStateColumn(label)) {
    return rawValue.charAt(0).toUpperCase() + rawValue.slice(1);
  }

  // Half-life: use specialized cascading time unit formatter
  if (isHalfLifeColumn(label)) {
    const seconds = parseFloat(rawValue);
    if (isNaN(seconds)) return '—';
    return formatHalfLife(seconds);
  }

  // Strip approximate/estimate markers, remember them for display
  const isApprox = rawValue.startsWith('~');
  const isEstimate = rawValue.endsWith('?');
  const stripped = rawValue.replace(/^~/, '').replace(/\?$/, '');

  const value = parseFloat(stripped);
  if (isNaN(value)) return rawValue; // non-numeric: return as-is

  // Year columns: display as plain integer
  if (isYearColumn(label)) {
    return Math.round(value).toString();
  }

  const unit = extractUnitFromLabel(label);
  const prefix = isApprox ? '~' : '';
  const suffix = isEstimate ? '?' : '';

  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);

  // USD-based columns: dollar prefix
  if (unit?.includes('USD') || label.includes('USD')) {
    return `${prefix}${sign}$${formatCompactNumber(absValue)}${suffix}`;
  }

  // Percentage columns
  if (unit === '%' || unit?.includes('% ')) {
    return `${prefix}${sign}${formatShort(absValue)}%${suffix}`;
  }

  // Columns with a parenthesized unit — show compact number + unit
  if (unit) {
    return `${prefix}${sign}${formatCompactNumber(absValue)} ${unit}${suffix}`;
  }

  // No unit detected — just compact number
  return `${prefix}${sign}${formatCompactNumber(absValue)}${suffix}`;
}
