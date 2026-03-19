/**
 * What happens when a toggle is OFF during the quiz.
 * - 'never': feature stays hidden the entire quiz
 * - 'on-reveal': feature appears when the element is answered (correct or give-up)
 * - { hintAfter: n }: feature appears after n wrong answers for that element
 */
export type HiddenBehavior = 'never' | 'on-reveal' | { readonly hintAfter: number };

/** How to display this toggle's data in the identify mode prompt bar. */
export interface PromptFieldConfig {
  /** Type of rendering: 'text' for plain text, 'flag' for SVG flag image. */
  readonly type: 'text' | 'flag';
  /** CSV column key to pull the value from. For 'flag', this is the country code column. */
  readonly column: string;
}

export interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: string;
  /** What happens when this toggle is off. Defaults to 'never' if omitted. */
  readonly hiddenBehavior?: HiddenBehavior;
  /** If set, this toggle adds a field to the identify mode prompt bar when enabled. */
  readonly promptField?: PromptFieldConfig;
  /** If set, this toggle only appears in the setup panel for these modes. Omit to show for all modes. */
  readonly modes?: ReadonlyArray<string>;
}

export interface TogglePreset {
  readonly name: string;
  readonly label: string;
  readonly values: Readonly<Record<string, boolean>>;
}

/**
 * A multi-value toggle (e.g., date precision: year / month / day).
 * Rendered as a segmented control instead of a switch.
 */
export interface SelectToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly defaultValue: string;
  readonly group: string;
  /** If set, this toggle only appears in the setup panel for these modes. */
  readonly modes?: ReadonlyArray<string>;
}
