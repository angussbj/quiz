import type { VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from '@/quiz-modes/ToggleDefinition';
import type { ToggleConstraint } from '@/quiz-modes/ToggleConstraint';
import type { TimeScale } from '@/visualizations/timeline/buildTimelineElements';
import type { ElementVisualState } from '@/visualizations/VisualizationElement';

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
  /**
   * A data filter that is only applied when a toggle is OFF.
   * When the toggle is ON, the filter is bypassed and all rows pass.
   * Use this for "include more data" toggles (e.g. "Include smaller rivers").
   */
  readonly toggleControlledFilter?: {
    readonly toggleKey: string;
    readonly column: string;
    readonly values: ReadonlyArray<string>;
  };
  /** Column in the data CSV that stores the parent river name for tributary rivers.
   *  When the 'mergeTributaries' toggle is true, tributary paths are merged into the parent
   *  element's svgPathData and a subtitle "(and tributaries)" appears in the prompt. */
  readonly tributaryColumn?: string;
  /** Column in the data CSV that stores the parent river name for distributary rivers.
   *  When the 'mergeDistributaries' toggle is true, distributary paths are merged into the
   *  parent element's svgPathData. */
  readonly distributaryColumn?: string;
  /** Column in the data CSV that stores the canonical river name for named-section rivers.
   *  When the 'mergeSegmentNames' toggle is true (default), segment paths are merged into
   *  the canonical element and segment names become alternate answers. */
  readonly segmentColumn?: string;
  /**
   * Time axis scale for timeline visualizations.
   * - `'linear'` (default): equal pixel space per year.
   * - `'log'`: equal pixel space per order of magnitude (log10 years before present).
   *   Use for deep-time timelines spanning millions or billions of years.
   */
  readonly timeScale?: TimeScale;
  /**
   * How locate mode measures distance from the click to the target element.
   * - `'centroid'` (default): distance to the element's geographic center point.
   * - `'polygon-boundary'`: zero distance for clicks inside the element's polygon;
   *   distance to the nearest border point for clicks outside. Use for country/region quizzes.
   */
  readonly locateDistanceMode?: 'centroid' | 'polygon-boundary' | 'grid-centroid';
  /**
   * Thresholds for graded locate feedback (correct/second/third/incorrect).
   * Units match the distance mode: km for map modes, Manhattan steps for grid-centroid.
   * When absent, falls back to legacy 100km correct threshold.
   */
  readonly locateThresholds?: {
    readonly correct: number;
    readonly correctSecond: number;
    readonly correctThird: number;
  };
  /** Override the initial camera position for map visualizations (viewBox coordinates: x=lng, y=-lat). */
  readonly initialCameraPosition?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  /**
   * When false, the locate quiz mode shows all elements even before they are answered
   * (instead of hiding them). Default / absent / true = default hide behaviour.
   * Used for quizzes where the elements are always visible (e.g. 3D skeleton).
   */
  readonly hideUnfocusedElements?: boolean;
  /**
   * Override element state colors for this quiz. Maps visual states to CSS variable references
   * (e.g., `{ default: 'var(--color-lake)' }`). Renderers use these instead of STATUS_COLORS.main
   * for the specified states.
   */
  readonly elementStateColorOverrides?: Readonly<Partial<Record<ElementVisualState, string>>>;
  /**
   * Dynamic grouping: lets the user switch the group-by column at runtime via a select toggle.
   * `selectToggleKey` names the select toggle, `options` maps each option value to a column
   * config (or undefined for "no grouping").
   */
  readonly dynamicGrouping?: {
    readonly selectToggleKey: string;
    readonly options: Readonly<Record<string, {
      readonly column: string;
      readonly chipLabel: string;
    } | undefined>>;
  };
  /** When true, whitespace differences matter for answer matching. Default: false (whitespace stripped). */
  readonly whitespaceMatters?: boolean;
  /** When true, punctuation differences matter for answer matching. Default: false (punctuation stripped). */
  readonly punctuationMatters?: boolean;
  /**
   * Numeric columns available for sorting in ordered recall mode.
   * When present, the setup panel shows "Order by", "Sort order", and "Missing values"
   * controls for `free-recall-ordered` mode. The first column is the default sort.
   */
  readonly orderedRecallSortColumns?: ReadonlyArray<SortColumnDefinition>;
}

/**
 * Definition for a numeric column available for sorting/range filtering.
 * Used by both ordered recall mode and the range filter dropdown.
 */
export interface SortColumnDefinition {
  readonly column: string;
  readonly label: string;
  /**
   * How to aggregate values when elements are merged (e.g. tributaries into parent river).
   * - 'parent' (default): use the parent element's value, ignore merged children.
   * - 'sum': sum the parent + all merged children's values.
   */
  readonly mergeAggregation?: 'parent' | 'sum';
  /**
   * When true, rank 1 = highest value ("top N by X" semantics).
   * When false (default), rank 1 = lowest value (sequential index semantics).
   * Most columns want true; atomic_number is a notable exception.
   */
  readonly rankDescending?: boolean;
}
