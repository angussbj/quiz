import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ToggleDefinition } from './ToggleDefinition';

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
 * Forces on-reveal toggles on for missed elements during review,
 * so labels/dots/symbols are visible. Only toggles with
 * hiddenBehavior 'on-reveal' are forced — others (like map flags)
 * stay as the user configured them.
 */
export function buildReviewElementToggles(
  elementToggles: Readonly<Record<string, Readonly<Record<string, boolean>>>>,
  reviewElementStates: Readonly<Record<string, ElementVisualState>>,
  toggleDefinitions: ReadonlyArray<ToggleDefinition>,
): Readonly<Record<string, Readonly<Record<string, boolean>>>> {
  const onRevealKeys = toggleDefinitions
    .filter((t) => t.hiddenBehavior === 'on-reveal')
    .map((t) => t.key);

  if (onRevealKeys.length === 0) return elementToggles;

  const overrides: Record<string, Record<string, boolean>> = {};
  for (const [id, toggles] of Object.entries(elementToggles)) {
    overrides[id] = { ...toggles };
  }
  for (const [id, state] of Object.entries(reviewElementStates)) {
    if (state === 'missed') {
      if (!overrides[id]) overrides[id] = {};
      for (const key of onRevealKeys) {
        overrides[id][key] = true;
      }
    }
  }
  return overrides;
}
