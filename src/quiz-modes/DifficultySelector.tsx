import type { DifficultyPresets } from './DifficultyPreset';
import styles from './DifficultySelector.module.css';

interface DifficultySelectorProps {
  readonly presets: DifficultyPresets;
  readonly activeSlot: number;
  readonly onSlotChange: (slot: number) => void;
}

/**
 * Three-button segmented control for selecting difficulty (Easy/Medium/Hard or custom labels).
 */
export function DifficultySelector({ presets, activeSlot, onSlotChange }: DifficultySelectorProps) {
  return (
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
  );
}
