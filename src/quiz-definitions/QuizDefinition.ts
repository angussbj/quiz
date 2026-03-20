import type { VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from '@/quiz-modes/ToggleDefinition';
import type { ToggleConstraint } from '@/quiz-modes/ToggleConstraint';

export type QuizModeType =
  | 'free-recall-unordered'
  | 'free-recall-ordered'
  | 'identify'
  | 'locate'
  | 'prompted-recall'
  | 'multiple-choice';

/**
 * Filter rows from a shared CSV by matching a column against a list of allowed values.
 * Multiple values act as an OR filter (row included if the column value matches any).
 */
export interface DataFilter {
  readonly column: string;
  readonly values: ReadonlyArray<string>;
}

/**
 * A complete quiz definition. Parameterized by CSV column keys
 * so the type system can verify column references in mode config.
 *
 * One definition per dataset page.
 */
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
  readonly selectToggles?: ReadonlyArray<SelectToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  /** Which CSV column serves which role. Keys are role names, values are column keys from K. */
  readonly columnMappings: Readonly<Record<string, K>>;
  readonly dataPath: string;
  /** Optional filter(s) to select a subset of rows from a shared CSV (e.g., by region).
   *  Multiple filters are applied with AND logic. */
  readonly dataFilter?: DataFilter | ReadonlyArray<DataFilter>;
  readonly supportingDataPaths: ReadonlyArray<string>;
  /** Default countdown duration in seconds. If undefined, timer runs in elapsed (count-up) mode. */
  readonly defaultCountdownSeconds?: number;
  /** Per-mode toggle constraints. Key is a QuizModeType string. */
  readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
  /** Numeric column used for range filtering (e.g., 'atomic_number'). Shows range inputs in setup. */
  readonly rangeColumn?: string;
  /** Human-readable label for the range filter (e.g., 'Atomic number'). */
  readonly rangeLabel?: string;
  /** Categorical column used for group filtering (e.g., 'category'). Shows chip toggles in setup. */
  readonly groupFilterColumn?: string;
  /** Human-readable label for the group filter section (e.g., 'Element category'). */
  readonly groupFilterLabel?: string;
  /** Per-group camera positions for chip-filtered quizzes. When a subset of chips are selected,
   *  the camera zooms to the bounding box of selected groups' positions. */
  readonly groupFilterCameraPositions?: Readonly<Record<string, {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>>;
  /** When true, elements excluded by range/group filters are hidden entirely instead of shown as context. */
  readonly hideFilteredElements?: boolean;
  /** Override the initial camera position for map visualizations (viewBox coordinates: x=lng, y=-lat). */
  readonly initialCameraPosition?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}
