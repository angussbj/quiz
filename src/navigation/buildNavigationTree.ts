import type { QuizDefinition } from '@/quiz-definitions/QuizDefinition';
import type { NavigationNode } from './NavigationNode';

/**
 * Builds a NavigationNode tree from an array of quiz definitions.
 * Each definition's `path` segments become nested category nodes,
 * with the final level being a leaf node linking to the quiz.
 */
export function buildNavigationTree(
  definitions: ReadonlyArray<QuizDefinition>,
): NavigationNode {
  const root: MutableNode = { label: 'Quizzes', children: [] };

  for (const definition of definitions) {
    let current = root;
    for (const segment of definition.path) {
      let child = current.children.find((c) => c.label === segment);
      if (!child) {
        child = { label: segment, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.children.push({
      label: definition.title,
      children: [],
      quizId: definition.id,
    });
  }

  return root;
}

interface MutableNode {
  label: string;
  children: MutableNode[];
  quizId?: string;
}
