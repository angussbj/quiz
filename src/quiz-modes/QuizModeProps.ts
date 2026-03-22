import type { ComponentType } from 'react';
import type { VisualizationRendererProps, BackgroundPath, LakePath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ToggleDefinition, SelectToggleDefinition } from './ToggleDefinition';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { TimeScale } from '@/visualizations/timeline/buildTimelineElements';
import type { NormalizeOptions } from './free-recall/matchAnswer';

/**
 * Unified props interface for all quiz mode components.
 * Every mode receives the same contract from ActiveQuiz.
 * Modes that don't use a particular prop (e.g. MultipleChoice ignoring Renderer)
 * simply don't destructure it.
 */
export interface ReviewResult {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
  readonly elapsedSeconds: number;
  readonly onRetry: () => void;
}

export interface QuizModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly selectToggleDefinitions?: ReadonlyArray<SelectToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly lakePaths?: ReadonlyArray<LakePath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly initialCameraPosition?: VisualizationRendererProps['initialCameraPosition'];
  readonly onFinish: (score: ScoreResult) => void;
  readonly forceGiveUp?: boolean;
  readonly reviewing?: boolean;
  readonly reviewResult?: ReviewResult;
  /** How locate mode measures distance. See QuizDefinition.locateDistanceMode. */
  readonly locateDistanceMode?: 'centroid' | 'polygon-boundary';
  /**
   * When false, interactive elements start visible (default state) instead of hidden.
   * Used by quizzes where elements are always shown (e.g. 3D skeleton). Default: true.
   */
  readonly hideUnfocusedElements?: boolean;
  /** Time axis scale for timeline quizzes. See QuizDefinition.timeScale. */
  readonly timeScale?: TimeScale;
  /** Options controlling answer normalization (whitespace/punctuation sensitivity). */
  readonly normalizeOptions?: NormalizeOptions;
}
