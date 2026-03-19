import { renderHook, act } from '@testing-library/react';
import { useOrderedRecallSession } from '../useOrderedRecallSession';
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
    useOrderedRecallSession({ elements, dataRows, answerColumn: 'name' }),
  );
}

describe('useOrderedRecallSession', () => {
  it('starts with first element in CSV order (hydrogen)', () => {
    const { result } = renderQuiz();
    expect(result.current.currentElementId).toBe('hydrogen');
    expect(result.current.promptIndex).toBe(0);
    expect(result.current.elementStates['hydrogen']).toBe('highlighted');
  });

  it('preserves CSV order — not shuffled', () => {
    const { result } = renderQuiz();

    // First must be hydrogen
    expect(result.current.currentElementId).toBe('hydrogen');

    act(() => {
      result.current.handleTextInput('Hydrogen');
    });

    // Second must be helium
    expect(result.current.currentElementId).toBe('helium');

    act(() => {
      result.current.handleTextInput('Helium');
    });

    // Third must be lithium
    expect(result.current.currentElementId).toBe('lithium');
  });

  it('auto-matches correct answer for current element', () => {
    const { result } = renderQuiz();

    let matched = false;
    act(() => {
      matched = result.current.handleTextInput('Hydrogen');
    });

    expect(matched).toBe(true);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.elementStates['hydrogen']).toBe('correct');
  });

  it('does not match answers for non-current elements', () => {
    const { result } = renderQuiz();

    let matched = false;
    act(() => {
      matched = result.current.handleTextInput('Helium');
    });

    expect(matched).toBe(false);
    expect(result.current.promptIndex).toBe(0);
  });

  it('flashes incorrect on submit with wrong answer', () => {
    const { result } = renderQuiz();

    act(() => {
      result.current.handleSubmit('Neon');
    });

    expect(result.current.flashIncorrect).toBe(true);
    expect(result.current.promptIndex).toBe(0);
  });

  it('skip advances to next in order', () => {
    const { result } = renderQuiz();

    act(() => {
      result.current.handleSkip();
    });

    expect(result.current.currentElementId).toBe('helium');
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.elementStates['hydrogen']).toBe('missed');
  });

  it('give up finishes and reveals remaining', () => {
    const { result } = renderQuiz();

    act(() => {
      result.current.handleGiveUp();
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.elementStates['hydrogen']).toBe('missed');
    expect(result.current.elementStates['helium']).toBe('missed');
    expect(result.current.elementStates['lithium']).toBe('missed');
  });

  it('finishes with 100% when all answered correctly in order', () => {
    const { result } = renderQuiz();

    act(() => { result.current.handleTextInput('Hydrogen'); });
    act(() => { result.current.handleTextInput('Helium'); });
    act(() => { result.current.handleTextInput('Lithium'); });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.correctCount).toBe(3);
    expect(result.current.score.percentage).toBe(100);
  });
});
