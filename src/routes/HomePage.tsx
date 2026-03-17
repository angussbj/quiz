import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
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

  const subtreeResult = useMemo(() => {
    if (categorySegments.length === 0) return { node: navigationTree, found: true };
    const subtree = findSubtree(navigationTree, categorySegments);
    if (!subtree) return { node: navigationTree, found: false };
    return { node: subtree, found: true };
  }, [categorySegments]);

  const isFiltered = categorySegments.length > 0;

  if (isFiltered && !subtreeResult.found) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Category not found</h1>
        <p className={styles.emptyState}>
          No category matches this path. <Link to="/" className={styles.homeLink}>Browse all quizzes</Link>
        </p>
      </div>
    );
  }

  return (
    <HomePageContent
      rootNode={subtreeResult.node}
      isFiltered={isFiltered}
    />
  );
}

function HomePageContent({
  rootNode,
  isFiltered,
}: {
  readonly rootNode: ReturnType<typeof findSubtree> & object;
  readonly isFiltered: boolean;
}) {
  const { searchQuery, setSearchQuery, displayTree, expandedPaths, onTogglePath } =
    useNavigationState(rootNode);

  const hasResults = displayTree.children.length > 0;

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
