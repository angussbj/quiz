import type { ViewBoxPosition, VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizSessionState } from './QuizSessionState';

/**
 * Props every quiz mode component receives.
 * Contract between QuizShell and mode implementations.
 */
export interface QuizModeProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly session: QuizSessionState;
  readonly onTextAnswer: (text: string) => void;
  readonly onElementSelect: (elementId: string) => void;
  readonly onPositionSelect: (position: ViewBoxPosition) => void;
  readonly onChoiceSelect: (choiceIndex: number) => void;
  readonly onHintRequest: () => void;
  readonly onSkip: () => void;
  readonly onGiveUp: () => void;
}
