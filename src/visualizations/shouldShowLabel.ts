import type { ElementVisualState } from './VisualizationElement';

/**
 * Whether a label should be visible for a given element state and toggle value.
 * Follows the contract in docs/element-states.md:
 * - Always show for answered states (correct, correct-second, correct-third, incorrect, missed, context)
 * - Never show for hidden
 * - Per toggle for default and highlighted
 */
export function shouldShowLabel(
  state: ElementVisualState | undefined,
  toggleValue: boolean,
): boolean {
  switch (state) {
    case 'correct':
    case 'correct-second':
    case 'correct-third':
    case 'incorrect':
    case 'missed':
    case 'context':
      return true;
    case 'hidden':
      return false;
    default:
      return toggleValue;
  }
}
