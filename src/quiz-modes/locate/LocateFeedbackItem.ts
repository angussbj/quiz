import type { ViewBoxPosition } from '@/visualizations/VisualizationElement';

/** A single feedback item shown after the user clicks on the map. */
export interface LocateFeedbackItem {
  readonly id: string;
  readonly elementId: string;
  readonly clickPosition: ViewBoxPosition;
  readonly targetPosition: ViewBoxPosition;
  readonly distanceKm: number;
  readonly score: number;
  readonly createdAt: number;
}
