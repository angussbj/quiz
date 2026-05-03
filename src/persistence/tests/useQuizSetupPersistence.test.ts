import { renderHook, act } from '@testing-library/react';
import { useQuizSetupPersistence } from '../useQuizSetupPersistence';
import type { QuizSetupState } from '../QuizSetupState';

const defaultState: QuizSetupState = {
  difficultySlot: 0,
  mode: 'identify',
  toggleValues: {},
  selectValues: {},
  rangeMin: undefined,
  rangeMax: undefined,
  selectedGroups: [],
};

beforeEach(() => {
  localStorage.clear();
});

describe('useQuizSetupPersistence', () => {
  it('returns the default state when nothing is stored', () => {
    const { result } = renderHook(() =>
      useQuizSetupPersistence('world-capitals', defaultState),
    );
    expect(result.current.setupState).toEqual(defaultState);
  });

  it('persists state to localStorage with the correct key', () => {
    const { result } = renderHook(() =>
      useQuizSetupPersistence('world-capitals', defaultState),
    );
    act(() => {
      result.current.setSetupState({ ...defaultState, difficultySlot: 2, mode: 'locate' });
    });
    const stored = JSON.parse(localStorage.getItem('quizzical:setup:world-capitals')!);
    expect(stored.difficultySlot).toBe(2);
    expect(stored.mode).toBe('locate');
  });

  it('loads previously stored state', () => {
    const stored: QuizSetupState = {
      ...defaultState,
      difficultySlot: 1,
      mode: 'multiple-choice',
      toggleValues: { showFlags: true },
      selectedGroups: ['europe', 'asia'],
    };
    localStorage.setItem('quizzical:setup:europe-capitals', JSON.stringify(stored));

    const { result } = renderHook(() =>
      useQuizSetupPersistence('europe-capitals', defaultState),
    );
    expect(result.current.setupState.difficultySlot).toBe(1);
    expect(result.current.setupState.mode).toBe('multiple-choice');
    expect(result.current.setupState.selectedGroups).toEqual(['europe', 'asia']);
  });

  it('uses separate keys for different quiz IDs', () => {
    const { result: resultA } = renderHook(() =>
      useQuizSetupPersistence('quiz-a', defaultState),
    );
    const { result: resultB } = renderHook(() =>
      useQuizSetupPersistence('quiz-b', defaultState),
    );

    act(() => {
      resultA.current.setSetupState({ ...defaultState, difficultySlot: 1 });
    });
    act(() => {
      resultB.current.setSetupState({ ...defaultState, difficultySlot: 2 });
    });

    expect(resultA.current.setupState.difficultySlot).toBe(1);
    expect(resultB.current.setupState.difficultySlot).toBe(2);
    expect(localStorage.getItem('quizzical:setup:quiz-a')).not.toBeNull();
    expect(localStorage.getItem('quizzical:setup:quiz-b')).not.toBeNull();
  });

  it('supports updater function form', () => {
    const { result } = renderHook(() =>
      useQuizSetupPersistence('my-quiz', defaultState),
    );
    act(() => {
      result.current.setSetupState((prev) => ({ ...prev, difficultySlot: 2 }));
    });
    expect(result.current.setupState.difficultySlot).toBe(2);
  });

  it('persists all fields including toggleValues and selectValues', () => {
    const { result } = renderHook(() =>
      useQuizSetupPersistence('my-quiz', defaultState),
    );
    const newState: QuizSetupState = {
      difficultySlot: 1,
      mode: 'free-recall-ordered',
      toggleValues: { showBorders: true, showFlags: false },
      selectValues: { dataPrecision: 'year' },
      rangeMin: 5,
      rangeMax: 50,
      selectedGroups: ['europe'],
    };
    act(() => {
      result.current.setSetupState(newState);
    });
    expect(result.current.setupState).toEqual(newState);
  });
});
