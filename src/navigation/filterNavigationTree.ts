import type { NavigationNode } from './NavigationNode';

/**
 * Filters a navigation tree to only include branches containing
 * nodes whose labels match the query (case-insensitive substring).
 *
 * Category-aware: when a category label matches, all its descendants are kept.
 * When only leaf labels match, only those branches are kept.
 * Returns null if no nodes match.
 */
export function filterNavigationTree(
  node: NavigationNode,
  query: string,
): NavigationNode | null {
  const lowerQuery = query.toLowerCase();
  return filterNode(node, lowerQuery);
}

function filterNode(
  node: NavigationNode,
  lowerQuery: string,
): NavigationNode | null {
  // Leaf node: match against its label
  if (node.quizId !== undefined) {
    return node.label.toLowerCase().includes(lowerQuery) ? node : null;
  }

  // Category node: if label matches, keep entire subtree
  if (node.label.toLowerCase().includes(lowerQuery)) {
    return node;
  }

  // Otherwise, recurse into children
  const filteredChildren: NavigationNode[] = [];
  for (const child of node.children) {
    const filtered = filterNode(child, lowerQuery);
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
