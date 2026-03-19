import { readFileSync, existsSync } from 'fs';
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

  it('has country_code column', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('country_code');
  });

  it('has non-empty country_code for every row', () => {
    const empty = allRows.filter((r) => !r.country_code);
    expect(empty).toHaveLength(0);
  });

  it('has no duplicate country codes', () => {
    const codes = allRows.map((r) => r.country_code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('has a matching flag SVG for every country_code', () => {
    const flagsDir = resolve(__dirname, '../../../public/flags');
    const missing: string[] = [];
    for (const row of allRows) {
      const flagPath = resolve(flagsDir, `${row.country_code}.svg`);
      if (!existsSync(flagPath)) {
        missing.push(`${row.country} (${row.country_code})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('filters to 54 African countries', () => {
    const african = applyDataFilter(allRows, { column: 'region', values: ['Africa'] });
    expect(african.length).toBe(54);
  });

  it('filters to 49 Asian countries (includes multi-region Turkey and Russia)', () => {
    const asian = applyDataFilter(allRows, { column: 'region', values: ['Asia'] });
    expect(asian.length).toBe(49);
    const countries = asian.map((r) => r.country);
    expect(countries).toContain('Türkiye');
    expect(countries).toContain('Russia');
  });

  it('filters to 14 Oceanian countries', () => {
    const oceanian = applyDataFilter(allRows, { column: 'region', values: ['Oceania'] });
    expect(oceanian.length).toBe(14);
  });

  it('filters North America by subregion to 23 countries', () => {
    const northAmerican = applyDataFilter(allRows, {
      column: 'subregion',
      values: ['North America', 'Central America', 'Caribbean'],
    });
    expect(northAmerican.length).toBe(23);
    const countries = northAmerican.map((r) => r.country);
    expect(countries).toContain('United States');
    expect(countries).toContain('Canada');
    expect(countries).toContain('Mexico');
    expect(countries).toContain('Cuba');
    expect(countries).toContain('Panama');
  });

  it('filters South America by subregion to 12 countries', () => {
    const southAmerican = applyDataFilter(allRows, {
      column: 'subregion',
      values: ['South America'],
    });
    expect(southAmerican.length).toBe(12);
    const countries = southAmerican.map((r) => r.country);
    expect(countries).toContain('Brazil');
    expect(countries).toContain('Argentina');
  });

  it('continent filters cover all 197 rows with no overlap (except multi-region)', () => {
    const europe = applyDataFilter(allRows, { column: 'region', values: ['Europe'] });
    const asia = applyDataFilter(allRows, { column: 'region', values: ['Asia'] });
    const africa = applyDataFilter(allRows, { column: 'region', values: ['Africa'] });
    const americas = applyDataFilter(allRows, { column: 'region', values: ['Americas'] });
    const oceania = applyDataFilter(allRows, { column: 'region', values: ['Oceania'] });

    const allIds = new Set([
      ...europe.map((r) => r.id),
      ...asia.map((r) => r.id),
      ...africa.map((r) => r.id),
      ...americas.map((r) => r.id),
      ...oceania.map((r) => r.id),
    ]);
    expect(allIds.size).toBe(197);
  });
});
