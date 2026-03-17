import { filterNavigationTree, collectCategoryPaths } from '../filterNavigationTree';
import type { NavigationNode } from '../NavigationNode';

const tree: NavigationNode = {
  label: 'Quizzes',
  children: [
    {
      label: 'Geography',
      children: [
        {
          label: 'Europe',
          children: [
            { label: 'Capitals', children: [], quizId: 'eu-caps' },
            { label: 'Flags', children: [], quizId: 'eu-flags' },
          ],
        },
        {
          label: 'Asia',
          children: [
            { label: 'Capitals', children: [], quizId: 'asia-caps' },
          ],
        },
      ],
    },
    {
      label: 'Science',
      children: [
        {
          label: 'Chemistry',
          children: [
            { label: 'Periodic Table', children: [], quizId: 'periodic' },
          ],
        },
      ],
    },
  ],
};

describe('filterNavigationTree', () => {
  it('returns null when nothing matches', () => {
    expect(filterNavigationTree(tree, 'xyz')).toBeNull();
  });

  it('keeps branches containing matching leaves', () => {
    const result = filterNavigationTree(tree, 'capitals')!;
    expect(result).not.toBeNull();
    expect(result.children).toHaveLength(1); // Geography only
    const geo = result.children[0];
    expect(geo.children).toHaveLength(2); // Europe and Asia both have Capitals
  });

  it('is case-insensitive', () => {
    const result = filterNavigationTree(tree, 'PERIODIC')!;
    expect(result).not.toBeNull();
    expect(result.children).toHaveLength(1); // Science
    expect(result.children[0].children[0].children[0].label).toBe('Periodic Table');
  });

  it('matches partial strings', () => {
    const result = filterNavigationTree(tree, 'flag')!;
    expect(result).not.toBeNull();
    const europe = result.children[0].children[0];
    expect(europe.children).toHaveLength(1);
    expect(europe.children[0].label).toBe('Flags');
  });

  it('removes non-matching siblings', () => {
    const result = filterNavigationTree(tree, 'periodic')!;
    // Only Science branch should remain
    expect(result.children).toHaveLength(1);
    expect(result.children[0].label).toBe('Science');
  });
});

describe('collectCategoryPaths', () => {
  it('collects paths matching NavigationTree path scheme', () => {
    const paths = collectCategoryPaths(tree);
    expect(paths.has('Geography')).toBe(true);
    expect(paths.has('Geography/Europe')).toBe(true);
    expect(paths.has('Geography/Asia')).toBe(true);
    expect(paths.has('Science')).toBe(true);
    expect(paths.has('Science/Chemistry')).toBe(true);
  });

  it('does not include root node path', () => {
    const paths = collectCategoryPaths(tree);
    expect(paths.has('Quizzes')).toBe(false);
  });

  it('does not include leaf nodes', () => {
    const paths = collectCategoryPaths(tree);
    for (const path of paths) {
      expect(path).not.toContain('Capitals');
      expect(path).not.toContain('Flags');
      expect(path).not.toContain('Periodic');
    }
  });
});
