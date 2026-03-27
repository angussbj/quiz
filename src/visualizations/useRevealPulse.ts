import { useCallback, useEffect, useRef, useState } from 'react';

const PULSE_DURATION_MS = 1200;

/**
 * Manages auto-reveal animation lifecycle.
 *
 * Quiz modes call `triggerReveal(ids, total)` when elements are revealed
 * without direct user interaction (e.g. skip, give-up, wrong-answer reveal).
 *
 * The hook enforces a 10% threshold: if more than 10% of total elements are
 * revealed at once (e.g. give-up with many remaining), the animation is skipped
 * to avoid visual noise. Individual reveals always animate.
 *
 * Returns `revealingElementIds` — the set of element IDs currently pulsing.
 * IDs are automatically cleared after the animation duration.
 */
export function useRevealPulse(): {
  readonly revealingElementIds: ReadonlyArray<string>;
  readonly triggerReveal: (ids: ReadonlyArray<string>, totalElements: number) => void;
} {
  const [revealingIds, setRevealingIds] = useState<ReadonlyArray<string>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const triggerReveal = useCallback((ids: ReadonlyArray<string>, totalElements: number) => {
    if (ids.length === 0) return;

    // Skip animation if more than 10% of total elements revealed at once
    // (e.g. give-up with many remaining). Single-element reveals always animate.
    if (ids.length > 1 && totalElements > 0 && ids.length > totalElements * 0.1) return;

    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setRevealingIds(ids);
    timerRef.current = setTimeout(() => {
      setRevealingIds([]);
      timerRef.current = null;
    }, PULSE_DURATION_MS);
  }, []);

  return { revealingElementIds: revealingIds, triggerReveal };
}
