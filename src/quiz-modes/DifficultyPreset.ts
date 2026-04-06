import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';

/**
 * A single difficulty slot (Easy, Medium, or Hard).
 * Specifies the mode and any toggle overrides to apply.
 * Unspecified toggles remain at their current values.
 */
export interface DifficultyPreset {
  readonly label: string;
  readonly mode: QuizModeType;
  readonly toggleOverrides?: Readonly<Record<string, boolean>>;
  readonly selectToggleOverrides?: Readonly<Record<string, string>>;
  /** Override the range max value (e.g., top 20 cities). */
  readonly rangeMaxOverride?: number;
}

/**
 * Three difficulty slots for a quiz.
 * The first slot is pre-selected on first visit.
 */
export interface DifficultyPresets {
  readonly slots: readonly [DifficultyPreset, DifficultyPreset, DifficultyPreset];
}

export type PanelLevel = 'simple' | 'advanced' | 'full';

/**
 * Configures which controls appear at the Advanced panel level.
 * Toggles not listed here only appear in Full.
 * Forced values are applied in Advanced and hidden from the user.
 */
export interface AdvancedPanelConfig {
  /** Toggle keys visible in the Advanced panel. Unlisted toggles go to Full. */
  readonly toggleKeys: ReadonlyArray<string>;
  /** Select toggle keys visible in the Advanced panel. Unlisted go to Full. */
  readonly selectToggleKeys: ReadonlyArray<string>;
  /** Toggles forced to specific values in Advanced (hidden from UI). Overridable in Full. */
  readonly forcedToggles?: Readonly<Record<string, boolean>>;
  /** Select toggles forced to specific values in Advanced. Overridable in Full. */
  readonly forcedSelectToggles?: Readonly<Record<string, string>>;
  /**
   * When set, the listed select toggle keys are unified into a single "linked" dropdown
   * that sets all of them simultaneously. The first key is the primary (label source).
   * E.g., ['countryData', 'countryColors'] → one dropdown sets both.
   */
  readonly linkedSelectToggleKeys?: ReadonlyArray<string>;
  /** Max options to show in the linked dropdown. Omit for all. */
  readonly linkedDropdownMaxOptions?: number;
  /** When in ordered-recall mode, the linked dropdown also controls the sort column.
   *  This is the key of the ordering select toggle to sync. */
  readonly linkedSortToggleKey?: string;
}
