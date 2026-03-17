/**
 * A single row from quiz CSV data. Parameterized by column keys
 * so the type system can verify that quiz config references valid columns.
 *
 * Usage:
 *   type CapitalsColumns = 'city' | 'country' | 'latitude' | 'longitude' | 'flag';
 *   const row: QuizDataRow<CapitalsColumns> = { id: 'paris', city: 'Paris', ... };
 */
export type QuizDataRow<K extends string = string> = {
  readonly id: string;
} & Readonly<Record<K, string>>;
