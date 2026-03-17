import { useCallback } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import type { NavigationNode } from './NavigationNode';
import styles from './NavigationTree.module.css';

interface NavigationTreeProps {
  readonly root: NavigationNode;
  readonly expandedPaths: ReadonlySet<string>;
  readonly onTogglePath: (path: string) => void;
  readonly searchQuery?: string;
}

/**
 * Renders a hierarchical navigation tree with expandable/collapsible categories.
 * The root node's children are rendered as top-level items (the root itself is not shown).
 */
export function NavigationTree({ root, expandedPaths, onTogglePath, searchQuery }: NavigationTreeProps) {
  return (
    <nav aria-label="Quiz navigation">
      <ul className={styles.tree}>
        {root.children.map((child) => (
          <TreeNode
            key={child.label}
            node={child}
            path={child.label}
            expandedPaths={expandedPaths}
            onTogglePath={onTogglePath}
            searchQuery={searchQuery}
          />
        ))}
      </ul>
    </nav>
  );
}

interface TreeNodeProps {
  readonly node: NavigationNode;
  readonly path: string;
  readonly expandedPaths: ReadonlySet<string>;
  readonly onTogglePath: (path: string) => void;
  readonly searchQuery?: string;
}

/**
 * Returns true if all children of a node are leaf nodes (quizzes).
 */
function allChildrenAreLeaves(node: NavigationNode): boolean {
  return node.children.every((child) => child.quizId !== undefined);
}

function TreeNode({ node, path, expandedPaths, onTogglePath, searchQuery }: TreeNodeProps) {
  const isLeaf = node.quizId !== undefined;
  const isExpanded = expandedPaths.has(path);

  const handleToggle = useCallback(() => {
    onTogglePath(path);
  }, [onTogglePath, path]);

  if (isLeaf) {
    return (
      <li className={styles.nodeItem}>
        <Link to={`/quiz/${node.quizId}`} className={styles.quizLink}>
          <HighlightedLabel label={node.label} query={searchQuery} />
        </Link>
      </li>
    );
  }

  const useGrid = allChildrenAreLeaves(node) && node.children.length >= 4;

  return (
    <li className={styles.nodeItem}>
      <button
        className={styles.categoryButton}
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <motion.span
          className={styles.chevron}
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          &#x25B8;
        </motion.span>
        <HighlightedLabel label={node.label} query={searchQuery} />
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.ul
            className={useGrid ? styles.quizGrid : styles.subtree}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {node.children.map((child) => (
              <TreeNode
                key={child.label}
                node={child}
                path={`${path}/${child.label}`}
                expandedPaths={expandedPaths}
                onTogglePath={onTogglePath}
                searchQuery={searchQuery}
              />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function HighlightedLabel({ label, query }: { readonly label: string; readonly query?: string }) {
  if (!query || query.length < 3) {
    return <>{label}</>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = label.split(regex);

  if (parts.length === 1) {
    return <>{label}</>;
  }

  const lowerQuery = query.toLowerCase();

  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === lowerQuery ? (
          <mark key={index} className={styles.highlight}>{part}</mark>
        ) : (
          part
        ),
      )}
    </span>
  );
}
