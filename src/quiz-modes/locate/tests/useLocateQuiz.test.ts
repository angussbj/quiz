import { act, renderHook } from '@testing-library/react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { MapElement } from '@/visualizations/map/MapElement';
import { useLocateQuiz } from '../useLocateQuiz';

function makeMapElement(id: string, lat: number, lng: number): MapElement {
  return {
    id,
    label: `City ${id}`,
    viewBoxCenter: { x: lng, y: -lat },
    viewBoxBounds: { minX: lng - 0.5, minY: -lat - 0.5, maxX: lng + 0.5, maxY: -lat + 0.5 },
    interactive: true,
    geoCoordinates: { latitude: lat, longitude: lng },
    svgPathData: '',
    code: id,
  };
}

function makeNonInteractiveElement(id: string): VisualizationElement {
  return {
    id,
    label: `Element ${id}`,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    interactive: false,
  };
}

const paris = makeMapElement('paris', 48.8566, 2.3522);
const london = makeMapElement('london', 51.5074, -0.1278);
const berlin = makeMapElement('berlin', 52.52, 13.405);

const elements: ReadonlyArray<VisualizationElement> = [paris, london, berlin];

describe('useLocateQuiz', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with first target and correct counts', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    expect(result.current.currentTarget).toBeDefined();
    expect(result.current.currentTargetIndex).toBe(0);
    expect(result.current.totalTargets).toBe(3);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.distances).toEqual([]);
    expect(result.current.feedbackItems).toEqual([]);
  });

  it('only includes interactive elements as targets', () => {
    const mixedElements = [paris, makeNonInteractiveElement('border'), london];
    const { result } = renderHook(() => useLocateQuiz(mixedElements));

    expect(result.current.totalTargets).toBe(2);
  });

  it('interactive elements start hidden, non-interactive start context', () => {
    const mixedElements = [paris, makeNonInteractiveElement('border'), london];
    const { result } = renderHook(() => useLocateQuiz(mixedElements));

    expect(result.current.elementStates['paris']).toBe('hidden');
    expect(result.current.elementStates['london']).toBe('hidden');
    expect(result.current.elementStates['border']).toBe('context');
  });

  it('records distance and advances target on position click', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));
    const firstTarget = result.current.currentTarget!;

    // Click exactly on the target (distance ≈ 0)
    act(() => {
      result.current.handlePositionClick(firstTarget.viewBoxCenter);
    });

    expect(result.current.currentTargetIndex).toBe(1);
    expect(result.current.distances).toHaveLength(1);
    expect(result.current.distances[0]).toBeLessThan(1); // ~0 km
  });

  it('marks close click as correct', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));
    const firstTarget = result.current.currentTarget!;

    act(() => {
      result.current.handlePositionClick(firstTarget.viewBoxCenter);
    });

    expect(result.current.elementStates[firstTarget.id]).toBe('correct');
    expect(result.current.correctCount).toBe(1);
  });

  it('marks far click as incorrect', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));
    const firstTarget = result.current.currentTarget!;

    // Click very far from the target (shift by ~10 degrees ≈ >1000km)
    act(() => {
      result.current.handlePositionClick({
        x: firstTarget.viewBoxCenter.x + 10,
        y: firstTarget.viewBoxCenter.y + 10,
      });
    });

    expect(result.current.elementStates[firstTarget.id]).toBe('incorrect');
  });

  it('creates feedback item on click that expires after 2s', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));
    const firstTarget = result.current.currentTarget!;

    act(() => {
      result.current.handlePositionClick(firstTarget.viewBoxCenter);
    });

    expect(result.current.feedbackItems).toHaveLength(1);
    expect(result.current.feedbackItems[0].elementId).toBe(firstTarget.id);

    // Advance timers past the feedback duration
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(result.current.feedbackItems).toHaveLength(0);
  });

  it('finishes after all targets are answered', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    for (let i = 0; i < 3; i++) {
      const target = result.current.currentTarget!;
      act(() => {
        result.current.handlePositionClick(target.viewBoxCenter);
      });
    }

    expect(result.current.isFinished).toBe(true);
    expect(result.current.currentTarget).toBeUndefined();
    expect(result.current.distances).toHaveLength(3);
  });

  it('ignores clicks when finished', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    // Finish the quiz
    for (let i = 0; i < 3; i++) {
      const target = result.current.currentTarget!;
      act(() => {
        result.current.handlePositionClick(target.viewBoxCenter);
      });
    }

    // Try clicking again
    act(() => {
      result.current.handlePositionClick({ x: 0, y: 0 });
    });

    expect(result.current.distances).toHaveLength(3);
  });

  it('skip advances without recording a distance', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));
    const firstTarget = result.current.currentTarget!;

    act(() => {
      result.current.handleSkip();
    });

    expect(result.current.currentTargetIndex).toBe(1);
    expect(result.current.distances).toHaveLength(0);
    expect(result.current.elementStates[firstTarget.id]).toBe('incorrect');
  });

  it('give up finishes the quiz and marks remaining as incorrect', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    // Answer one, then give up
    const firstTarget = result.current.currentTarget!;
    act(() => {
      result.current.handlePositionClick(firstTarget.viewBoxCenter);
    });

    act(() => {
      result.current.handleGiveUp();
    });

    expect(result.current.isFinished).toBe(true);
    // The first target was answered (correct), rest should be missed
    expect(result.current.elementStates[firstTarget.id]).toBe('correct');
    // All other interactive elements should be missed (gave up)
    const otherIds = elements
      .filter((e) => e.interactive && e.id !== firstTarget.id)
      .map((e) => e.id);
    for (const id of otherIds) {
      expect(result.current.elementStates[id]).toBe('missed');
    }
  });

  it('computes average distance correctly', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    // Click on each target exactly
    for (let i = 0; i < 3; i++) {
      const target = result.current.currentTarget!;
      act(() => {
        result.current.handlePositionClick(target.viewBoxCenter);
      });
    }

    expect(result.current.averageDistance).toBeLessThan(1);
  });

  it('computes total score correctly', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    // Click exactly on each target (score ≈ 1.0 each)
    for (let i = 0; i < 3; i++) {
      const target = result.current.currentTarget!;
      act(() => {
        result.current.handlePositionClick(target.viewBoxCenter);
      });
    }

    expect(result.current.totalScore).toBeCloseTo(3, 1);
  });

  it('handles empty elements array', () => {
    const { result } = renderHook(() => useLocateQuiz([]));

    expect(result.current.totalTargets).toBe(0);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.currentTarget).toBeUndefined();
  });

  it('multiple feedback items can exist simultaneously', () => {
    const { result } = renderHook(() => useLocateQuiz(elements));

    // Click twice quickly
    const target1 = result.current.currentTarget!;
    act(() => {
      result.current.handlePositionClick(target1.viewBoxCenter);
    });

    const target2 = result.current.currentTarget!;
    act(() => {
      result.current.handlePositionClick(target2.viewBoxCenter);
    });

    expect(result.current.feedbackItems).toHaveLength(2);

    // After 2s, first should expire
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    // Both should have expired since they were created close together
    expect(result.current.feedbackItems).toHaveLength(0);
  });
});
