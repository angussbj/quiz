import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';

const csvPath = resolve(__dirname, '../../../public/data/cities/largest-cities.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

describe('largest-cities.csv data validation', () => {
  it('has 834 rows', () => {
    expect(allRows).toHaveLength(834);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('city');
    expect(row).toHaveProperty('country');
    expect(row).toHaveProperty('country_code');
    expect(row).toHaveProperty('latitude');
    expect(row).toHaveProperty('longitude');
    expect(row).toHaveProperty('population');
    expect(row).toHaveProperty('growth_rate');
    expect(row).toHaveProperty('rank');
    expect(row).toHaveProperty('region');
    expect(row).toHaveProperty('subregion');
    expect(row).toHaveProperty('city_alternates');
    expect(row).toHaveProperty('label_position');
  });

  it('has no empty ids', () => {
    const emptyIds = allRows.filter((r) => !r.id);
    expect(emptyIds).toHaveLength(0);
  });

  it('has no duplicate ids', () => {
    const ids = allRows.map((r) => r.id);
    const uniqueIds = new Set(ids);
    // Some cities may share a name (e.g., multiple cities named "Salem")
    // but their IDs should still be unique in the processed output
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has valid latitude values (-90 to 90)', () => {
    for (const row of allRows) {
      const lat = parseFloat(row.latitude);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    }
  });

  it('has valid longitude values (-180 to 180)', () => {
    for (const row of allRows) {
      const lng = parseFloat(row.longitude);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    }
  });

  it('has ranks from 1 to 834 in order', () => {
    for (let i = 0; i < allRows.length; i++) {
      expect(parseInt(allRows[i].rank, 10)).toBe(i + 1);
    }
  });

  it('has positive population values', () => {
    for (const row of allRows) {
      const pop = parseInt(row.population, 10);
      expect(pop).toBeGreaterThan(0);
    }
  });

  it('has populations in descending order', () => {
    for (let i = 1; i < allRows.length; i++) {
      const prev = parseInt(allRows[i - 1].population, 10);
      const curr = parseInt(allRows[i].population, 10);
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it('has numeric growth rate values', () => {
    for (const row of allRows) {
      const rate = parseFloat(row.growth_rate);
      expect(isNaN(rate)).toBe(false);
    }
  });

  it('has 5 regions', () => {
    const regions = new Set(allRows.map((r) => r.region));
    expect(regions.size).toBe(5);
    expect(regions).toContain('Africa');
    expect(regions).toContain('Americas');
    expect(regions).toContain('Asia');
    expect(regions).toContain('Europe');
    expect(regions).toContain('Oceania');
  });

  it('has non-empty country_code for every row', () => {
    const empty = allRows.filter((r) => !r.country_code);
    expect(empty).toHaveLength(0);
  });

  it('has a matching flag SVG for every country_code', () => {
    const flagsDir = resolve(__dirname, '../../../public/flags');
    const missing: string[] = [];
    const checked = new Set<string>();
    for (const row of allRows) {
      if (checked.has(row.country_code)) continue;
      checked.add(row.country_code);
      const flagPath = resolve(flagsDir, `${row.country_code}.svg`);
      if (!existsSync(flagPath)) {
        missing.push(`${row.country} (${row.country_code})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('Tokyo is rank 1', () => {
    expect(allRows[0].city).toBe('Tokyo');
    expect(allRows[0].rank).toBe('1');
  });

  it('top 10 contains expected megacities', () => {
    const top10 = allRows.slice(0, 10).map((r) => r.city);
    expect(top10).toContain('Tokyo');
    expect(top10).toContain('Delhi');
    expect(top10).toContain('Shanghai');
    expect(top10).toContain('Mumbai');
  });
});
