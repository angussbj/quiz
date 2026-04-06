import type { PanelLevel } from './DifficultyPreset';
import styles from './PanelLevelSwitcher.module.css';

interface PanelLevelSwitcherProps {
  readonly level: PanelLevel;
  readonly onLevelChange: (level: PanelLevel) => void;
}

const LEVELS: ReadonlyArray<PanelLevel> = ['simple', 'advanced', 'full'];

function prevLevel(level: PanelLevel): PanelLevel | undefined {
  const index = LEVELS.indexOf(level);
  return index > 0 ? LEVELS[index - 1] : undefined;
}

function nextLevel(level: PanelLevel): PanelLevel | undefined {
  const index = LEVELS.indexOf(level);
  return index < LEVELS.length - 1 ? LEVELS[index + 1] : undefined;
}

function forwardLabel(next: PanelLevel): string {
  if (next === 'advanced') return 'Advanced →';
  return 'More settings →';
}

/**
 * Two links at the bottom of the setup panel for navigating between panel levels.
 * "← Simplify" goes back one level; "Advanced →" / "More settings →" goes forward.
 * Hidden when at the boundary (no previous or no next).
 */
export function PanelLevelSwitcher({ level, onLevelChange }: PanelLevelSwitcherProps) {
  const prev = prevLevel(level);
  const next = nextLevel(level);

  if (!prev && !next) return null;

  return (
    <div className={styles.switcher}>
      {prev ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => onLevelChange(prev)}
        >
          ← Simplify
        </button>
      ) : (
        <span className={styles.spacer} />
      )}
      {next ? (
        <button
          type="button"
          className={styles.link}
          onClick={() => onLevelChange(next)}
        >
          {forwardLabel(next)}
        </button>
      ) : (
        <span className={styles.spacer} />
      )}
    </div>
  );
}
