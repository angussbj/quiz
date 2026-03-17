import { useCallback, useMemo, useState } from 'react';
import type { NavigationNode } from './NavigationNode';
import { filterNavigationTree, collectCategoryLabels } from './filterNavigationTree';

interface NavigationState {
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly displayTree: NavigationNode;
  readonly expandedPaths: ReadonlySet<string>;
  readonly onTogglePath: (path: string) => void;
}

/**
 * Computes paths for all category nodes in a tree, for "expand all" initialization.
 */
function allCategoryPaths(node: NavigationNode, parentPath: string): string[] {
  if (node.quizId !== undefined) return [];
  const paths: string[] = [];
  for (const child of node.children) {
    if (child.quizId === undefined) {
      const childPath = parentPath ? `${parentPath}/${child.label}` : child.label;
      paths.push(childPath);
      paths.push(...allCategoryPaths(child, childPath));
    }
  }
  return paths;
}

export function useNavigationState(root: NavigationNode): NavigationState {
  const allPaths = useMemo(() => new Set(allCategoryPaths(root, '')), [root]);
  const [userExpandedPaths, setUserExpandedPaths] = useState<ReadonlySet<string>>(allPaths);
  const [searchQuery, setSearchQuery] = useState('');

  const isSearchActive = searchQuery.length >= 3;

  const filteredTree = useMemo(() => {
    if (!isSearchActive) return null;
    return filterNavigationTree(root, searchQuery);
  }, [root, searchQuery, isSearchActive]);

  const emptyTree: NavigationNode = useMemo(() => ({ label: root.label, children: [] }), [root.label]);
  const displayTree = isSearchActive ? (filteredTree ?? emptyTree) : root;

  const searchExpandedPaths = useMemo(() => {
    if (!filteredTree) return new Set<string>();
    return collectCategoryLabels(filteredTree);
  }, [filteredTree]);

  const expandedPaths = isSearchActive ? searchExpandedPaths : userExpandedPaths;

  const onTogglePath = useCallback(
    (path: string) => {
      if (isSearchActive) return; // Don't allow manual toggle during search
      setUserExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });
    },
    [isSearchActive],
  );

  return { searchQuery, setSearchQuery, displayTree, expandedPaths, onTogglePath };
}
