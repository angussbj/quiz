import type { VisualizationElement } from '../VisualizationElement';

/** Pre-computed label position for leader-line labels */
export interface AnatomyLabelPosition {
  /** X position of the label text (on the margin) */
  readonly labelX: number;
  /** Y position of the label text */
  readonly labelY: number;
  /** X position of the anchor point on the bone */
  readonly anchorX: number;
  /** Y position of the anchor point on the bone */
  readonly anchorY: number;
}

/** Anatomy element with SVG path data for a bone shape */
export interface AnatomyElement extends VisualizationElement {
  /** SVG path data for the bone shape (may contain multiple space-separated sub-paths) */
  readonly svgPathData: string;
  /** Pre-computed label position for leader-line rendering */
  readonly labelPosition?: AnatomyLabelPosition;
}

export function isAnatomyElement(element: VisualizationElement): element is AnatomyElement {
  return 'svgPathData' in element;
}
