import { buildCategoryColorMap } from '../categoryColors';

describe('buildCategoryColorMap', () => {
  it('assigns theme colors for the first 8 categories', () => {
    const categories = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const result = buildCategoryColorMap(categories);
    expect(result.a).toBe('var(--color-group-1)');
    expect(result.h).toBe('var(--color-group-8)');
  });

  it('generates vibrant colors beyond 8 categories', () => {
    const categories = Array.from({ length: 10 }, (_, i) => `cat${i}`);
    const result = buildCategoryColorMap(categories);
    expect(result.cat0).toBe('var(--color-group-1)');
    expect(result.cat8).toMatch(/^hsl\(/);
    expect(result.cat9).toMatch(/^hsl\(/);
  });

  it('deduplicates categories', () => {
    const categories = ['a', 'b', 'a', 'b', 'c'];
    const result = buildCategoryColorMap(categories);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles empty input', () => {
    expect(buildCategoryColorMap([])).toEqual({});
  });
});
