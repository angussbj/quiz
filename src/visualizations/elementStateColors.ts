import type { ElementVisualState } from './VisualizationElement';

export interface ElementStateColors {
  readonly main: string;
  readonly background: string;
  readonly text: string;
}

/**
 * Color mapping for all element visual states except 'hidden'.
 * Access as STATUS_COLORS[state].main / .background / .text.
 * Callers must handle 'hidden' and undefined states before indexing.
 */
export const STATUS_COLORS: Readonly<Record<Exclude<ElementVisualState, 'hidden'>, ElementStateColors>> = {
  default:          { main: 'var(--color-border)',         background: 'var(--color-bg-tertiary)',        text: 'var(--color-text-muted)'     },
  context:          { main: 'var(--color-context)',        background: 'var(--color-context-bg)',         text: 'var(--color-text-muted)'     },
  highlighted:      { main: 'var(--color-highlight)',      background: 'var(--color-highlight-bg)',       text: 'var(--color-text-primary)'   },
  correct:          { main: 'var(--color-correct)',        background: 'var(--color-correct-bg)',         text: 'var(--color-correct)'        },
  'correct-second': { main: 'var(--color-correct-second)', background: 'var(--color-correct-second-bg)', text: 'var(--color-correct-second)' },
  'correct-third':  { main: 'var(--color-correct-third)',  background: 'var(--color-correct-third-bg)',  text: 'var(--color-correct-third)'  },
  incorrect:        { main: 'var(--color-incorrect)',      background: 'var(--color-incorrect-bg)',       text: 'var(--color-incorrect)'      },
  missed:           { main: 'var(--color-missed)',         background: 'var(--color-missed-bg)',          text: 'var(--color-missed)'         },
};
