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

export interface OrderedRecallScoreDetails {
  readonly kind: 'ordered-recall';
  readonly hintsUsed: number;
  readonly correctWithoutHints: number;
}

export type ScoreDetails = LocateScoreDetails | OrderedRecallScoreDetails;
