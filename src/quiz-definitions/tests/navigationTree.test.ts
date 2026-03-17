import { navigationTree } from '../navigationTree';

describe('navigationTree', () => {
  it('has a root labeled Quizzes', () => {
    expect(navigationTree.label).toBe('Quizzes');
  });

  it('has top-level categories matching registry paths', () => {
    const topLabels = navigationTree.children.map((c) => c.label);
    expect(topLabels).toContain('Geography');
    expect(topLabels).toContain('Science');
    expect(topLabels).toContain('History');
  });

  it('organizes geography quizzes by type', () => {
    const geo = navigationTree.children.find((c) => c.label === 'Geography');
    expect(geo).toBeDefined();
    const subLabels = geo!.children.map((c) => c.label);
    expect(subLabels).toContain('Capitals');
    expect(subLabels).toContain('Countries');
    expect(subLabels).toContain('Flags');
  });

  it('leaf nodes have quizId set', () => {
    function collectLeaves(node: typeof navigationTree): ReadonlyArray<typeof navigationTree> {
      if (node.quizId !== undefined) return [node];
      return node.children.flatMap(collectLeaves);
    }
    const leaves = collectLeaves(navigationTree);
    expect(leaves.length).toBeGreaterThan(0);
    for (const leaf of leaves) {
      expect(leaf.quizId).toBeTruthy();
    }
  });

  it('category nodes do not have quizId', () => {
    function collectCategories(node: typeof navigationTree): ReadonlyArray<typeof navigationTree> {
      if (node.quizId !== undefined) return [];
      return [node, ...node.children.flatMap(collectCategories)];
    }
    const categories = collectCategories(navigationTree);
    for (const cat of categories) {
      expect(cat.quizId).toBeUndefined();
    }
  });
});
