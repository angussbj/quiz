import type { VisualizationElement } from '../VisualizationElement';

/**
 * A star system element in the 3D star map visualization.
 * Extends VisualizationElement with stellar properties for rendering.
 */
export interface StarMap3DElement extends VisualizationElement {
  /** Spectral class letter: O, B, A, F, G, K, M, D (white dwarf), or '' (unknown) */
  readonly spectralClass: string;
  /** Total system luminosity in solar luminosities */
  readonly luminosity: number;
  /** Apparent magnitude of the brightest component */
  readonly magnitude: number;
  /** Number of stars in the system */
  readonly starCount: number;
  /** Distance from Sol in light-years */
  readonly distanceLy: number;
  /** Full spectral type string (e.g., "G2V", "M5Ve") */
  readonly spectralType: string;
}

export function isStarMap3DElement(el: VisualizationElement): el is StarMap3DElement {
  return 'spectralClass' in el && 'luminosity' in el && 'distanceLy' in el;
}
