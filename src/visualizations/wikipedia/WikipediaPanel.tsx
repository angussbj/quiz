import type { WikipediaPreviewState } from './useWikipediaPreview';
import styles from './WikipediaPanel.module.css';

interface WikipediaPanelProps {
  readonly state: WikipediaPreviewState;
}

/**
 * Overlay panel showing the first paragraph of a Wikipedia article.
 * Positioned absolutely within its parent container (bottom-left).
 * Shows loading/error states as appropriate.
 */
export function WikipediaPanel({ state }: WikipediaPanelProps) {
  if (state.status === 'idle') return null;

  return (
    <div className={styles.panel} role="tooltip">
      {state.status === 'loading' && (
        <p className={styles.loading}>Loading from Wikipedia…</p>
      )}
      {state.status === 'error' && (
        <p className={styles.error}>Could not load Wikipedia summary.</p>
      )}
      {state.status === 'loaded' && (
        <>
          <p className={styles.extract}>{state.data.extract}</p>
          <p className={styles.hint}>
            <kbd>⌘</kbd>+click to open in Wikipedia
          </p>
        </>
      )}
    </div>
  );
}
