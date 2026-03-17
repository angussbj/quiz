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

  it('keeps all children when a category label matches', () => {
    const result = filterNavigationTree(tree, 'europe')!;
    expect(result).not.toBeNull();
    // Geography > Europe should be kept with all its children
    const geo = result.children[0];
    expect(geo.label).toBe('Geography');
    const europe = geo.children[0];
    expect(europe.label).toBe('Europe');
    expect(europe.children).toHaveLength(2); // Both Capitals and Flags kept
    expect(europe.children[0].label).toBe('Capitals');
    expect(europe.children[1].label).toBe('Flags');
  });

  it('keeps all descendants when a top-level category matches', () => {
    const result = filterNavigationTree(tree, 'geography')!;
    expect(result).not.toBeNull();
    const geo = result.children[0];
    expect(geo.label).toBe('Geography');
    // All subcategories and quizzes should be preserved
    expect(geo.children).toHaveLength(2);
    expect(geo.children[0].children).toHaveLength(2);
    expect(geo.children[1].children).toHaveLength(1);
  });

  it('returns entire tree when root label matches', () => {
    // The root node "Quizzes" matches — all children kept
    const result = filterNavigationTree(tree, 'quizzes')!;
    expect(result).not.toBeNull();
    expect(result.children).toHaveLength(2); // Geography and Science
  });

  it('matches both category and leaf when both match', () => {
    // "Chem" matches "Chemistry" (category), keeping all its children
    const result = filterNavigationTree(tree, 'chem')!;
    expect(result).not.toBeNull();
    expect(result.children).toHaveLength(1);
    const science = result.children[0];
    expect(science.children[0].label).toBe('Chemistry');
    expect(science.children[0].children).toHaveLength(1);
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
