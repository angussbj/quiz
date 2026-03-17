import type { NavigationNode } from './NavigationNode';

/**
 * Filters a navigation tree to only include branches containing
 * leaf nodes whose labels match the query (case-insensitive substring).
 * Returns null if no nodes match.
 */
export function filterNavigationTree(
  node: NavigationNode,
  query: string,
): NavigationNode | null {
  const lowerQuery = query.toLowerCase();

  if (node.quizId !== undefined) {
    return node.label.toLowerCase().includes(lowerQuery) ? node : null;
  }

  const filteredChildren: NavigationNode[] = [];
  for (const child of node.children) {
    const filtered = filterNavigationTree(child, query);
    if (filtered) {
      filteredChildren.push(filtered);
    }
  }

  if (filteredChildren.length === 0) {
    return null;
  }

  return { ...node, children: filteredChildren };
}

/**
 * Collects paths of all category (non-leaf) nodes in a tree,
 * using the same path scheme as NavigationTree (root's children are top-level).
 */
export function collectCategoryPaths(root: NavigationNode): ReadonlySet<string> {
  const paths = new Set<string>();

  function walk(current: NavigationNode, path: string) {
    if (current.quizId !== undefined) return;
    paths.add(path);
    for (const child of current.children) {
      if (child.quizId === undefined) {
        walk(child, `${path}/${child.label}`);
      }
    }
  }

  for (const child of root.children) {
    if (child.quizId === undefined) {
      walk(child, child.label);
    }
  }

  return paths;
}
