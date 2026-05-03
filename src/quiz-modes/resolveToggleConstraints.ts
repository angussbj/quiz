import type { ToggleConstraint } from './ToggleConstraint';

export interface ConstraintResult {
  /** Toggle keys forced to a specific value — UI should set and disable these. */
  readonly forcedValues: Readonly<Record<string, boolean>>;
  /** Toggle keys that cannot be turned off (last enabled in an atLeastOne group). */
  readonly preventDisable: ReadonlySet<string>;
  /** Tooltip text for constrained toggles. */
  readonly reasons: Readonly<Record<string, string>>;
}

/**
 * Resolve toggle constraints for the current mode.
 *
 * @param constraints - Constraints for the current mode
 * @param currentValues - Current boolean toggle values
 * @param selectValues - Current select toggle values (optional). For atLeastOne
 *   constraints, a select toggle counts as enabled only when set to 'on'.
 *   Values like 'hint' don't satisfy the constraint because they don't guarantee
 *   a prompt will be shown.
 */
export function resolveToggleConstraints(
  constraints: ReadonlyArray<ToggleConstraint>,
  currentValues: Readonly<Record<string, boolean>>,
  selectValues?: Readonly<Record<string, string>>,
): ConstraintResult {
  const forcedValues: Record<string, boolean> = {};
  const preventDisable = new Set<string>();
  const reasons: Record<string, string> = {};

  for (const constraint of constraints) {
    if (constraint.type === 'forced') {
      forcedValues[constraint.key] = constraint.forcedValue;
      reasons[constraint.key] = constraint.reason;
    } else if (constraint.type === 'atLeastOne') {
      const enabledKeys = constraint.keys.filter((k) => {
        if (k in currentValues) return currentValues[k];
        if (selectValues && k in selectValues) return selectValues[k] === 'on';
        return false;
      });
      if (enabledKeys.length === 0) {
        // None enabled — force the first key on
        forcedValues[constraint.keys[0]] = true;
        reasons[constraint.keys[0]] = constraint.reason;
      } else if (enabledKeys.length === 1) {
        preventDisable.add(enabledKeys[0]);
        reasons[enabledKeys[0]] = constraint.reason;
      }
    }
  }

  return { forcedValues, preventDisable, reasons };
}
