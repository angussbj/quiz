import type { ComponentType } from 'react';
import type { VisualizationRendererProps, BackgroundPath, ClusteringConfig } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ToggleDefinition } from './ToggleDefinition';
import type { ScoreResult } from '@/scoring/ScoreResult';

/**
 * Unified props interface for all quiz mode components.
 * Every mode receives the same contract from ActiveQuiz.
 * Modes that don't use a particular prop (e.g. MultipleChoice ignoring Renderer)
 * simply don't destructure it.
 */
export interface QuizModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly clustering?: ClusteringConfig;
  readonly initialViewBox?: VisualizationRendererProps['initialViewBox'];
  readonly onFinish: (score: ScoreResult) => void;
  readonly forceGiveUp?: boolean;
  readonly reviewing?: boolean;
}
