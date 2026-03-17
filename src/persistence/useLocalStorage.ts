import { useCallback, useEffect, useState } from 'react';

interface UseLocalStorageResult<T> {
  readonly value: T;
  readonly loading: boolean;
  readonly set: (value: T) => void;
}

/**
 * Generic localStorage hook. Takes a key and default value,
 * returns the stored value (or default), a loading flag, and a setter.
 *
 * Usage:
 *   const { value, loading, set } = useLocalStorage('progress:europe-capitals', defaultProgress);
 */
export function useLocalStorage<T>(key: string, defaultValue: T): UseLocalStorageResult<T> {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored) as T);
      }
    } catch {
      // Invalid JSON or localStorage unavailable — keep default
    }
    setLoading(false);
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
