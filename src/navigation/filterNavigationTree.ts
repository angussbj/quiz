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
 * Collects the labels of all category (non-leaf) nodes in a tree.
 * Used to determine which nodes should be force-expanded during search.
 */
export function collectCategoryLabels(node: NavigationNode): ReadonlySet<string> {
  const labels = new Set<string>();

  function walk(current: NavigationNode, path: string) {
    if (current.quizId !== undefined) return;
    const nodePath = path ? `${path}/${current.label}` : current.label;
    labels.add(nodePath);
    for (const child of current.children) {
      walk(child, nodePath);
    }
  }

  walk(node, '');
  return labels;
}
