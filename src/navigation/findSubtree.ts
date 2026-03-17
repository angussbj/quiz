import type { NavigationNode } from './NavigationNode';

/**
 * Finds a subtree of the navigation tree matching a path of labels.
 * Matching is case-insensitive.
 *
 * Returns the deepest matching category node, or null if no match.
 */
export function findSubtree(
  root: NavigationNode,
  pathSegments: ReadonlyArray<string>,
): NavigationNode | null {
  let current: NavigationNode = root;

  for (const segment of pathSegments) {
    const lowerSegment = segment.toLowerCase();
    const child = current.children.find(
      (c) => c.label.toLowerCase() === lowerSegment && c.quizId === undefined,
    );
    if (!child) return null;
    current = child;
  }

  return current;
}
