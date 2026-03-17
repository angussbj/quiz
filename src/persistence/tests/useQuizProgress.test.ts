import { renderHook, act } from '@testing-library/react';
import { useQuizProgress } from '../useQuizProgress';
import type { QuizAttempt } from '../QuizProgress';
import type { ScoreResult } from '@/scoring/ScoreResult';

function makeAttempt(overrides: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    quizId: 'test-quiz',
    mode: 'free-recall-unordered',
    toggleValues: {},
    score: { correct: 5, total: 10, percentage: 50 },
    completedAt: '2026-01-01T00:00:00Z',
    durationMs: 60000,
    ...overrides,
  };
}

function makeScore(percentage: number): ScoreResult {
  return { correct: percentage, total: 100, percentage };
}

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('useQuizProgress', () => {
  it('returns null progress when no data exists', () => {
    const { result } = renderHook(() => useQuizProgress('test-quiz'));
    expect(result.current.progress).toBeNull();
  });

  it('loads existing progress from storage', () => {
    const stored = {
      quizId: 'test-quiz',
      attempts: [makeAttempt()],
      bestScore: makeScore(50),
    };
    localStorage.setItem('progress:test-quiz', JSON.stringify(stored));
    const { result } = renderHook(() => useQuizProgress('test-quiz'));
    expect(result.current.progress).toEqual(stored);
  });

  it('uses correct storage key based on quizId', () => {
    const { result } = renderHook(() => useQuizProgress('europe-capitals'));
    act(() => {
      result.current.addAttempt(makeAttempt());
    });
    expect(localStorage.getItem('progress:europe-capitals')).not.toBeNull();
    expect(localStorage.getItem('progress:test-quiz')).toBeNull();
  });

  describe('addAttempt', () => {
    it('creates progress with first attempt', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      const attempt = makeAttempt({ score: makeScore(75) });
      act(() => {
        result.current.addAttempt(attempt);
      });
      expect(result.current.progress).toEqual({
        quizId: 'test-quiz',
        attempts: [attempt],
        bestScore: makeScore(75),
      });
    });

    it('appends subsequent attempts', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      const attempt1 = makeAttempt({ score: makeScore(50) });
      const attempt2 = makeAttempt({ score: makeScore(60) });
      act(() => {
        result.current.addAttempt(attempt1);
      });
      act(() => {
        result.current.addAttempt(attempt2);
      });
      expect(result.current.progress?.attempts).toHaveLength(2);
    });

    it('updates best score when new attempt is better', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      act(() => {
        result.current.addAttempt(makeAttempt({ score: makeScore(50) }));
      });
      act(() => {
        result.current.addAttempt(makeAttempt({ score: makeScore(80) }));
      });
      expect(result.current.progress?.bestScore.percentage).toBe(80);
    });

    it('keeps best score when new attempt is worse', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      act(() => {
        result.current.addAttempt(makeAttempt({ score: makeScore(80) }));
      });
      act(() => {
        result.current.addAttempt(makeAttempt({ score: makeScore(40) }));
      });
      expect(result.current.progress?.bestScore.percentage).toBe(80);
    });

    it('persists to localStorage', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      act(() => {
        result.current.addAttempt(makeAttempt());
      });
      const stored = JSON.parse(localStorage.getItem('progress:test-quiz')!);
      expect(stored.attempts).toHaveLength(1);
    });
  });

  describe('reset', () => {
    it('clears progress back to null', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      act(() => {
        result.current.addAttempt(makeAttempt());
      });
      expect(result.current.progress).not.toBeNull();
      act(() => {
        result.current.reset();
      });
      expect(result.current.progress).toBeNull();
    });

    it('persists null to localStorage', () => {
      const { result } = renderHook(() => useQuizProgress('test-quiz'));
      act(() => {
        result.current.addAttempt(makeAttempt());
      });
      act(() => {
        result.current.reset();
      });
      expect(JSON.parse(localStorage.getItem('progress:test-quiz')!)).toBeNull();
    });
  });
});
