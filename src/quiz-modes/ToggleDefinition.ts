/**
 * What happens when a toggle is OFF during the quiz.
 * - 'never': feature stays hidden the entire quiz
 * - 'on-reveal': feature appears when the element is answered (correct or give-up)
 * - { hintAfter: n }: feature appears after n wrong answers for that element
 */
export type HiddenBehavior = 'never' | 'on-reveal' | { readonly hintAfter: number };

export interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: string;
  /** What happens when this toggle is off. Defaults to 'never' if omitted. */
  readonly hiddenBehavior?: HiddenBehavior;
}

export interface TogglePreset {
  readonly name: string;
  readonly label: string;
  readonly values: Readonly<Record<string, boolean>>;
}
