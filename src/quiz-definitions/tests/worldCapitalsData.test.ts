import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';
import { applyDataFilter } from '../applyDataFilter';

const csvPath = resolve(__dirname, '../../../public/data/capitals/world-capitals.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

describe('world-capitals.csv data validation', () => {
  it('has 197 rows', () => {
    expect(allRows).toHaveLength(197);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('city');
    expect(row).toHaveProperty('country');
    expect(row).toHaveProperty('latitude');
    expect(row).toHaveProperty('longitude');
    expect(row).toHaveProperty('region');
    expect(row).toHaveProperty('subregion');
    expect(row).toHaveProperty('city_alternates');
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

  it('filters to 47 European countries (includes multi-region Turkey and Russia)', () => {
    const european = applyDataFilter(allRows, { column: 'region', values: ['Europe'] });
    expect(european.length).toBe(47);
    const countries = european.map((r) => r.country);
    expect(countries).toContain('Türkiye');
    expect(countries).toContain('Russia');
  });

  it('includes Israel, Palestine, and Taiwan', () => {
    const countries = allRows.map((r) => r.country);
    expect(countries).toContain('Israel');
    expect(countries).toContain('Palestine');
    expect(countries).toContain('Taiwan');
  });

  it('includes Kosovo', () => {
    const countries = allRows.map((r) => r.country);
    expect(countries).toContain('Kosovo');
  });

  it('has 5 logical regions (some rows are multi-region)', () => {
    const regions = new Set(allRows.flatMap((r) => r.region.split('|')));
    expect(regions.size).toBe(5);
    expect(regions).toContain('Africa');
    expect(regions).toContain('Americas');
    expect(regions).toContain('Asia');
    expect(regions).toContain('Europe');
    expect(regions).toContain('Oceania');
  });
});
