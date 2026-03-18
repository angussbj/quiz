import { applyDataFilter } from '../applyDataFilter';

const rows = [
  { id: 'paris', city: 'Paris', country: 'France', region: 'Europe', subregion: 'Western Europe' },
  { id: 'berlin', city: 'Berlin', country: 'Germany', region: 'Europe', subregion: 'Western Europe' },
  { id: 'tokyo', city: 'Tokyo', country: 'Japan', region: 'Asia', subregion: 'Eastern Asia' },
  { id: 'cairo', city: 'Cairo', country: 'Egypt', region: 'Africa', subregion: 'Northern Africa' },
  { id: 'delhi', city: 'New Delhi', country: 'India', region: 'Asia', subregion: 'Southern Asia' },
  { id: 'ankara', city: 'Ankara', country: 'Türkiye', region: 'Europe|Asia', subregion: 'Western Asia' },
  { id: 'moscow', city: 'Moscow', country: 'Russia', region: 'Europe|Asia', subregion: 'Eastern Europe' },
];

describe('applyDataFilter', () => {
  it('filters rows by a single value', () => {
    const result = applyDataFilter(rows, { column: 'region', values: ['Europe'] });
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.city)).toEqual(['Paris', 'Berlin', 'Ankara', 'Moscow']);
  });

  it('filters rows by multiple values (OR logic)', () => {
    const result = applyDataFilter(rows, { column: 'region', values: ['Europe', 'Asia'] });
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.city)).toEqual(['Paris', 'Berlin', 'Tokyo', 'New Delhi', 'Ankara', 'Moscow']);
  });

  it('matches pipe-separated multi-region values', () => {
    const result = applyDataFilter(rows, { column: 'region', values: ['Asia'] });
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.city)).toEqual(['Tokyo', 'New Delhi', 'Ankara', 'Moscow']);
  });

  it('does not double-count multi-region rows when filter matches multiple segments', () => {
    const result = applyDataFilter(rows, { column: 'region', values: ['Europe', 'Asia'] });
    const ankara = result.filter((r) => r.city === 'Ankara');
    expect(ankara).toHaveLength(1);
  });

  it('returns empty array when no rows match', () => {
    const result = applyDataFilter(rows, { column: 'region', values: ['Oceania'] });
    expect(result).toHaveLength(0);
  });

  it('returns empty array when column does not exist', () => {
    const result = applyDataFilter(rows, { column: 'nonexistent', values: ['Europe'] });
    expect(result).toHaveLength(0);
  });

  it('filters by subregion', () => {
    const result = applyDataFilter(rows, { column: 'subregion', values: ['Eastern Asia'] });
    expect(result).toHaveLength(1);
    expect(result[0].city).toBe('Tokyo');
  });

  it('returns all rows when every row matches', () => {
    const europeOnly = rows.filter((r) => r.region === 'Europe');
    const result = applyDataFilter(europeOnly, { column: 'region', values: ['Europe'] });
    expect(result).toHaveLength(2);
  });
});
