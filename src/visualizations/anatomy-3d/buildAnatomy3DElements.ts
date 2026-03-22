import type { VisualizationElement } from '../VisualizationElement';
import { buildBone3DElements } from '@/quiz-definitions/quiz-specific-logic/bones3d';

/**
 * Build Anatomy3DElement objects from CSV rows for the anatomy-3d visualisation.
 *
 * The column mappings are not used (bone data has a fixed schema). Toggle state
 * is not available at this layer — grouping toggles are applied later by
 * buildBone3DElements in quiz-specific-logic/bones3d.ts when building the active
 * element list. This entry point is called by buildElements() during initial load
 * with default (all-true) toggles.
 */
export function buildAnatomy3DElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  _columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<VisualizationElement> {
  // Default toggles: show everything, bilateral and numbered grouping on
  const defaultToggles = {
    groupBilateral: true,
    groupNumbered: true,
    showTeeth: false,
    showCostalCart: false,
    showSesamoids: false,
    showSkull: true,
    showTorso: true,
    showLimbs: true,
    showHands: true,
    showFeet: true,
  };
  return buildBone3DElements(rows, defaultToggles);
}
