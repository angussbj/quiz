export interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: 'difficulty' | 'display';
}

export interface TogglePreset {
  readonly name: string;
  readonly label: string;
  readonly values: Readonly<Record<string, boolean>>;
}
