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

function renderQuiz(overrides?: {
  orderedGroups?: ReadonlyArray<ReadonlyArray<string>>;
  highlightNext?: boolean;
}) {
  return renderHook(() =>
    useOrderedRecallSession({
      elements,
      dataRows,
      answerColumn: 'name',
      ...overrides,
    }),
  );
}

describe('useOrderedRecallSession', () => {
  describe('basic single-element groups', () => {
    it('starts with first element highlighted', () => {
      const { result } = renderQuiz();
      expect(result.current.remainingGroupIds).toEqual(['hydrogen']);
      expect(result.current.promptStart).toBe(1);
      expect(result.current.elementStates['hydrogen']).toBe('highlighted');
    });

    it('preserves CSV order — not shuffled', () => {
      const { result } = renderQuiz();

      expect(result.current.remainingGroupIds).toEqual(['hydrogen']);

      act(() => { result.current.handleTextInput('Hydrogen'); });
      expect(result.current.remainingGroupIds).toEqual(['helium']);

      act(() => { result.current.handleTextInput('Helium'); });
      expect(result.current.remainingGroupIds).toEqual(['lithium']);
    });

    it('auto-matches correct answer for current element', () => {
      const { result } = renderQuiz();

      let matched = false;
      act(() => { matched = result.current.handleTextInput('Hydrogen'); });

      expect(matched).toBe(true);
      expect(result.current.correctCount).toBe(1);
      expect(result.current.elementStates['hydrogen']).toBe('correct');
    });

    it('does not match answers for non-current elements', () => {
      const { result } = renderQuiz();

      let matched = false;
      act(() => { matched = result.current.handleTextInput('Helium'); });

      expect(matched).toBe(false);
      expect(result.current.promptStart).toBe(1);
    });

    it('flashes incorrect on submit with wrong answer', () => {
      const { result } = renderQuiz();

      act(() => { result.current.handleSubmit('Neon'); });

      expect(result.current.flashIncorrect).toBe(true);
      expect(result.current.promptStart).toBe(1);
    });

    it('skip advances to next in order', () => {
      const { result } = renderQuiz();

      act(() => { result.current.handleSkip(); });

      expect(result.current.remainingGroupIds).toEqual(['helium']);
      expect(result.current.skippedCount).toBe(1);
      expect(result.current.elementStates['hydrogen']).toBe('missed');
    });

    it('give up finishes and reveals remaining', () => {
      const { result } = renderQuiz();

      act(() => { result.current.handleGiveUp(); });

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

  describe('tie groups', () => {
    const tieGroups: ReadonlyArray<ReadonlyArray<string>> = [
      ['hydrogen'],
      ['helium', 'lithium'], // these two are tied
    ];

    it('highlights all elements in a tie group', () => {
      const { result } = renderQuiz({ orderedGroups: tieGroups });

      // Answer hydrogen first
      act(() => { result.current.handleTextInput('Hydrogen'); });

      // Now both helium and lithium should be highlighted
      expect(result.current.remainingGroupIds).toEqual(['helium', 'lithium']);
      expect(result.current.elementStates['helium']).toBe('highlighted');
      expect(result.current.elementStates['lithium']).toBe('highlighted');
    });

    it('allows answering tied elements in any order', () => {
      const { result } = renderQuiz({ orderedGroups: tieGroups });

      act(() => { result.current.handleTextInput('Hydrogen'); });

      // Answer lithium first (out of order within group)
      act(() => { result.current.handleTextInput('Lithium'); });
      expect(result.current.correctCount).toBe(2);
      expect(result.current.elementStates['lithium']).toBe('correct');
      expect(result.current.remainingGroupIds).toEqual(['helium']);

      // Answer helium
      act(() => { result.current.handleTextInput('Helium'); });
      expect(result.current.isFinished).toBe(true);
      expect(result.current.correctCount).toBe(3);
    });

    it('shows correct prompt range for tie groups', () => {
      const { result } = renderQuiz({ orderedGroups: tieGroups });

      // Group 1: single element
      expect(result.current.promptStart).toBe(1);
      expect(result.current.promptEnd).toBe(1);

      act(() => { result.current.handleTextInput('Hydrogen'); });

      // Group 2: two elements — "2-3 of 3"
      expect(result.current.promptStart).toBe(2);
      expect(result.current.promptEnd).toBe(3);

      // Answer one — "3 of 3"
      act(() => { result.current.handleTextInput('Helium'); });
      expect(result.current.promptStart).toBe(3);
      expect(result.current.promptEnd).toBe(3);
    });

    it('skip advances entire tie group', () => {
      const { result } = renderQuiz({ orderedGroups: tieGroups });

      act(() => { result.current.handleTextInput('Hydrogen'); });

      // Skip the entire tied group
      act(() => { result.current.handleSkip(); });

      expect(result.current.isFinished).toBe(true);
      expect(result.current.skippedCount).toBe(2);
      expect(result.current.elementStates['helium']).toBe('missed');
      expect(result.current.elementStates['lithium']).toBe('missed');
    });

    it('skip with partial progress marks only remaining as missed', () => {
      const { result } = renderQuiz({ orderedGroups: tieGroups });

      act(() => { result.current.handleTextInput('Hydrogen'); });
      act(() => { result.current.handleTextInput('Helium'); });

      // Skip remaining (only lithium left)
      act(() => { result.current.handleSkip(); });

      expect(result.current.isFinished).toBe(true);
      expect(result.current.correctCount).toBe(2);
      expect(result.current.skippedCount).toBe(1);
      expect(result.current.elementStates['helium']).toBe('correct');
      expect(result.current.elementStates['lithium']).toBe('missed');
    });
  });

  describe('highlightNext toggle', () => {
    it('hides current elements when highlightNext is false', () => {
      const { result } = renderQuiz({ highlightNext: false });

      expect(result.current.elementStates['hydrogen']).toBe('hidden');
      expect(result.current.elementStates['helium']).toBe('hidden');
    });

    it('still allows answering when highlightNext is false', () => {
      const { result } = renderQuiz({ highlightNext: false });

      let matched = false;
      act(() => { matched = result.current.handleTextInput('Hydrogen'); });

      expect(matched).toBe(true);
      expect(result.current.elementStates['hydrogen']).toBe('correct');
    });
  });
});
