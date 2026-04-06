import type { DifficultyPresets } from './DifficultyPreset';
import styles from './DifficultySelector.module.css';

interface DifficultySelectorProps {
  readonly presets: DifficultyPresets;
  readonly activeSlot: number;
  readonly onSlotChange: (slot: number) => void;
}

/**
 * Three-button segmented control for selecting difficulty (Easy/Medium/Hard or custom labels).
 * Shows a short description of the active slot below the buttons when available.
 */
export function DifficultySelector({ presets, activeSlot, onSlotChange }: DifficultySelectorProps) {
  const activeDescription = presets.slots[activeSlot]?.description;
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
      {activeDescription && (
        <p className={styles.description}>{activeDescription}</p>
      )}
    </div>
  );
}
