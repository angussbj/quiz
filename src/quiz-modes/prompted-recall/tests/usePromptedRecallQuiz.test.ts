import { renderHook, act } from '@testing-library/react';
import { usePromptedRecallQuiz } from '../usePromptedRecallQuiz';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';

const elements: ReadonlyArray<VisualizationElement> = [
  { id: 'hydrogen', label: 'Hydrogen', viewBoxCenter: { x: 0, y: 0 }, viewBoxBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, interactive: true },
  { id: 'helium', label: 'Helium', viewBoxCenter: { x: 10, y: 0 }, viewBoxBounds: { minX: 10, minY: 0, maxX: 20, maxY: 10 }, interactive: true },
  { id: 'lithium', label: 'Lithium', viewBoxCenter: { x: 20, y: 0 }, viewBoxBounds: { minX: 20, minY: 0, maxX: 30, maxY: 10 }, interactive: true },
];

const dataRows: ReadonlyArray<Readonly<Record<string, string>>> = [
  { id: 'hydrogen', name: 'Hydrogen', symbol: 'H' },
  { id: 'helium', name: 'Helium', symbol: 'He' },
  { id: 'lithium', name: 'Lithium', symbol: 'Li' },
];

function renderQuiz() {
  return renderHook(() =>
    usePromptedRecallQuiz({ elements, dataRows, answerColumn: 'name' }),
  );
}

describe('usePromptedRecallQuiz', () => {
  it('starts with first element highlighted', () => {
    const { result } = renderQuiz();
    expect(result.current.promptIndex).toBe(0);
    expect(result.current.isFinished).toBe(false);
    expect(result.current.totalPrompts).toBe(3);

    const currentId = result.current.currentElementId;
    expect(currentId).toBeDefined();
    expect(result.current.elementStates[currentId!]).toBe('highlighted');
  });

  it('auto-matches correct answer and advances', () => {
    const { result } = renderQuiz();
    const currentId = result.current.currentElementId!;
    const currentRow = dataRows.find((r) => r['id'] === currentId)!;
    const answer = currentRow['name'];

    let matched = false;
    act(() => {
      matched = result.current.handleTextInput(answer);
    });

    expect(matched).toBe(true);
    expect(result.current.promptIndex).toBe(1);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.elementStates[currentId]).toBe('correct');
  });

  it('does not match against non-current elements', () => {
    const { result } = renderQuiz();
    const currentId = result.current.currentElementId!;
    const otherRow = dataRows.find((r) => r['id'] !== currentId)!;
    const wrongElementAnswer = otherRow['name'];

    let matched = false;
    act(() => {
      matched = result.current.handleTextInput(wrongElementAnswer);
    });

    expect(matched).toBe(false);
    expect(result.current.promptIndex).toBe(0);
  });

  it('flashes incorrect on submit with wrong answer', () => {
    const { result } = renderQuiz();

    act(() => {
      result.current.handleSubmit('wrong answer');
    });

    expect(result.current.flashIncorrect).toBe(true);
    expect(result.current.promptIndex).toBe(0);
  });

  it('skip advances to next element', () => {
    const { result } = renderQuiz();
    const skippedId = result.current.currentElementId!;

    act(() => {
      result.current.handleSkip();
    });

    expect(result.current.promptIndex).toBe(1);
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.elementStates[skippedId]).toBe('missed');
  });

  it('give up finishes quiz and reveals all remaining', () => {
    const { result } = renderQuiz();

    act(() => {
      result.current.handleGiveUp();
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.score.total).toBe(3);

    for (const el of elements) {
      const state = result.current.elementStates[el.id];
      expect(state === 'missed' || state === 'correct').toBe(true);
    }
  });

  it('finishes when all elements answered', () => {
    const { result } = renderQuiz();

    for (let i = 0; i < 3; i++) {
      const currentId = result.current.currentElementId!;
      const row = dataRows.find((r) => r['id'] === currentId)!;
      act(() => {
        result.current.handleTextInput(row['name']);
      });
    }

    expect(result.current.isFinished).toBe(true);
    expect(result.current.correctCount).toBe(3);
    expect(result.current.score.percentage).toBe(100);
  });

  it('tracks wrong attempts per element', () => {
    const { result } = renderQuiz();
    const currentId = result.current.currentElementId!;

    act(() => {
      result.current.handleSubmit('wrong');
    });
    act(() => {
      result.current.handleSubmit('also wrong');
    });

    expect(result.current.wrongAttemptsPerElement[currentId]).toBe(2);
  });
});
