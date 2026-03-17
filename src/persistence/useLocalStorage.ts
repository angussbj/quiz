import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Parse JSON without an explicit `as` cast. The `any` return type of
 * JSON.parse flows through the generic return type implicitly.
 */
function parseJson<T>(json: string): T {
  return JSON.parse(json);
}

interface UseLocalStorageResult<T> {
  readonly value: T;
  readonly loading: boolean;
  readonly set: (valueOrUpdater: T | ((prev: T) => T)) => void;
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
  // Ref avoids putting defaultValue in effect deps, which causes infinite
  // re-renders when callers pass object/array literals as defaults.
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setValue(parseJson<T>(stored));
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
        setValue(parseJson<T>(event.newValue));
      } catch {
        // Invalid JSON from another tab — ignore
      }
    }

    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [key]);

  const set = useCallback(
    (newValueOrUpdater: T | ((prev: T) => T)) => {
      setValue((current) => {
        const newValue =
          typeof newValueOrUpdater === 'function'
            ? (newValueOrUpdater as (prev: T) => T)(current)
            : newValueOrUpdater;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch {
          // localStorage unavailable or quota exceeded
        }
        return newValue;
      });
    },
    [key],
  );

  return { value, loading, set };
}
