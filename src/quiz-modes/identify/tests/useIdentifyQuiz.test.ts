import { renderHook, act } from '@testing-library/react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import { useIdentifyQuiz } from '../useIdentifyQuiz';

function makeElements(count: number): ReadonlyArray<VisualizationElement> {
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    label: `Element ${i}`,
    viewBoxCenter: { x: i * 100, y: 0 },
    viewBoxBounds: { minX: i * 100 - 10, minY: -10, maxX: i * 100 + 10, maxY: 10 },
    interactive: true,
  }));
}

describe('useIdentifyQuiz', () => {
  it('initializes with first prompt', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    expect(result.current.currentElementId).toBeDefined();
    expect(result.current.promptIndex).toBe(0);
    expect(result.current.totalPrompts).toBe(3);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.isFinished).toBe(false);
  });

  it('advances on correct click', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const firstId = result.current.currentElementId!;
    act(() => result.current.handleElementClick(firstId));

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.elementStates[firstId]).toBe('correct');
  });

  it('does not advance on incorrect click', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const firstId = result.current.currentElementId!;
    const wrongId = elements.find((e) => e.id !== firstId)!.id;

    act(() => result.current.handleElementClick(wrongId));

    expect(result.current.promptIndex).toBe(0);
    expect(result.current.currentElementId).toBe(firstId);
    expect(result.current.correctCount).toBe(0);
  });

  it('tracks wrong attempts per element', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    const wrongId = elements.find((e) => e.id !== currentId)!.id;

    act(() => result.current.handleElementClick(wrongId));
    act(() => result.current.handleElementClick(wrongId));

    expect(result.current.wrongAttemptsPerElement[currentId]).toBe(2);
  });

  it('sets flash incorrect ID on wrong click', () => {
    jest.useFakeTimers();
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    const wrongId = elements.find((e) => e.id !== currentId)!.id;

    act(() => result.current.handleElementClick(wrongId));
    expect(result.current.flashIncorrectId).toBe(wrongId);

    act(() => jest.advanceTimersByTime(900));
    expect(result.current.flashIncorrectId).toBeNull();

    jest.useRealTimers();
  });

  it('skip advances without counting as correct', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const firstId = result.current.currentElementId!;
    act(() => result.current.handleSkip());

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.elementStates[firstId]).toBe('incorrect');
  });

  it('give up reveals all remaining', () => {
    const elements = makeElements(5);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    // Answer first one correctly
    const firstId = result.current.currentElementId!;
    act(() => result.current.handleElementClick(firstId));

    act(() => result.current.handleGiveUp());

    expect(result.current.isFinished).toBe(true);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.skippedCount).toBe(4);
  });

  it('finishes when all prompts answered', () => {
    const elements = makeElements(2);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    // Answer both correctly in order
    act(() => result.current.handleElementClick(result.current.currentElementId!));
    act(() => result.current.handleElementClick(result.current.currentElementId!));

    expect(result.current.isFinished).toBe(true);
    expect(result.current.score.percentage).toBe(100);
  });

  it('ignores clicks on already-answered elements', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const firstId = result.current.currentElementId!;
    act(() => result.current.handleElementClick(firstId));

    // Clicking the already-correct element should not count as wrong
    const secondId = result.current.currentElementId!;
    act(() => result.current.handleElementClick(firstId));

    expect(result.current.currentElementId).toBe(secondId);
    expect(result.current.wrongAttemptsPerElement[secondId] ?? 0).toBe(0);
  });

  it('ignores clicks when finished', () => {
    const elements = makeElements(1);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    act(() => result.current.handleElementClick(result.current.currentElementId!));
    expect(result.current.isFinished).toBe(true);

    // Should not throw or change state
    act(() => result.current.handleElementClick('el-0'));
    expect(result.current.correctCount).toBe(1);
  });

  it('sets unanswered elements to default state', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    for (const el of elements) {
      if (el.id !== currentId) {
        expect(result.current.elementStates[el.id]).toBe('default');
      }
    }
  });

  it('uses correct-second state after one wrong attempt', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    const wrongId = elements.find((e) => e.id !== currentId)!.id;

    // One wrong attempt, then correct
    act(() => result.current.handleElementClick(wrongId));
    act(() => result.current.handleElementClick(currentId));

    expect(result.current.elementStates[currentId]).toBe('correct-second');
  });

  it('uses correct-third state after two wrong attempts', () => {
    const elements = makeElements(4);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    const wrongIds = elements.filter((e) => e.id !== currentId).map((e) => e.id);

    // Two wrong attempts, then correct
    act(() => result.current.handleElementClick(wrongIds[0]));
    act(() => result.current.handleElementClick(wrongIds[1]));
    act(() => result.current.handleElementClick(currentId));

    expect(result.current.elementStates[currentId]).toBe('correct-third');
  });

  it('auto-reveals after 3 wrong attempts', () => {
    jest.useFakeTimers();
    const elements = makeElements(5);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    const currentId = result.current.currentElementId!;
    const wrongIds = elements.filter((e) => e.id !== currentId).map((e) => e.id);

    // Three wrong attempts
    act(() => result.current.handleElementClick(wrongIds[0]));
    act(() => result.current.handleElementClick(wrongIds[1]));
    act(() => result.current.handleElementClick(wrongIds[2]));

    // Flash incorrect first
    expect(result.current.flashIncorrectId).toBe(wrongIds[2]);

    // After flash clears, auto-reveal shows
    act(() => jest.advanceTimersByTime(900));
    expect(result.current.flashIncorrectId).toBeNull();
    expect(result.current.autoRevealId).toBe(currentId);
    expect(result.current.elementStates[currentId]).toBe('incorrect');

    // After auto-reveal duration, advance to next prompt
    act(() => jest.advanceTimersByTime(1600));
    expect(result.current.autoRevealId).toBeNull();
    expect(result.current.promptIndex).toBe(1);

    jest.useRealTimers();
  });

  it('calculates score correctly', () => {
    const elements = makeElements(4);
    const { result } = renderHook(() => useIdentifyQuiz(elements));

    // Correct first
    act(() => result.current.handleElementClick(result.current.currentElementId!));
    // Skip second
    act(() => result.current.handleSkip());
    // Correct third
    act(() => result.current.handleElementClick(result.current.currentElementId!));
    // Skip fourth
    act(() => result.current.handleSkip());

    expect(result.current.score.correct).toBe(2);
    expect(result.current.score.total).toBe(4);
    expect(result.current.score.percentage).toBe(50);
  });
});
