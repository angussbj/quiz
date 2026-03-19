import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';
import { applyDataFilter } from '../applyDataFilter';

const csvPath = resolve(__dirname, '../../../public/data/rivers/world-rivers.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

describe('world-rivers.csv data validation', () => {
  it('has over 1000 river rows', () => {
    expect(allRows.length).toBeGreaterThan(1000);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('name');
    expect(row).toHaveProperty('name_alternates');
    expect(row).toHaveProperty('continent');
    expect(row).toHaveProperty('scalerank');
    expect(row).toHaveProperty('paths');
    expect(row).toHaveProperty('latitude');
    expect(row).toHaveProperty('longitude');
  });

  it('has no empty paths', () => {
    const emptyPaths = allRows.filter((r) => !r.paths);
    expect(emptyPaths).toHaveLength(0);
  });

  it('all paths start with M (open line paths, not closed polygons)', () => {
    for (const row of allRows) {
      const segments = row.paths.split('|');
      for (const segment of segments) {
        const trimmed = segment.trim();
        expect(trimmed).toMatch(/^M /);
        // River paths should NOT end with Z (they're open lines)
        expect(trimmed).not.toMatch(/Z$/);
      }
    }
  });

  it('all rows have valid latitude and longitude', () => {
    for (const row of allRows) {
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

  it('all rows have valid scalerank (0-10)', () => {
    for (const row of allRows) {
      const rank = parseInt(row.scalerank);
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThanOrEqual(10);
    }
  });

  it('all rows have a continent', () => {
    const validContinents = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];
    for (const row of allRows) {
      expect(validContinents).toContain(row.continent);
    }
  });

  it('contains well-known rivers', () => {
    const names = new Set(allRows.map((r) => r.name));
    expect(names.has('Nile')).toBe(true);
    expect(names.has('Amazonas')).toBe(true);
    expect(names.has('Mississippi')).toBe(true);
    expect(names.has('Danube')).toBe(true);
    expect(names.has('Volga')).toBe(true);
    expect(names.has('Lena')).toBe(true);
  });

  it('Amazon is in South America', () => {
    const amazon = allRows.find((r) => r.name === 'Amazonas');
    expect(amazon).toBeDefined();
    expect(amazon!.continent).toBe('South America');
  });

  it('Danube is in Europe', () => {
    const danube = allRows.find((r) => r.name === 'Danube');
    expect(danube).toBeDefined();
    expect(danube!.continent).toBe('Europe');
  });

  it('filters European rivers correctly', () => {
    const european = applyDataFilter(allRows, [
      { column: 'continent', values: ['Europe'] },
      { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5', '6'] },
    ]);
    expect(european.length).toBeGreaterThan(30);
    const names = european.map((r) => r.name);
    expect(names).toContain('Danube');
    expect(names).toContain('Volga');
  });

  it('world rivers (scalerank <= 5) has about 200 entries', () => {
    const world = applyDataFilter(allRows, {
      column: 'scalerank',
      values: ['0', '1', '2', '3', '4', '5'],
    });
    expect(world.length).toBeGreaterThan(150);
    expect(world.length).toBeLessThan(250);
  });

  it('all rows have unique IDs', () => {
    const ids = allRows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
