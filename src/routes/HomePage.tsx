import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { NavigationTree } from '@/navigation/NavigationTree';
import { Search } from '@/navigation/Search';
import { useNavigationState } from '@/navigation/useNavigationState';
import { navigationTree } from '@/quiz-definitions/navigationTree';
import { findSubtree } from '@/navigation/findSubtree';
import styles from './HomePage.module.css';

export default function HomePage() {
  const location = useLocation();

  const categorySegments = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/quiz/')) return [];
    return path.split('/').filter(Boolean).map(decodeURIComponent);
  }, [location.pathname]);

  const rootNode = useMemo(() => {
    if (categorySegments.length === 0) return navigationTree;
    const subtree = findSubtree(navigationTree, categorySegments);
    if (!subtree) return navigationTree;
    return subtree;
  }, [categorySegments]);

  const { searchQuery, setSearchQuery, displayTree, expandedPaths, onTogglePath } =
    useNavigationState(rootNode);

  const hasResults = displayTree.children.length > 0;
  const isFiltered = categorySegments.length > 0;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{isFiltered ? rootNode.label : 'Quizzes'}</h1>
      <Search value={searchQuery} onChange={setSearchQuery} />
      {hasResults ? (
        <NavigationTree
          root={displayTree}
          expandedPaths={expandedPaths}
          onTogglePath={onTogglePath}
          searchQuery={searchQuery}
        />
      ) : (
        <p className={styles.emptyState}>
          {isFiltered ? 'No quizzes in this category.' : 'No quizzes match your search.'}
        </p>
      )}
    </div>
  );
}
