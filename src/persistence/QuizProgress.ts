import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ScoreResult } from '@/scoring/ScoreResult';

export interface QuizAttempt {
  readonly quizId: string;
  readonly mode: QuizModeType;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly score: ScoreResult;
  readonly completedAt: string;
  readonly durationMs: number;
}

export interface QuizProgress {
  readonly quizId: string;
  readonly attempts: ReadonlyArray<QuizAttempt>;
  readonly bestScore: ScoreResult;
}
