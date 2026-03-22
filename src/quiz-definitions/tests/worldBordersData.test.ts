import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';
import { applyDataFilter } from '../applyDataFilter';
import { parseBackgroundPaths } from '@/visualizations/map/loadBackgroundPaths';
// Pass no wrapLongitude — tests validate raw CSV data without coordinate wrapping

const csvPath = resolve(__dirname, '../../../public/data/borders/world-borders.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

const sovereignRows = allRows.filter((r) => r.is_sovereign === 'true');

describe('world-borders.csv data validation', () => {
  it('has over 200 country rows', () => {
    expect(allRows.length).toBeGreaterThan(200);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('name');
    expect(row).toHaveProperty('region');
    expect(row).toHaveProperty('group');
    expect(row).toHaveProperty('paths');
    expect(row).toHaveProperty('latitude');
    expect(row).toHaveProperty('longitude');
    expect(row).toHaveProperty('name_alternates');
    expect(row).toHaveProperty('is_sovereign');
  });

  it('has no empty paths', () => {
    const emptyPaths = allRows.filter((r) => !r.paths);
    expect(emptyPaths).toHaveLength(0);
  });

  it('all paths start with M and end with Z', () => {
    for (const row of allRows) {
      const segments = row.paths.split('|');
      for (const segment of segments) {
        const trimmed = segment.trim();
        expect(trimmed).toMatch(/^M .* Z$/);
      }
    }
  });

  it('filters European borders (includes multi-region Turkey and Russia)', () => {
    const european = applyDataFilter(allRows, { column: 'region', values: ['Europe'] });
    expect(european.length).toBeGreaterThan(40);
    const names = european.map((r) => r.name);
    expect(names).toContain('Türkiye');
    expect(names).toContain('Russia');
  });

  it('Taiwan has region and group set', () => {
    const taiwan = allRows.find((r) => r.id === 'taiwan');
    expect(taiwan).toBeDefined();
    expect(taiwan!.region).toBe('Asia');
    expect(taiwan!.group).toBe('Eastern Asia');
  });

  it('every row has a non-empty region', () => {
    const missingRegion = allRows.filter((r) => !r.region);
    expect(missingRegion).toHaveLength(0);
  });

  it('parseBackgroundPaths produces valid output from European borders', () => {
    const european = applyDataFilter(allRows, { column: 'region', values: ['Europe'] });
    const paths = parseBackgroundPaths(european);
    expect(paths.length).toBeGreaterThan(40);
    for (const path of paths) {
      expect(path.id).toBeTruthy();
      expect(path.svgPathData).toMatch(/^M /);
      expect(path.group).toBeTruthy();
    }
  });
});

describe('countries quiz data validation', () => {
  it('has exactly 197 sovereign countries', () => {
    expect(sovereignRows).toHaveLength(197);
  });

  it('all sovereign countries have valid latitude and longitude', () => {
    for (const row of sovereignRows) {
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      expect(lat).not.toBeNaN();
      expect(lng).not.toBeNaN();
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    }
  });

  it('all sovereign countries have non-empty paths', () => {
    for (const row of sovereignRows) {
      expect(row.paths).toBeTruthy();
      expect(row.paths).toMatch(/^M /);
    }
  });

  it('all sovereign countries have unique IDs', () => {
    const ids = sovereignRows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filters sovereign European countries correctly', () => {
    const european = applyDataFilter(allRows, [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'region', values: ['Europe'] },
    ]);
    expect(european.length).toBeGreaterThan(40);
    const names = european.map((r) => r.name);
    expect(names).toContain('France');
    expect(names).toContain('Germany');
    expect(names).toContain('Türkiye');
    expect(names).toContain('Russia');
    // Territories excluded
    expect(names).not.toContain('Aland');
    expect(names).not.toContain('Faroe Islands');
  });

  it('non-sovereign territories have computed coordinates', () => {
    const territories = allRows.filter((r) => r.is_sovereign === 'false');
    expect(territories.length).toBe(40);
    for (const row of territories) {
      const lat = parseFloat(row.latitude);
      const lng = parseFloat(row.longitude);
      expect(lat).not.toBeNaN();
      expect(lng).not.toBeNaN();
    }
  });

  it('contains expected countries across all continents', () => {
    const names = new Set(sovereignRows.map((r) => r.name));
    // Sample from each continent
    expect(names.has('United States of America')).toBe(true);
    expect(names.has('Brazil')).toBe(true);
    expect(names.has('Japan')).toBe(true);
    expect(names.has('Australia')).toBe(true);
    expect(names.has('Nigeria')).toBe(true);
    expect(names.has('United Kingdom')).toBe(true);
  });
});
