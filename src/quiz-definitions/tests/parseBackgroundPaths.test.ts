import { parseBackgroundPaths } from '@/visualizations/map/loadBackgroundPaths';

describe('parseBackgroundPaths', () => {
  it('parses a single-path row into one BackgroundPath', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'Western Europe', paths: 'M 0,0 L 10,10 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toEqual([
      { id: 'france', svgPathData: 'M 0,0 L 10,10 Z', group: 'Western Europe', name: 'France', code: undefined },
    ]);
  });

  it('parses a multi-path row into indexed BackgroundPaths', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'Western Europe', paths: 'M 0,0 L 10,10 Z|M 20,20 L 30,30 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toEqual([
      { id: 'france-0', svgPathData: 'M 0,0 L 10,10 Z', group: 'Western Europe', name: 'France', code: undefined },
      { id: 'france-1', svgPathData: 'M 20,20 L 30,30 Z', group: 'Western Europe', name: 'France', code: undefined },
    ]);
  });

  it('skips rows with empty paths', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'Western Europe', paths: '' },
      { id: 'germany', name: 'Germany', group: 'Central Europe', paths: 'M 5,5 L 15,15 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('germany');
  });

  it('includes rows with missing id using empty string', () => {
    const rows = [
      { id: '', name: 'France', group: 'Western Europe', paths: 'M 0,0 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('');
  });

  it('falls back to name when group is missing', () => {
    const rows = [
      { id: 'france', name: 'France', paths: 'M 0,0 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result[0].group).toBe('France');
  });

  it('trims whitespace from path segments', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'W', paths: ' M 0,0 Z | M 1,1 Z ' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result[0].svgPathData).toBe('M 0,0 Z');
    expect(result[1].svgPathData).toBe('M 1,1 Z');
  });

  it('skips empty segments in multi-path rows', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'W', paths: 'M 0,0 Z||M 1,1 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('france-0');
    expect(result[1].id).toBe('france-2');
  });

  it('handles multiple rows', () => {
    const rows = [
      { id: 'france', name: 'France', group: 'W', paths: 'M 0,0 Z' },
      { id: 'germany', name: 'Germany', group: 'C', paths: 'M 1,1 Z|M 2,2 Z' },
    ];
    const result = parseBackgroundPaths(rows);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['france', 'germany-0', 'germany-1']);
  });
});
