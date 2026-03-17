/** What "off" means for a toggle: never show, show on reveal, or show as hint after N wrong answers. */
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
