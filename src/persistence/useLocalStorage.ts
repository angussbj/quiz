import { useCallback, useEffect, useRef, useState } from 'react';

interface UseLocalStorageResult<T> {
  readonly value: T;
  readonly loading: boolean;
  readonly set: (value: T) => void;
}

/**
 * Generic localStorage hook. Takes a key and default value,
 * returns the stored value (or default), a loading flag, and a setter.
 *
 * Syncs across tabs via the `storage` event.
 *
 * Usage:
 *   const { value, loading, set } = useLocalStorage('progress:europe-capitals', defaultProgress);
 */
export function useLocalStorage<T>(key: string, defaultValue: T): UseLocalStorageResult<T> {
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      } else {
        setValue(defaultRef.current);
      }
    } catch {
      setValue(defaultRef.current);
    }
    setLoading(false);
  }, [key]);

  useEffect(() => {
    function handleStorageEvent(event: StorageEvent) {
      if (event.key !== key) return;
      if (event.newValue === null) {
        setValue(defaultRef.current);
        return;
      }
      try {
        setValue(JSON.parse(event.newValue) as T);
      } catch {
        // Invalid JSON from another tab — ignore
      }
    }

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [key]);

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch {
        // localStorage unavailable or quota exceeded
      }
    },
    [key],
  );

  return { value, loading, set };
}
