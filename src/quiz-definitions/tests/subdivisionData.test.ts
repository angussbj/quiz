import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';

interface SubdivisionFile {
  readonly slug: string;
  readonly label: string;
  readonly expectedMin: number;
  readonly expectedMax: number;
  readonly sampleNames: ReadonlyArray<string>;
}

const SUBDIVISION_FILES: ReadonlyArray<SubdivisionFile> = [
  { slug: 'united-states', label: 'US States', expectedMin: 50, expectedMax: 52, sampleNames: ['California', 'Texas', 'Alaska', 'District of Columbia'] },
  { slug: 'india', label: 'Indian States', expectedMin: 35, expectedMax: 37, sampleNames: ['Maharashtra', 'Tamil Nadu', 'Delhi', 'Kerala'] },
  { slug: 'china', label: 'Chinese Provinces', expectedMin: 30, expectedMax: 35, sampleNames: ['Beijing', 'Shanghai', 'Guangdong', 'Sichuan'] },
  { slug: 'brazil', label: 'Brazilian States', expectedMin: 26, expectedMax: 28, sampleNames: ['São Paulo', 'Rio de Janeiro', 'Amazonas'] },
  { slug: 'russia', label: 'Russian Subjects', expectedMin: 80, expectedMax: 90, sampleNames: ['Tatarstan', 'Kamchatka'] },
  { slug: 'mexico', label: 'Mexican States', expectedMin: 31, expectedMax: 33, sampleNames: ['Jalisco', 'Chihuahua', 'Oaxaca'] },
  { slug: 'indonesia', label: 'Indonesian Provinces', expectedMin: 30, expectedMax: 40, sampleNames: ['Jakarta', 'Bali', 'Aceh'] },
  { slug: 'japan', label: 'Japanese Prefectures', expectedMin: 47, expectedMax: 48, sampleNames: ['Tokyo', 'Aichi'] },
  { slug: 'nigeria', label: 'Nigerian States', expectedMin: 36, expectedMax: 38, sampleNames: ['Lagos', 'Kano', 'Federal Capital Territory'] },
];

describe.each(SUBDIVISION_FILES)('$label ($slug) data validation', ({ slug, expectedMin, expectedMax, sampleNames }) => {
  const csvPath = resolve(__dirname, `../../../public/data/subdivisions/${slug}.csv`);

  it('CSV file exists', () => {
    expect(existsSync(csvPath)).toBe(true);
  });

  const csvText = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvText);

  it('has required columns', () => {
    const row = rows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('name');
    expect(row).toHaveProperty('region');
    expect(row).toHaveProperty('paths');
    expect(row).toHaveProperty('latitude');
    expect(row).toHaveProperty('longitude');
    expect(row).toHaveProperty('name_alternates');
  });

  it(`has between ${expectedMin} and ${expectedMax} rows`, () => {
    expect(rows.length).toBeGreaterThanOrEqual(expectedMin);
    expect(rows.length).toBeLessThanOrEqual(expectedMax);
  });

  it('all rows have non-empty paths starting with M', () => {
    for (const row of rows) {
      expect(row.paths).toBeTruthy();
      const segments = row.paths.split('|');
      for (const segment of segments) {
        expect(segment.trim()).toMatch(/^M .* Z$/);
      }
    }
  });

  it('all rows have valid latitude and longitude', () => {
    for (const row of rows) {
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

  it('all rows have unique IDs', () => {
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rows have a non-empty region', () => {
    const missingRegion = rows.filter((r) => !r.region);
    expect(missingRegion).toHaveLength(0);
  });

  it('contains expected sample names', () => {
    const names = new Set(rows.map((r) => r.name));
    for (const expected of sampleNames) {
      expect(names.has(expected)).toBe(true);
    }
  });
});
