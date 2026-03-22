import type { ViewBoxPosition, ElementVisualState } from '@/visualizations/VisualizationElement';

/** A single feedback item shown after the user clicks in locate mode. */
export interface LocateFeedbackItem {
  readonly id: string;
  readonly elementId: string;
  readonly clickPosition: ViewBoxPosition;
  readonly targetPosition: ViewBoxPosition;
  readonly distanceKm: number;
  readonly score: number;
  readonly elementState: ElementVisualState;
  readonly createdAt: number;
}
