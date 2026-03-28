import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ThemeToggle } from './ThemeToggle';
import { Breadcrumbs } from './Breadcrumbs';
import { useAppHeight } from '@/utilities/useAppHeight';
import styles from './Layout.module.css';

interface LayoutProps {
  readonly children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  useAppHeight();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleAndBreadcrumbs}>
            <Link to="/" className={styles.siteTitle}>Quizzical</Link>
            <Breadcrumbs />
          </div>
          <ThemeToggle />
        </div>
      </header>
      <div className={styles.contentArea}>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
