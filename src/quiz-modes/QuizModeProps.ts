import type { ViewBoxPosition, VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { QuizSessionState } from './QuizSessionState';
import type { ToggleDefinition } from './ToggleDefinition';

/**
 * Props every quiz mode component receives.
 * Contract between QuizShell and mode implementations.
 */
export interface QuizModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<QuizDataRow>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly session: QuizSessionState;
  readonly onTextAnswer: (text: string) => void;
  readonly onElementSelect: (elementId: string) => void;
  readonly onPositionSelect: (position: ViewBoxPosition) => void;
  readonly onChoiceSelect: (choiceIndex: number) => void;
  readonly onHintRequest: () => void;
  readonly onSkip: () => void;
  readonly onGiveUp: () => void;
}
