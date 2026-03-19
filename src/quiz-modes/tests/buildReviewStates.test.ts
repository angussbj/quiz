import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { ToggleDefinition } from '../ToggleDefinition';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';

function makeToggleDef(key: string, hiddenBehavior: ToggleDefinition['hiddenBehavior']): ToggleDefinition {
  return { key, label: key, defaultValue: false, group: 'display', hiddenBehavior };
}

describe('buildReviewElementStates', () => {
  it('passes through all states unchanged', () => {
    const states: Record<string, ElementVisualState> = {
      a: 'correct',
      b: 'missed',
      c: 'incorrect',
      d: 'hidden',
    };
    const result = buildReviewElementStates(states);
    expect(result).toEqual({
      a: 'correct',
      b: 'missed',
      c: 'incorrect',
      d: 'hidden',
    });
  });

  it('preserves correct and highlighted states', () => {
    const states: Record<string, ElementVisualState> = {
      a: 'correct',
      b: 'highlighted',
    };
    const result = buildReviewElementStates(states);
    expect(result).toEqual({
      a: 'correct',
      b: 'highlighted',
    });
  });
});

describe('buildReviewElementToggles', () => {
  it('forces on-reveal toggle keys on for missed elements', () => {
    const elementToggles = {
      a: { showLabels: false, showDots: false },
      b: { showLabels: true, showDots: true },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
      b: 'correct',
    };
    const toggleDefs = [
      makeToggleDef('showLabels', 'on-reveal'),
      makeToggleDef('showDots', 'on-reveal'),
    ];
    const result = buildReviewElementToggles(elementToggles, reviewStates, toggleDefs);
    expect(result['a']).toEqual({ showLabels: true, showDots: true });
    expect(result['b']).toEqual({ showLabels: true, showDots: true });
  });

  it('does not force toggles with hiddenBehavior "never" for missed elements', () => {
    const elementToggles = {
      a: { showLabels: false, showFlags: false },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
    };
    const toggleDefs = [
      makeToggleDef('showLabels', 'on-reveal'),
      makeToggleDef('showFlags', 'never'),
    ];
    const result = buildReviewElementToggles(elementToggles, reviewStates, toggleDefs);
    expect(result['a']).toEqual({ showLabels: true, showFlags: false });
  });

  it('creates toggle overrides for missed elements not already in elementToggles', () => {
    const elementToggles = {};
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
    };
    const toggleDefs = [makeToggleDef('showLabels', 'on-reveal')];
    const result = buildReviewElementToggles(elementToggles, reviewStates, toggleDefs);
    expect(result['a']).toEqual({ showLabels: true });
  });

  it('does not modify toggles for non-missed elements', () => {
    const elementToggles = {
      a: { showLabels: false },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'correct',
    };
    const toggleDefs = [makeToggleDef('showLabels', 'on-reveal')];
    const result = buildReviewElementToggles(elementToggles, reviewStates, toggleDefs);
    expect(result['a']).toEqual({ showLabels: false });
  });

  it('returns elementToggles unchanged when no on-reveal toggles exist', () => {
    const elementToggles = {
      a: { showFlags: false },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
    };
    const toggleDefs = [makeToggleDef('showFlags', 'never')];
    const result = buildReviewElementToggles(elementToggles, reviewStates, toggleDefs);
    expect(result).toBe(elementToggles);
  });
});
