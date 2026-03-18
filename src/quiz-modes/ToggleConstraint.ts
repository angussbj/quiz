/** Force a specific toggle to a fixed value in a given mode. */
export interface ForcedValueConstraint {
  readonly type: 'forced';
  readonly key: string;
  readonly forcedValue: boolean;
  readonly reason: string;
}

/** At least one of the specified toggles must be enabled. */
export interface AtLeastOneConstraint {
  readonly type: 'atLeastOne';
  readonly keys: ReadonlyArray<string>;
  readonly reason: string;
}

export type ToggleConstraint = ForcedValueConstraint | AtLeastOneConstraint;
