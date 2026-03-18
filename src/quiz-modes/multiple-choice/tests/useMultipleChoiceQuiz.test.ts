import { renderHook, act } from '@testing-library/react';
import { useMultipleChoiceQuiz } from '../useMultipleChoiceQuiz';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';

function makeElements(count: number): ReadonlyArray<VisualizationElement> {
  return Array.from({ length: count }, (_, i) => ({
    id: `el-${i}`,
    label: `Element ${i}`,
    viewBoxCenter: { x: i * 10, y: 0 },
    viewBoxBounds: { minX: i * 10, minY: 0, maxX: i * 10 + 10, maxY: 10 },
    interactive: true,
  }));
}

describe('useMultipleChoiceQuiz', () => {
  it('initializes with first question', () => {
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    expect(result.current.isFinished).toBe(false);
    expect(result.current.promptIndex).toBe(0);
    expect(result.current.totalPrompts).toBe(10);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.currentQuestion).toBeDefined();
  });

  it('provides correct number of choices', () => {
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    expect(result.current.currentQuestion?.choices).toHaveLength(4);
  });

  it('includes target in choices', () => {
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    const question = result.current.currentQuestion;
    expect(question).toBeDefined();
    const targetInChoices = question?.choices.some(
      (c) => c.id === question.targetElement.id,
    );
    expect(targetInChoices).toBe(true);
  });

  it('advances on correct answer', () => {
    jest.useFakeTimers();
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    const question = result.current.currentQuestion;
    const correctIndex = question?.choices.findIndex(
      (c) => c.id === question?.targetElement.id,
    );

    act(() => {
      result.current.handleChoiceSelect(correctIndex ?? 0);
    });

    // Flash correct briefly
    expect(result.current.flashCorrectIndex).toBe(correctIndex);

    // Advance after delay
    act(() => { jest.advanceTimersByTime(500); });

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(1);

    jest.useRealTimers();
  });

  it('shows incorrect flash on wrong answer', () => {
    jest.useFakeTimers();
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    const question = result.current.currentQuestion;
    const wrongIndex = question?.choices.findIndex(
      (c) => c.id !== question?.targetElement.id,
    );

    act(() => {
      result.current.handleChoiceSelect(wrongIndex ?? 0);
    });

    expect(result.current.flashIncorrectIndex).toBe(wrongIndex);
    expect(result.current.flashCorrectIndex).not.toBeNull();

    // Advances after longer delay
    act(() => { jest.advanceTimersByTime(1200); });

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(0);

    jest.useRealTimers();
  });

  it('handles skip', () => {
    jest.useFakeTimers();
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    act(() => {
      result.current.handleSkip();
    });
    act(() => { jest.advanceTimersByTime(0); });

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(0);

    jest.useRealTimers();
  });

  it('handles give up', () => {
    const elements = makeElements(10);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 4));

    act(() => {
      result.current.handleGiveUp();
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.promptIndex).toBe(10);
  });

  it('computes score correctly', () => {
    jest.useFakeTimers();
    const elements = makeElements(3);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 3));

    // Answer first correctly
    const q1 = result.current.currentQuestion;
    const correct1 = q1?.choices.findIndex((c) => c.id === q1?.targetElement.id) ?? 0;
    act(() => { result.current.handleChoiceSelect(correct1); });
    act(() => { jest.advanceTimersByTime(500); });

    // Skip second
    act(() => { result.current.handleSkip(); });
    act(() => { jest.advanceTimersByTime(0); });

    // Answer third correctly
    const q3 = result.current.currentQuestion;
    const correct3 = q3?.choices.findIndex((c) => c.id === q3?.targetElement.id) ?? 0;
    act(() => { result.current.handleChoiceSelect(correct3); });
    act(() => { jest.advanceTimersByTime(500); });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.score.correct).toBe(2);
    expect(result.current.score.total).toBe(3);
    expect(result.current.score.percentage).toBe(67);

    jest.useRealTimers();
  });

  it('caps choices at available elements when fewer than requested', () => {
    const elements = makeElements(3);
    const { result } = renderHook(() => useMultipleChoiceQuiz(elements, 6));

    // Should use all 3 elements as choices (can't have 6)
    expect(result.current.currentQuestion?.choices).toHaveLength(3);
  });
});
