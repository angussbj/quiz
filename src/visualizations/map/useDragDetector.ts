import { useCallback, useRef } from 'react';

const DRAG_THRESHOLD_PX = 5;

/**
 * Detects whether a pointer interaction was a drag (moved beyond threshold)
 * or a click (stayed within threshold). Attach `onPointerDown` to the container,
 * then call `isDrag(event)` inside click handlers to suppress clicks after drags.
 */
export function useDragDetector() {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const isDrag = useCallback((e: React.MouseEvent): boolean => {
    if (!startRef.current) return false;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    return Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;
  }, []);

  return { onPointerDown, isDrag };
}
