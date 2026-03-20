import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface UseTimelineZoomProps {
  readonly containerRef: React.RefObject<HTMLElement | null>;
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
}

/**
 * Manages horizontal zoom and pan for a timeline visualization.
 *
 * Adapted from life-timeline's useTimelineGestures.
 * - Scroll wheel vertical = zoom (pinch also zooms)
 * - Scroll wheel horizontal = pan
 * - Mouse drag = pan
 * - Vertical scroll = not intercepted (native overflow-y)
 *
 * Zoom operates in pixels-per-viewBox-unit. Pan is a CSS translateX offset.
 */
export function useTimelineZoom({
  containerRef,
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

  // Gesture detection state
  const gestureMode = useRef<'horizontal' | 'vertical' | null>(null);
  const gestureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartPanOffset = useRef(0);

  const clampPanOffset = useCallback((offset: number) => {
    return Math.max(
      containerWidthRef.current - timelineWidthRef.current,
      Math.min(0, offset),
    );
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

    // Horizontal scroll → pan
    if (gestureMode.current === 'horizontal') {
      setPanAndZoom(({ panOffset, zoom }) => ({
        panOffset: clampPanOffset(panOffset - e.deltaX),
        zoom,
      }));
      return;
    }

    // Vertical scroll (zoom) or pinch (zoom)
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    const zoomFactor = isPinch
      ? (e.deltaY > 0 ? 0.97 : 1.03)
      : (e.deltaY > 0 ? 0.95 : 1.05);

    setPanAndZoom(({ panOffset, zoom }) => {
      const timelineX = mouseX - panOffset;
      const newZoom = zoom * zoomFactor;
      const maxZoom = minZoom * 100;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      const newPanOffset = mouseX - timelineX * (clampedZoom / zoom);

      return {
        panOffset: clampPanOffset(newPanOffset),
        zoom: clampedZoom,
      };
    });
  }, [minZoom, clampPanOffset]);

  // Attach wheel listener with { passive: false }
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleWheel]);

  // Mouse drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartPanOffset.current = panAndZoom.panOffset;
    e.preventDefault();
  }, [panAndZoom.panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - dragStartX.current;
    const newOffset = dragStartPanOffset.current + deltaX;
    setPanAndZoom(({ zoom }) => ({
      panOffset: clampPanOffset(newOffset),
      zoom,
    }));
  }, [clampPanOffset]);

  const handleMouseUpOrLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

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
  };
}
