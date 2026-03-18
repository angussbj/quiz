import type { VisualizationElement } from '../VisualizationElement';

/**
 * Element for flag grid layouts.
 * Each cell displays a country flag image and optionally a country name.
 */
export interface FlagGridElement extends VisualizationElement {
  readonly row: number;
  readonly column: number;
  readonly flagUrl: string;
}

export function isFlagGridElement(element: VisualizationElement): element is FlagGridElement {
  return 'row' in element && 'column' in element && 'flagUrl' in element;
}
