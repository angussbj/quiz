import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';
import { applyDataFilter } from '../applyDataFilter';
import { parseBackgroundPaths } from '../parseBackgroundPaths';

const csvPath = resolve(__dirname, '../../../public/data/borders/world-borders.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

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
