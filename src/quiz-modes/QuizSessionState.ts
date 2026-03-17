import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ScoreResult } from '@/scoring/ScoreResult';

export interface QuizSessionState {
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly remainingElementIds: ReadonlyArray<string>;
  readonly correctElementIds: ReadonlyArray<string>;
  readonly incorrectElementIds: ReadonlyArray<string>;
  readonly status: 'ready' | 'active' | 'paused' | 'finished';
  readonly elapsedMs: number;
  readonly score: ScoreResult;
}
