import { act, renderHook } from '@testing-library/react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { ToggleDefinition } from '../../ToggleDefinition';
import { useFreeRecallSession } from '../useFreeRecallSession';

const elements: ReadonlyArray<VisualizationElement> = [
  { id: 'paris', label: 'Paris', viewBoxCenter: { x: 100, y: 200 }, viewBoxBounds: { minX: 90, minY: 190, maxX: 110, maxY: 210 }, interactive: true },
  { id: 'berlin', label: 'Berlin', viewBoxCenter: { x: 300, y: 150 }, viewBoxBounds: { minX: 290, minY: 140, maxX: 310, maxY: 160 }, interactive: true },
  { id: 'madrid', label: 'Madrid', viewBoxCenter: { x: 50, y: 350 }, viewBoxBounds: { minX: 40, minY: 340, maxX: 60, maxY: 360 }, interactive: true },
];

const dataRows: ReadonlyArray<QuizDataRow> = [
  { id: 'paris', city: 'Paris', country: 'France' },
  { id: 'berlin', city: 'Berlin', country: 'Germany' },
  { id: 'madrid', city: 'Madrid', country: 'Spain' },
];

const toggleDefinitions: ReadonlyArray<ToggleDefinition> = [
  { key: 'showDots', label: 'Dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
];

const defaultConfig = {
  elements,
  dataRows,
  answerColumn: 'city',
  toggleDefinitions,
  toggleValues: { showDots: false },
};

describe('useFreeRecallSession', () => {
  it('initializes with active status and zero score', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    expect(result.current.session.status).toBe('active');
    expect(result.current.session.score.correct).toBe(0);
    expect(result.current.session.score.total).toBe(3);
    expect(result.current.session.correctElementIds).toEqual([]);
    expect(result.current.session.remainingElementIds).toEqual(['paris', 'berlin', 'madrid']);
  });

  it('marks element as correct on matching answer', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('Paris'));

    expect(result.current.session.correctElementIds).toEqual(['paris']);
    expect(result.current.session.elementStates['paris']).toBe('correct');
    expect(result.current.session.score.correct).toBe(1);
    expect(result.current.session.lastMatchedElementId).toBe('paris');
    expect(result.current.session.lastMatchedAnswer).toBe('Paris');
  });

  it('does not match non-existent answer', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('London'));

    expect(result.current.session.correctElementIds).toEqual([]);
  });

  it('removes matched element from remaining', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('Berlin'));

    expect(result.current.session.remainingElementIds).toEqual(['paris', 'madrid']);
  });

  it('does not match already-answered element', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('Paris'));
    act(() => result.current.handleTextAnswer('Paris'));

    expect(result.current.session.correctElementIds).toEqual(['paris']);
  });

  it('finishes when all elements are answered', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('Paris'));
    act(() => result.current.handleTextAnswer('Berlin'));
    act(() => result.current.handleTextAnswer('Madrid'));

    expect(result.current.session.status).toBe('finished');
    expect(result.current.session.score.percentage).toBe(100);
  });

  it('reveals all remaining on give up', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleTextAnswer('Paris'));
    act(() => result.current.handleGiveUp());

    expect(result.current.session.status).toBe('finished');
    expect(result.current.session.elementStates['paris']).toBe('correct');
    expect(result.current.session.elementStates['berlin']).toBe('revealed');
    expect(result.current.session.elementStates['madrid']).toBe('revealed');
  });

  it('ignores answers after give up', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleGiveUp());
    act(() => result.current.handleTextAnswer('Paris'));

    expect(result.current.session.correctElementIds).toEqual([]);
  });

  it('resolves elementToggles for on-reveal behavior', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    // Before answer: showDots is OFF, behavior is on-reveal → false for all
    expect(result.current.elementToggles['paris']?.showDots).toBe(false);

    act(() => result.current.handleTextAnswer('Paris'));

    // After answer: paris revealed → showDots true, others still false
    expect(result.current.elementToggles['paris']?.showDots).toBe(true);
    expect(result.current.elementToggles['berlin']?.showDots).toBe(false);
  });

  it('resolves all elementToggles to true when toggle is ON', () => {
    const config = { ...defaultConfig, toggleValues: { showDots: true } };
    const { result } = renderHook(() => useFreeRecallSession(config));

    expect(result.current.elementToggles['paris']?.showDots).toBe(true);
    expect(result.current.elementToggles['berlin']?.showDots).toBe(true);
  });

  it('resolves elementToggles for all on give up', () => {
    const { result } = renderHook(() => useFreeRecallSession(defaultConfig));

    act(() => result.current.handleGiveUp());

    expect(result.current.elementToggles['paris']?.showDots).toBe(true);
    expect(result.current.elementToggles['berlin']?.showDots).toBe(true);
    expect(result.current.elementToggles['madrid']?.showDots).toBe(true);
  });
});
