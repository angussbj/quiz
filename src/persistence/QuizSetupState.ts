import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';

/**
 * Persisted state for a single quiz's setup panel.
 * Stored per quiz ID in localStorage.
 */
export interface QuizSetupState {
  /** Which difficulty slot (0=Easy, 1=Medium, 2=Hard) is selected. */
  readonly difficultySlot: number;
  /** Selected quiz mode. */
  readonly mode: QuizModeType;
  /** Toggle values (key → boolean). */
  readonly toggleValues: Readonly<Record<string, boolean>>;
  /** Select toggle values (key → string). */
  readonly selectValues: Readonly<Record<string, string>>;
  /** Range filter: [min, max] or undefined for each bound. */
  readonly rangeMin: number | undefined;
  readonly rangeMax: number | undefined;
  /** Selected group filter values. */
  readonly selectedGroups: ReadonlyArray<string>;
}
