import type { ComponentType } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { QuizModeProps } from './QuizModeProps';
import { FreeRecallMode } from './free-recall/FreeRecallMode';
import { OrderedRecallMode } from './ordered-recall/OrderedRecallMode';
import { IdentifyMode } from './identify/IdentifyMode';
import { LocateMode } from './locate/LocateMode';
import { TimelineLocateMode } from './locate/TimelineLocateMode';
import { PromptedRecallMode } from './prompted-recall/PromptedRecallMode';
import { MultipleChoiceMode } from './multiple-choice/MultipleChoiceMode';

/**
 * Returns the mode component for the given mode type and visualization type.
 * All returned components accept QuizModeProps.
 */
export function resolveMode(
  mode: QuizModeType,
  visualizationType?: VisualizationType,
): ComponentType<QuizModeProps> {
  switch (mode) {
    case 'free-recall-unordered': return FreeRecallMode;
    case 'free-recall-ordered': return OrderedRecallMode;
    case 'identify': return IdentifyMode;
    case 'locate': return visualizationType === 'timeline' ? TimelineLocateMode : LocateMode;
    case 'prompted-recall': return PromptedRecallMode;
    case 'multiple-choice': return MultipleChoiceMode;
  }
}
