import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import { buildReviewElementStates, buildReviewElementToggles } from '../buildReviewStates';

describe('buildReviewElementStates', () => {
  it('remaps revealed to missed', () => {
    const states: Record<string, ElementVisualState> = {
      a: 'correct',
      b: 'revealed',
      c: 'hidden',
    };
    const result = buildReviewElementStates(states);
    expect(result).toEqual({
      a: 'correct',
      b: 'missed',
      c: 'hidden',
    });
  });

  it('remaps incorrect to missed', () => {
    const states: Record<string, ElementVisualState> = {
      a: 'correct',
      b: 'incorrect',
    };
    const result = buildReviewElementStates(states);
    expect(result).toEqual({
      a: 'correct',
      b: 'missed',
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
  it('forces all toggle keys on for missed elements', () => {
    const elementToggles = {
      a: { showLabels: false, showDots: false },
      b: { showLabels: true, showDots: true },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
      b: 'correct',
    };
    const result = buildReviewElementToggles(
      elementToggles,
      reviewStates,
      ['showLabels', 'showDots'],
    );
    expect(result['a']).toEqual({ showLabels: true, showDots: true });
    expect(result['b']).toEqual({ showLabels: true, showDots: true });
  });

  it('creates toggle overrides for missed elements not already in elementToggles', () => {
    const elementToggles = {};
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'missed',
    };
    const result = buildReviewElementToggles(
      elementToggles,
      reviewStates,
      ['showLabels'],
    );
    expect(result['a']).toEqual({ showLabels: true });
  });

  it('does not modify toggles for non-missed elements', () => {
    const elementToggles = {
      a: { showLabels: false },
    };
    const reviewStates: Record<string, ElementVisualState> = {
      a: 'correct',
    };
    const result = buildReviewElementToggles(
      elementToggles,
      reviewStates,
      ['showLabels'],
    );
    expect(result['a']).toEqual({ showLabels: false });
  });
});
