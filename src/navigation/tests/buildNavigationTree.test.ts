import { buildNavigationTree } from '../buildNavigationTree';
import type { QuizDefinition } from '@/quiz-definitions/QuizDefinition';

function makeDefinition(
  overrides: Partial<QuizDefinition> & Pick<QuizDefinition, 'id' | 'title' | 'path'>,
): QuizDefinition {
  return {
    description: '',
    visualizationType: 'map',
    availableModes: ['free-recall-unordered'],
    defaultMode: 'free-recall-unordered',
    toggles: [],
    presets: [],
    columnMappings: {},
    dataPath: '',
    supportingDataPaths: [],
    ...overrides,
  };
}

describe('buildNavigationTree', () => {
  it('returns an empty root when given no definitions', () => {
    const tree = buildNavigationTree([]);
    expect(tree.label).toBe('Quizzes');
    expect(tree.children).toEqual([]);
  });

  it('builds a single-level path', () => {
    const tree = buildNavigationTree([
      makeDefinition({ id: 'caps', title: 'Capitals', path: ['Geography'] }),
    ]);

    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].label).toBe('Geography');
    expect(tree.children[0].children).toHaveLength(1);
    expect(tree.children[0].children[0].label).toBe('Capitals');
    expect(tree.children[0].children[0].quizId).toBe('caps');
  });

  it('builds nested paths', () => {
    const tree = buildNavigationTree([
      makeDefinition({
        id: 'eu-caps',
        title: 'European Capitals',
        path: ['Geography', 'Europe'],
      }),
    ]);

    const geo = tree.children[0];
    expect(geo.label).toBe('Geography');
    const europe = geo.children[0];
    expect(europe.label).toBe('Europe');
    expect(europe.children[0].quizId).toBe('eu-caps');
  });

  it('groups definitions with shared path prefixes', () => {
    const tree = buildNavigationTree([
      makeDefinition({ id: 'eu-caps', title: 'Capitals', path: ['Geography', 'Europe'] }),
      makeDefinition({ id: 'eu-flags', title: 'Flags', path: ['Geography', 'Europe'] }),
      makeDefinition({ id: 'asia-caps', title: 'Capitals', path: ['Geography', 'Asia'] }),
    ]);

    expect(tree.children).toHaveLength(1); // Geography
    const geo = tree.children[0];
    expect(geo.children).toHaveLength(2); // Europe, Asia
    const europe = geo.children.find((c) => c.label === 'Europe')!;
    expect(europe.children).toHaveLength(2);
    const asia = geo.children.find((c) => c.label === 'Asia')!;
    expect(asia.children).toHaveLength(1);
  });

  it('handles multiple top-level categories', () => {
    const tree = buildNavigationTree([
      makeDefinition({ id: 'elements', title: 'Elements', path: ['Science'] }),
      makeDefinition({ id: 'caps', title: 'Capitals', path: ['Geography'] }),
    ]);

    expect(tree.children).toHaveLength(2);
    expect(tree.children.map((c) => c.label).sort()).toEqual(['Geography', 'Science']);
  });

  it('leaf nodes have no children and a quizId', () => {
    const tree = buildNavigationTree([
      makeDefinition({ id: 'test', title: 'Test Quiz', path: ['Category'] }),
    ]);

    const leaf = tree.children[0].children[0];
    expect(leaf.quizId).toBe('test');
    expect(leaf.children).toHaveLength(0);
  });

  it('category nodes have no quizId', () => {
    const tree = buildNavigationTree([
      makeDefinition({ id: 'test', title: 'Test Quiz', path: ['Category'] }),
    ]);

    expect(tree.quizId).toBeUndefined();
    expect(tree.children[0].quizId).toBeUndefined();
  });
});
