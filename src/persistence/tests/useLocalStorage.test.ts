import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('useLocalStorage', () => {
  describe('initial load', () => {
    it('returns the default value when storage is empty', () => {
      const { result } = renderHook(() => useLocalStorage('key', 42));
      expect(result.current.value).toBe(42);
    });

    it('returns stored value when storage has data', () => {
      localStorage.setItem('key', JSON.stringify({ name: 'Alice' }));
      const { result } = renderHook(() =>
        useLocalStorage('key', { name: 'default' }),
      );
      expect(result.current.value).toEqual({ name: 'Alice' });
    });

    it('starts loading then finishes after mount', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'default'));
      // After the effect runs, loading should be false
      expect(result.current.loading).toBe(false);
    });

    it('loads different values for different keys', () => {
      localStorage.setItem('a', JSON.stringify(1));
      localStorage.setItem('b', JSON.stringify(2));
      const { result: resultA } = renderHook(() => useLocalStorage('a', 0));
      const { result: resultB } = renderHook(() => useLocalStorage('b', 0));
      expect(resultA.current.value).toBe(1);
      expect(resultB.current.value).toBe(2);
    });
  });

  describe('setter', () => {
    it('updates both state and localStorage', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));
      act(() => {
        result.current.set('updated');
      });
      expect(result.current.value).toBe('updated');
      expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated');
    });

    it('handles complex objects', () => {
      const { result } = renderHook(() =>
        useLocalStorage('key', { items: [1, 2] }),
      );
      act(() => {
        result.current.set({ items: [3, 4, 5] });
      });
      expect(result.current.value).toEqual({ items: [3, 4, 5] });
      expect(JSON.parse(localStorage.getItem('key')!)).toEqual({
        items: [3, 4, 5],
      });
    });

    it('preserves setter identity across renders', () => {
      const { result, rerender } = renderHook(() =>
        useLocalStorage('key', 'val'),
      );
      const firstSet = result.current.set;
      rerender();
      expect(result.current.set).toBe(firstSet);
    });
  });

  describe('key changes', () => {
    it('loads value for new key when key changes', () => {
      localStorage.setItem('key-a', JSON.stringify('A'));
      localStorage.setItem('key-b', JSON.stringify('B'));
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => useLocalStorage(key, 'default'),
        { initialProps: { key: 'key-a' } },
      );
      expect(result.current.value).toBe('A');
      rerender({ key: 'key-b' });
      expect(result.current.value).toBe('B');
    });

    it('returns default when switching to a key with no stored value', () => {
      localStorage.setItem('key-a', JSON.stringify('A'));
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => useLocalStorage(key, 'default'),
        { initialProps: { key: 'key-a' } },
      );
      expect(result.current.value).toBe('A');
      rerender({ key: 'key-missing' });
      expect(result.current.value).toBe('default');
    });
  });

  describe('error handling', () => {
    it('returns default when stored JSON is invalid', () => {
      localStorage.setItem('key', '{bad json');
      const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
      expect(result.current.value).toBe('fallback');
    });

    it('returns default when localStorage.getItem throws', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      const { result } = renderHook(() => useLocalStorage('key', 'fallback'));
      expect(result.current.value).toBe('fallback');
      expect(result.current.loading).toBe(false);
    });

    it('still updates state when localStorage.setItem throws (quota exceeded)', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      act(() => {
        result.current.set('updated');
      });
      // State should still update even though storage failed
      expect(result.current.value).toBe('updated');
    });

    it('does not throw when localStorage is completely unavailable on read', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      const { result } = renderHook(() => useLocalStorage('key', 100));
      expect(result.current.value).toBe(100);
    });
  });

  describe('cross-tab sync', () => {
    it('updates value when storage event fires for the same key', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'key',
            newValue: JSON.stringify('from-other-tab'),
          }),
        );
      });
      expect(result.current.value).toBe('from-other-tab');
    });

    it('ignores storage events for different keys', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'other-key',
            newValue: JSON.stringify('nope'),
          }),
        );
      });
      expect(result.current.value).toBe('initial');
    });

    it('resets to default when storage event has null newValue (key deleted)', () => {
      localStorage.setItem('key', JSON.stringify('stored'));
      const { result } = renderHook(() => useLocalStorage('key', 'default'));
      expect(result.current.value).toBe('stored');
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'key',
            newValue: null,
          }),
        );
      });
      expect(result.current.value).toBe('default');
    });

    it('ignores storage events with invalid JSON', () => {
      const { result } = renderHook(() => useLocalStorage('key', 'initial'));
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: 'key',
            newValue: '{bad',
          }),
        );
      });
      expect(result.current.value).toBe('initial');
    });

    it('cleans up storage event listener on unmount', () => {
      const removeSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useLocalStorage('key', 'val'));
      unmount();
      expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });
  });

  describe('serialization edge cases', () => {
    it('handles null as a stored value', () => {
      localStorage.setItem('key', JSON.stringify(null));
      const { result } = renderHook(() => useLocalStorage('key', 'default'));
      expect(result.current.value).toBeNull();
    });

    it('handles false as a stored value', () => {
      localStorage.setItem('key', JSON.stringify(false));
      const { result } = renderHook(() => useLocalStorage('key', true));
      expect(result.current.value).toBe(false);
    });

    it('handles 0 as a stored value', () => {
      localStorage.setItem('key', JSON.stringify(0));
      const { result } = renderHook(() => useLocalStorage('key', 99));
      expect(result.current.value).toBe(0);
    });

    it('handles empty string as a stored value', () => {
      localStorage.setItem('key', JSON.stringify(''));
      const { result } = renderHook(() =>
        useLocalStorage('key', 'non-empty'),
      );
      expect(result.current.value).toBe('');
    });

    it('handles arrays', () => {
      localStorage.setItem('key', JSON.stringify([1, 2, 3]));
      const { result } = renderHook(() =>
        useLocalStorage<ReadonlyArray<number>>('key', []),
      );
      expect(result.current.value).toEqual([1, 2, 3]);
    });
  });
});
