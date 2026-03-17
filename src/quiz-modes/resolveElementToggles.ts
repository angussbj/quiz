import type { ToggleDefinition } from './ToggleDefinition';

interface ElementQuizState {
  readonly isAnswered: boolean;
  readonly wrongAttempts: number;
}

/**
 * Resolves per-element toggle values from toggle definitions and quiz state.
 *
 * When a toggle is ON: true for all elements (global toggle applies).
 * When a toggle is OFF: hiddenBehavior determines per-element value:
 *   - 'never': always false
 *   - 'on-reveal': true when element is answered (correct or skipped)
 *   - { hintAfter: n }: true after n wrong attempts on that element
 */
export function resolveElementToggles(
  toggleDefinitions: ReadonlyArray<ToggleDefinition>,
  globalToggles: Readonly<Record<string, boolean>>,
  elementStates: Readonly<Record<string, ElementQuizState>>,
): Readonly<Record<string, Readonly<Record<string, boolean>>>> {
  const togglesWithBehavior = toggleDefinitions.filter(
    (t) => t.hiddenBehavior !== undefined && !globalToggles[t.key],
  );

  if (togglesWithBehavior.length === 0) {
    return {};
  }

  const result: Record<string, Record<string, boolean>> = {};

  for (const [elementId, state] of Object.entries(elementStates)) {
    const elementOverrides: Record<string, boolean> = {};
    let hasOverrides = false;

    for (const toggle of togglesWithBehavior) {
      const behavior = toggle.hiddenBehavior!;
      let value: boolean;

      if (behavior === 'never') {
        value = false;
      } else if (behavior === 'on-reveal') {
        value = state.isAnswered;
      } else {
        value = state.wrongAttempts >= behavior.hintAfter;
      }

      elementOverrides[toggle.key] = value;
      hasOverrides = true;
    }

    if (hasOverrides) {
      result[elementId] = elementOverrides;
    }
  }

  return result;
}
