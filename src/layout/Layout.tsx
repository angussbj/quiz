import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { Breadcrumbs } from './Breadcrumbs';
import styles from './Layout.module.css';

interface LayoutProps {
  readonly children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.siteTitle}>Quizzical</Link>
          <ThemeToggle />
        </div>
      </header>
      <div className={styles.contentArea}>
        <div className={styles.breadcrumbsWrapper}>
          <Breadcrumbs />
        </div>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
