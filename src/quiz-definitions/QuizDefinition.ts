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
  readonly supportingDataPaths: ReadonlyArray<string>;
  /** Default countdown duration in seconds. If undefined, timer runs in elapsed (count-up) mode. */
  readonly defaultCountdownSeconds?: number;
}
