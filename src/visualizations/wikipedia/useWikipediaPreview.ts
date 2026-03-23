/**
 * Hook that manages the Wikipedia hover preview lifecycle:
 * - 0.4s after hover: start fetching
 * - 1.0s after hover: show panel (loading state if fetch incomplete)
 * - On unhover: hide panel, abort in-flight fetch
 *
 * Caches successful results. Failed fetches are retried on next hover.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWikipediaExtract, type WikipediaExtract } from './fetchWikipediaExtract';

export type WikipediaPreviewState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly elementId: string; readonly slug: string }
  | { readonly status: 'loaded'; readonly elementId: string; readonly slug: string; readonly data: WikipediaExtract }
  | { readonly status: 'error'; readonly elementId: string; readonly slug: string };

const FETCH_DELAY_MS = 400;
const SHOW_DELAY_MS = 1000;

export function useWikipediaPreview() {
  const [state, setState] = useState<WikipediaPreviewState>({ status: 'idle' });

  // Cache: slug → WikipediaExtract (only successful fetches)
  const cacheRef = useRef(new Map<string, WikipediaExtract>());
  // Timers
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Abort controller for in-flight fetch
  const abortRef = useRef<AbortController | null>(null);
  // Track which element is currently hovered (to avoid stale updates)
  const hoveredRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (fetchTimerRef.current !== null) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const abortFetch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  /** Call when hovering over an element with a visible label and a wikipedia slug. */
  const onHoverStart = useCallback((elementId: string, slug: string) => {
    // Reset any previous hover
    clearTimers();
    abortFetch();
    hoveredRef.current = elementId;

    // Check cache first
    const cached = cacheRef.current.get(slug);
    if (cached) {
      // Still wait for the show delay before displaying
      showTimerRef.current = setTimeout(() => {
        if (hoveredRef.current === elementId) {
          setState({ status: 'loaded', elementId, slug, data: cached });
        }
      }, SHOW_DELAY_MS);
      return;
    }

    // Start fetch after FETCH_DELAY_MS
    fetchTimerRef.current = setTimeout(() => {
      if (hoveredRef.current !== elementId) return;

      const controller = new AbortController();
      abortRef.current = controller;

      fetchWikipediaExtract(slug, controller.signal)
        .then((data) => {
          if (hoveredRef.current !== elementId) return;
          cacheRef.current.set(slug, data);
          setState({ status: 'loaded', elementId, slug, data });
        })
        .catch((err) => {
          if (hoveredRef.current !== elementId) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setState({ status: 'error', elementId, slug });
        });
    }, FETCH_DELAY_MS);

    // Show loading state after SHOW_DELAY_MS (if fetch hasn't completed yet)
    showTimerRef.current = setTimeout(() => {
      if (hoveredRef.current !== elementId) return;
      setState((prev) => {
        // Only show loading if we haven't already loaded or errored
        if (prev.status === 'idle' || (prev.status === 'loading' && prev.elementId !== elementId)) {
          return { status: 'loading', elementId, slug };
        }
        return prev;
      });
    }, SHOW_DELAY_MS);
  }, [clearTimers, abortFetch]);

  /** Call when the hover ends. */
  const onHoverEnd = useCallback(() => {
    hoveredRef.current = null;
    clearTimers();
    abortFetch();
    setState({ status: 'idle' });
  }, [clearTimers, abortFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      abortFetch();
    };
  }, [clearTimers, abortFetch]);

  return { previewState: state, onHoverStart, onHoverEnd };
}
