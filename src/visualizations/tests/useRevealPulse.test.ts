import { renderHook, act } from '@testing-library/react';
import { useRevealPulse } from '../useRevealPulse';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useRevealPulse', () => {
  it('starts with no revealing element IDs', () => {
    const { result } = renderHook(() => useRevealPulse());
    expect(result.current.revealingElementIds).toEqual([]);
  });

  it('sets revealing IDs after trigger', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a', 'b'], 100);
    });
    expect(result.current.revealingElementIds).toEqual(['a', 'b']);
  });

  it('clears revealing IDs after animation duration', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a'], 100);
    });
    expect(result.current.revealingElementIds).toEqual(['a']);

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.revealingElementIds).toEqual([]);
  });

  it('skips animation when more than 10% of total elements are revealed', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a', 'b', 'c', 'd', 'e', 'f'], 50);
    });
    // 6/50 = 12% > 10%, should be skipped
    expect(result.current.revealingElementIds).toEqual([]);
  });

  it('allows animation when exactly 10% of elements are revealed', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a', 'b', 'c', 'd', 'e'], 50);
    });
    // 5/50 = 10%, should animate
    expect(result.current.revealingElementIds).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('skips empty ID arrays', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal([], 100);
    });
    expect(result.current.revealingElementIds).toEqual([]);
  });

  it('replaces previous animation when triggered again', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a'], 100);
    });
    expect(result.current.revealingElementIds).toEqual(['a']);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      result.current.triggerReveal(['b'], 100);
    });
    expect(result.current.revealingElementIds).toEqual(['b']);

    // Original timer should be cleared, new timer starts from now
    act(() => {
      jest.advanceTimersByTime(700);
    });
    // 500 + 700 = 1200ms since first trigger, but second trigger resets
    // 700ms since second trigger, so still showing
    expect(result.current.revealingElementIds).toEqual(['b']);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    // 1200ms since second trigger, should be cleared
    expect(result.current.revealingElementIds).toEqual([]);
  });

  it('always animates single-element reveals even if percentage exceeds threshold', () => {
    const { result } = renderHook(() => useRevealPulse());
    act(() => {
      result.current.triggerReveal(['a'], 5);
    });
    // 1/5 = 20% > 10%, but single elements always animate
    expect(result.current.revealingElementIds).toEqual(['a']);
  });
});
