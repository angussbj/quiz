/** A single feedback item shown after the user clicks on a grid element in locate mode. */
export interface GridLocateFeedbackItem {
  readonly id: string;
  /** Visual center of the clicked element (SVG viewBox coordinates). */
  readonly clickedCenter: { readonly x: number; readonly y: number };
  /** Visual center of the target element (SVG viewBox coordinates). */
  readonly targetCenter: { readonly x: number; readonly y: number };
  /** Manhattan distance in the true 32-column grid. */
  readonly manhattanDistance: number;
  readonly createdAt: number;
}
