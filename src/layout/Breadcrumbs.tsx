import { Link, useLocation } from 'react-router';
import { getQuizById } from '@/quiz-definitions/getQuizById';
import { useQuizActiveState } from '@/quiz-modes/QuizActiveContext';
import styles from './Breadcrumbs.module.css';

interface BreadcrumbSegment {
  readonly label: string;
  readonly path: string;
}

function buildQuizBreadcrumbs(quizId: string): ReadonlyArray<BreadcrumbSegment> | null {
  const definition = getQuizById(quizId);
  if (!definition) return null;

  const segments: BreadcrumbSegment[] = [];
  let urlPath = '';
  for (const segment of definition.path) {
    urlPath += `/${encodeURIComponent(segment.toLowerCase())}`;
    segments.push({ label: segment, path: urlPath });
  }
  segments.push({ label: definition.title, path: '' });
  return segments;
}

function buildCategoryBreadcrumbs(pathname: string): ReadonlyArray<BreadcrumbSegment> {
  const parts = pathname.split('/').filter(Boolean);
  const segments: BreadcrumbSegment[] = [];
  let urlPath = '';
  for (const part of parts) {
    urlPath += `/${part}`;
    const label = decodeURIComponent(part);
    const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
    segments.push({ label: capitalized, path: urlPath });
  }
  return segments;
}

export function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;
  const { isActive, onReconfigure } = useQuizActiveState();

  if (pathname === '/') return null;

  let segments: ReadonlyArray<BreadcrumbSegment>;

  const quizId = pathname.slice(1);
  if (getQuizById(quizId)) {
    const quizSegments = buildQuizBreadcrumbs(quizId);
    if (!quizSegments) return null;
    segments = quizSegments;
  } else {
    segments = buildCategoryBreadcrumbs(pathname);
  }

  if (segments.length === 0) return null;

  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={segment.path || index} className={styles.segment}>
            <span className={styles.separator} aria-hidden="true">/</span>
            {isLast && isActive ? (
              <button className={styles.link} onClick={onReconfigure} type="button">{segment.label}</button>
            ) : isLast || !segment.path ? (
              <span className={styles.current} aria-current="page">{segment.label}</span>
            ) : (
              <Link to={segment.path} className={styles.link}>{segment.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
