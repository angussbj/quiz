import type { ElementVisualState } from '@/visualizations/VisualizationElement';

/**
 * Remaps element states for review mode:
 * - 'revealed' → 'missed' (free recall / identify: items never answered)
 * - 'incorrect' → 'missed' (locate: items the user got wrong or skipped)
 */
export function buildReviewElementStates(
  elementStates: Readonly<Record<string, ElementVisualState>>,
): Readonly<Record<string, ElementVisualState>> {
  const states: Record<string, ElementVisualState> = {};
  for (const [id, state] of Object.entries(elementStates)) {
    if (state === 'revealed' || state === 'incorrect') {
      states[id] = 'missed';
    } else {
      states[id] = state;
    }
  }
  return states;
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
