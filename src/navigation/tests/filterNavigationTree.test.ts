import { filterNavigationTree, collectCategoryLabels } from '../filterNavigationTree';
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

describe('collectCategoryLabels', () => {
  it('collects all non-leaf node paths', () => {
    const labels = collectCategoryLabels(tree);
    expect(labels.has('Quizzes')).toBe(true);
    expect(labels.has('Quizzes/Geography')).toBe(true);
    expect(labels.has('Quizzes/Geography/Europe')).toBe(true);
    expect(labels.has('Quizzes/Geography/Asia')).toBe(true);
    expect(labels.has('Quizzes/Science')).toBe(true);
    expect(labels.has('Quizzes/Science/Chemistry')).toBe(true);
  });

  it('does not include leaf nodes', () => {
    const labels = collectCategoryLabels(tree);
    for (const label of labels) {
      expect(label).not.toContain('Capitals');
      expect(label).not.toContain('Flags');
      expect(label).not.toContain('Periodic');
    }
  });
});
