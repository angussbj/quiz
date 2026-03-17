export interface ScoreResult {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
  readonly details?: ScoreDetails;
}

export interface LocateScoreDetails {
  readonly kind: 'locate';
  readonly averageDistance: number;
  readonly distances: ReadonlyArray<number>;
}

export type HintLevel = 'none' | 'partial' | 'full';

export interface OrderedRecallScoreDetails {
  readonly kind: 'ordered-recall';
  readonly hintsUsed: number;
  readonly correctWithoutHints: number;
  readonly answerHintLevels: ReadonlyArray<HintLevel>;
}

export type ScoreDetails = LocateScoreDetails | OrderedRecallScoreDetails;
