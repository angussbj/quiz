import type { VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { ToggleDefinition, TogglePreset } from '@/quiz-modes/ToggleDefinition';

export type QuizModeType =
  | 'free-recall-unordered'
  | 'free-recall-ordered'
  | 'identify'
  | 'locate'
  | 'multiple-choice';

/**
 * A complete quiz definition. Parameterized by CSV column keys
 * so the type system can verify column references in mode config.
 *
 * One definition per dataset page.
 */
/**
 * Filter rows from a shared CSV by matching a column against a list of allowed values.
 * Multiple values act as an OR filter (row included if the column value matches any).
 */
export interface DataFilter {
  readonly column: string;
  readonly values: ReadonlyArray<string>;
}

export interface QuizDefinition<K extends string = string> {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Breadcrumb segments (e.g., ["Geography", "Capitals", "Europe"]) */
  readonly path: ReadonlyArray<string>;
  readonly visualizationType: VisualizationType;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly defaultMode: QuizModeType;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  /** Which CSV column serves which role. Keys are role names, values are column keys from K. */
  readonly columnMappings: Readonly<Record<string, K>>;
  readonly dataPath: string;
  /** Optional filter to select a subset of rows from a shared CSV (e.g., by region). */
  readonly dataFilter?: DataFilter;
  readonly supportingDataPaths: ReadonlyArray<string>;
  /** Optional filter for supporting data CSVs (same semantics as dataFilter). */
  readonly supportingDataFilter?: DataFilter;
  /** Default countdown duration in seconds. If undefined, timer runs in elapsed (count-up) mode. */
  readonly defaultCountdownSeconds?: number;
}
