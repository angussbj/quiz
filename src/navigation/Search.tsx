import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import styles from './Search.module.css';

interface SearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function Search({ value, onChange }: SearchProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={styles.searchContainer}>
      <svg
        className={styles.searchIcon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="6.5" cy="6.5" r="5" />
        <line x1="10" y1="10" x2="14.5" y2="14.5" />
      </svg>
      <input
        type="text"
        className={styles.searchInput}
        placeholder="Search quizzes..."
        value={value}
        onChange={handleChange}
        aria-label="Search quizzes"
      />
      {value.length > 0 && (
        <button
          className={styles.clearButton}
          onClick={handleClear}
          aria-label="Clear search"
        >
          &#x2715;
        </button>
      )}
    </div>
  );
}
