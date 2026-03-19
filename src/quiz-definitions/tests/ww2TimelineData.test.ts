import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';

const csvPath = resolve(__dirname, '../../../public/data/history/modern/ww2-timeline.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

const REQUIRED_COLUMNS = [
  'id', 'event', 'start_year', 'start_month', 'start_day',
  'end_year', 'end_month', 'end_day', 'theatre', 'event_alternates',
];

const VALID_THEATRES = [
  'European Theatre', 'Eastern Front', 'Pacific Theatre',
  'Diplomacy & Politics', 'Strategic & Technology',
];

describe('ww2-timeline.csv data validation', () => {
  it('has 37 rows', () => {
    expect(allRows).toHaveLength(37);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    for (const col of REQUIRED_COLUMNS) {
      expect(row).toHaveProperty(col);
    }
  });

  it('has no empty ids', () => {
    const emptyIds = allRows.filter((r) => !r.id);
    expect(emptyIds).toHaveLength(0);
  });

  it('has no duplicate ids', () => {
    const ids = allRows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has no empty event names', () => {
    const empty = allRows.filter((r) => !r.event);
    expect(empty).toHaveLength(0);
  });

  it('has valid start years in WWII range', () => {
    for (const row of allRows) {
      const year = parseInt(row.start_year, 10);
      expect(year).toBeGreaterThanOrEqual(1939);
      expect(year).toBeLessThanOrEqual(1945);
    }
  });

  it('has valid start months (1-12)', () => {
    for (const row of allRows) {
      const month = parseInt(row.start_month, 10);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
    }
  });

  it('has valid start days (1-31)', () => {
    for (const row of allRows) {
      if (!row.start_day) continue;
      const day = parseInt(row.start_day, 10);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    }
  });

  it('has valid end dates when present', () => {
    for (const row of allRows) {
      if (!row.end_year) continue;
      const year = parseInt(row.end_year, 10);
      expect(year).toBeGreaterThanOrEqual(1939);
      expect(year).toBeLessThanOrEqual(1945);

      if (row.end_month) {
        const month = parseInt(row.end_month, 10);
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
      }

      if (row.end_day) {
        const day = parseInt(row.end_day, 10);
        expect(day).toBeGreaterThanOrEqual(1);
        expect(day).toBeLessThanOrEqual(31);
      }
    }
  });

  it('has end date after or equal to start date', () => {
    for (const row of allRows) {
      if (!row.end_year) continue;
      const start = new Date(
        parseInt(row.start_year, 10),
        parseInt(row.start_month, 10) - 1,
        parseInt(row.start_day || '1', 10),
      );
      const end = new Date(
        parseInt(row.end_year, 10),
        parseInt(row.end_month || row.start_month, 10) - 1,
        parseInt(row.end_day || '28', 10),
      );
      expect(end.getTime()).toBeGreaterThanOrEqual(start.getTime());
    }
  });

  it('has valid theatre values', () => {
    for (const row of allRows) {
      expect(VALID_THEATRES).toContain(row.theatre);
    }
  });

  it('has events in all 5 theatres', () => {
    const theatres = new Set(allRows.map((r) => r.theatre));
    for (const t of VALID_THEATRES) {
      expect(theatres).toContain(t);
    }
  });

  it('has properly formatted alternates (pipe-separated, no leading/trailing pipes)', () => {
    for (const row of allRows) {
      if (!row.event_alternates) continue;
      expect(row.event_alternates).not.toMatch(/^\|/);
      expect(row.event_alternates).not.toMatch(/\|$/);
      const parts = row.event_alternates.split('|');
      for (const part of parts) {
        expect(part.trim()).not.toBe('');
      }
    }
  });
});
