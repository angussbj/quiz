import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface UseTimelineZoomProps {
  readonly containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Element receiving the CSS translateX transform.
   * Updated directly (bypassing React) during pan gestures for 60fps.
   */
  readonly innerContainerRef: React.RefObject<HTMLElement | null>;
  /** Total width of the timeline content in viewBox units. */
  readonly totalViewBoxWidth: number;
  /** Width of the container element in pixels. */
  readonly containerWidth: number;
}

interface TimelineZoomState {
  readonly panOffset: number;
  readonly zoom: number;
}

export interface TimelineZoomResult {
  readonly panOffset: number;
  readonly zoom: number;
  readonly timelineWidth: number;
  readonly handleMouseDown: (e: React.MouseEvent) => void;
  readonly handleMouseMove: (e: React.MouseEvent) => void;
  readonly handleMouseUpOrLeave: () => void;
  readonly isDragging: React.RefObject<boolean>;
  /** True while a programmatic scroll animation is in progress. */
  readonly isScrolling: boolean;
  /**
   * Smooth-scroll to bring the element into view. `pixelLeft` and
   * `pixelWidth` are in timeline pixel coordinates (before pan offset).
   */
  readonly scrollIntoView: (pixelLeft: number, pixelWidth: number) => void;
  /**
   * Live pan offset — always current, even mid-gesture.
   * Use for click position calculations instead of the `panOffset` state value.
   */
  readonly livePanOffsetRef: React.RefObject<number>;
}

/**
 * Manages horizontal zoom and pan for a timeline visualization.
 *
 * Pan gestures (drag and horizontal scroll) bypass React state entirely:
 * a ref is updated and the CSS transform is applied directly to the
 * innerContainerRef element. React state only syncs when the gesture
 * ends (or on a debounce for wheel pan), so ticks/bars don't re-render
 * every frame. The renderer pre-renders ticks with viewport padding so
 * they're already in the DOM when panning brings them into view.
 *
 * Zoom gestures still use React state because bar widths/positions must
 * recompute.
 */
export function useTimelineZoom({
  containerRef,
  innerContainerRef,
  totalViewBoxWidth,
  containerWidth,
}: UseTimelineZoomProps): TimelineZoomResult {
  const minZoom = useMemo(() => {
    if (totalViewBoxWidth <= 0) return 1;
    return containerWidth / totalViewBoxWidth;
  }, [containerWidth, totalViewBoxWidth]);

  const [panAndZoom, setPanAndZoom] = useState<TimelineZoomState>(() => ({
    panOffset: 0,
    zoom: minZoom,
  }));

  const timelineWidth = totalViewBoxWidth * panAndZoom.zoom;

  // Refs for stable callbacks
  const timelineWidthRef = useRef(timelineWidth);
  const containerWidthRef = useRef(containerWidth);
  useEffect(() => { timelineWidthRef.current = timelineWidth; }, [timelineWidth]);
  useEffect(() => { containerWidthRef.current = containerWidth; }, [containerWidth]);

  // Live pan offset ref — always current, even mid-gesture.
  const livePanOffsetRef = useRef(panAndZoom.panOffset);
  // Keep ref in sync when React state updates (e.g. programmatic scroll, zoom)
  useEffect(() => { livePanOffsetRef.current = panAndZoom.panOffset; }, [panAndZoom.panOffset]);

  // Gesture detection state
  const gestureMode = useRef<'horizontal' | 'vertical' | null>(null);
  const gestureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPanOffset = useRef(0);
  const wheelSyncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clampPanOffset = useCallback((offset: number, overrideTimelineWidth?: number) => {
    const tlWidth = overrideTimelineWidth ?? timelineWidthRef.current;
    const buffer = containerWidthRef.current / 3;
    return Math.max(
      containerWidthRef.current - tlWidth - buffer,
      Math.min(buffer, offset),
    );
  }, []);

  /** Apply a pan offset directly to the DOM (no React re-render). */
  const applyPan = useCallback((offset: number) => {
    livePanOffsetRef.current = offset;
    const el = innerContainerRef.current;
    if (el) {
      el.style.transform = `translateX(${offset}px)`;
      el.style.transition = '';
    }
  }, [innerContainerRef]);

  /** Sync the live pan offset ref into React state (triggers re-render for tick recomputation). */
  const syncPanToState = useCallback(() => {
    const offset = livePanOffsetRef.current;
    setPanAndZoom((prev) => {
      if (prev.panOffset === offset) return prev;
      return { ...prev, panOffset: offset };
    });
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    const isPinch = e.ctrlKey;

    // Determine gesture direction at start
    if (gestureMode.current === null && !isPinch) {
      const isVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      gestureMode.current = isVertical ? 'vertical' : 'horizontal';
    }

    // Reset gesture mode after inactivity
    if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
    gestureTimeout.current = setTimeout(() => { gestureMode.current = null; }, 50);

    // Prevent default for all gestures (vertical zoom, horizontal pan, pinch zoom)
    e.preventDefault();

    // Horizontal scroll → pan (ref-based, no React re-render)
    if (gestureMode.current === 'horizontal') {
      const newOffset = clampPanOffset(livePanOffsetRef.current - e.deltaX);
      applyPan(newOffset);
      // Debounced sync so ticks update after the gesture settles
      if (wheelSyncTimeout.current) clearTimeout(wheelSyncTimeout.current);
      wheelSyncTimeout.current = setTimeout(syncPanToState, 150);
      return;
    }

    // Vertical scroll (zoom) or pinch (zoom) — needs React re-render for bar widths
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const zoomFactor = isPinch
      ? (e.deltaY > 0 ? 0.97 : 1.03)
      : (e.deltaY > 0 ? 0.95 : 1.05);

    setPanAndZoom(({ zoom }) => {
      // Read from live ref for accurate position during concurrent gestures
      const currentPanOffset = livePanOffsetRef.current;
      const timelineX = mouseX - currentPanOffset;
      const newZoom = zoom * zoomFactor;
      const maxZoom = minZoom * 100;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      const newPanOffset = mouseX - timelineX * (clampedZoom / zoom);
      const newTimelineWidth = totalViewBoxWidth * clampedZoom;

      return {
        panOffset: clampPanOffset(newPanOffset, newTimelineWidth),
        zoom: clampedZoom,
      };
    });
  }, [minZoom, clampPanOffset, totalViewBoxWidth, applyPan, syncPanToState]);

  // Attach wheel listener with { passive: false }
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleWheel]);

  // Mouse drag handlers — ref-based, no React re-render during drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartPanOffset.current = livePanOffsetRef.current;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const newOffset = clampPanOffset(dragStartPanOffset.current + deltaX);
    applyPan(newOffset);
  }, [clampPanOffset, applyPan]);

  const handleMouseUpOrLeave = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    syncPanToState();
  }, [syncPanToState]);

  // Programmatic scroll: bring an element into view (by timeline pixel coords)
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollIntoView = useCallback((pixelLeft: number, pixelWidth: number) => {
    setPanAndZoom((state) => {
      const elementLeft = pixelLeft + state.panOffset;
      const elementRight = elementLeft + pixelWidth;
      const margin = 60;
      if (elementLeft >= margin && elementRight <= containerWidthRef.current - margin) {
        return state; // already fully visible
      }
      const pixelCenter = pixelLeft + pixelWidth / 2;
      const newPanOffset = containerWidthRef.current / 2 - pixelCenter;
      return { zoom: state.zoom, panOffset: clampPanOffset(newPanOffset) };
    });
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 400);
  }, [clampPanOffset]);

  // Re-clamp if container resizes or minZoom changes
  useEffect(() => {
    const clampedZoom = Math.max(minZoom, panAndZoom.zoom);
    const clampedPan = clampPanOffset(panAndZoom.panOffset);
    if (clampedZoom !== panAndZoom.zoom || clampedPan !== panAndZoom.panOffset) {
      setPanAndZoom({ panOffset: clampedPan, zoom: clampedZoom });
    }
  }, [minZoom, panAndZoom.zoom, panAndZoom.panOffset, clampPanOffset]);

  // Cleanup debounce timers
  useEffect(() => () => {
    if (wheelSyncTimeout.current) clearTimeout(wheelSyncTimeout.current);
  }, []);

  return {
    panOffset: panAndZoom.panOffset,
    zoom: panAndZoom.zoom,
    timelineWidth,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    isDragging,
    isScrolling,
    scrollIntoView,
    livePanOffsetRef,
  };
}
