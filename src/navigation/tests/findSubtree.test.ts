import type { NavigationNode } from '../NavigationNode';
import { findSubtree } from '../findSubtree';

const tree: NavigationNode = {
  label: 'Root',
  children: [
    {
      label: 'Geography',
      children: [
        {
          label: 'Capitals',
          children: [
            { label: 'World Capitals', children: [], quizId: 'geo-capitals-world' },
          ],
        },
        {
          label: 'Countries',
          children: [
            { label: 'World Countries', children: [], quizId: 'geo-countries-world' },
          ],
        },
      ],
    },
    {
      label: 'Science',
      children: [
        { label: 'Periodic Table', children: [], quizId: 'sci-periodic-table' },
      ],
    },
  ],
};

describe('findSubtree', () => {
  it('returns root for empty path', () => {
    expect(findSubtree(tree, [])).toBe(tree);
  });

  it('finds a top-level category', () => {
    const result = findSubtree(tree, ['geography']);
    expect(result?.label).toBe('Geography');
  });

  it('finds a nested category', () => {
    const result = findSubtree(tree, ['geography', 'capitals']);
    expect(result?.label).toBe('Capitals');
    expect(result?.children).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    const result = findSubtree(tree, ['GEOGRAPHY', 'CAPITALS']);
    expect(result?.label).toBe('Capitals');
  });

  it('returns null for non-existent path', () => {
    expect(findSubtree(tree, ['nonexistent'])).toBeNull();
  });

  it('returns null when path goes through a leaf node', () => {
    expect(findSubtree(tree, ['science', 'periodic table', 'deep'])).toBeNull();
  });

  it('does not match quiz leaf nodes', () => {
    expect(findSubtree(tree, ['geography', 'capitals', 'european capitals'])).toBeNull();
  });
});
