import type { ElementVisualState } from '@/visualizations/VisualizationElement';

/**
 * Returns element states as-is for review mode.
 * Quiz modes now set 'missed' and 'incorrect' directly during gameplay,
 * so no remapping is needed.
 */
export function buildReviewElementStates(
  elementStates: Readonly<Record<string, ElementVisualState>>,
): Readonly<Record<string, ElementVisualState>> {
  return elementStates;
}

/**
 * Forces all boolean display toggles on for missed elements,
 * so labels/dots/symbols are visible during review.
 */
export function buildReviewElementToggles(
  elementToggles: Readonly<Record<string, Readonly<Record<string, boolean>>>>,
  reviewElementStates: Readonly<Record<string, ElementVisualState>>,
  toggleKeys: ReadonlyArray<string>,
): Readonly<Record<string, Readonly<Record<string, boolean>>>> {
  const overrides: Record<string, Record<string, boolean>> = {};
  for (const [id, toggles] of Object.entries(elementToggles)) {
    overrides[id] = { ...toggles };
  }
  for (const [id, state] of Object.entries(reviewElementStates)) {
    if (state === 'missed') {
      if (!overrides[id]) overrides[id] = {};
      for (const key of toggleKeys) {
        overrides[id][key] = true;
      }
    }
  }
  return overrides;
}
