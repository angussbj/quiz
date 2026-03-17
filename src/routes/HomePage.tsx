import { NavigationTree } from '@/navigation/NavigationTree';
import { Search } from '@/navigation/Search';
import { useNavigationState } from '@/navigation/useNavigationState';
import { navigationTree } from '@/quiz-definitions/navigationTree';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { searchQuery, setSearchQuery, displayTree, expandedPaths, onTogglePath } =
    useNavigationState(navigationTree);

  const hasResults = displayTree.children.length > 0;

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Quizzes</h1>
      <Search value={searchQuery} onChange={setSearchQuery} />
      {hasResults ? (
        <NavigationTree
          root={displayTree}
          expandedPaths={expandedPaths}
          onTogglePath={onTogglePath}
          searchQuery={searchQuery}
        />
      ) : (
        <p className={styles.emptyState}>No quizzes match your search.</p>
      )}
    </main>
  );
}
