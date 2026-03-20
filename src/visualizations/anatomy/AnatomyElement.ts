import type { VisualizationElement, LeaderLineLabelPosition } from '../VisualizationElement';

export type AnatomyLabelPosition = LeaderLineLabelPosition;

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
