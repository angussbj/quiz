import type { DifficultyPresets } from './DifficultyPreset';
import styles from './DifficultySelector.module.css';

interface DifficultySelectorProps {
  readonly presets: DifficultyPresets;
  /** Index of the active slot, or undefined when no preset matches current settings. */
  readonly activeSlot: number | undefined;
  readonly onSlotChange: (slot: number) => void;
}

/**
 * Three-button segmented control for selecting difficulty (Easy/Medium/Hard or custom labels).
 * Shows a short description of the active slot below the buttons when available.
 * Reserves space for the description to prevent layout shift when it disappears.
 */
export function DifficultySelector({ presets, activeSlot, onSlotChange }: DifficultySelectorProps) {
  const activeDescription = activeSlot !== undefined ? presets.slots[activeSlot]?.description : undefined;
  const hasAnyDescription = presets.slots.some((s) => s.description);
  return (
    <div className={styles.container}>
      <div className={styles.segmented} role="group" aria-label="Difficulty">
        {presets.slots.map((preset, index) => (
          <button
            key={index}
            type="button"
            className={styles.button}
            aria-pressed={activeSlot === index}
            onClick={() => onSlotChange(index)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {hasAnyDescription && (
        <p className={styles.description}>{activeDescription ?? '\u00A0'}</p>
      )}
    </div>
  );
}
