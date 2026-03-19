import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CursorTooltip } from '../CursorTooltip';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { elementToggle } from '../elementToggle';
import type { TimelineElement } from './TimelineElement';
import { isTimelineElement } from './TimelineElement';
import { buildCategoryColorMap } from './categoryColors';
import { computeAxisTicks } from './computeAxisTicks';
import { formatTimestampRange, timestampToFractionalYear } from './TimelineTimestamp';
import { UNITS_PER_YEAR } from './buildTimelineElements';
import { useTimelineZoom } from './useTimelineZoom';
import styles from './TimelineRenderer.module.css';

/** Axis area height in px. */
const AXIS_HEIGHT = 32;

/** Fixed bar height in pixels (constant, unaffected by zoom). */
const BAR_HEIGHT = 28;

/** Gap between tracks in pixels. */
const TRACK_GAP = 6;

/** Vertical offset per sub-layer when bars overlap within a track (px). */
const LAYER_OFFSET = 22;

/** Minimum visual bar width in pixels (for very short / point events). */
const MIN_PIXEL_BAR_WIDTH = 8;

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export function TimelineRenderer(props: VisualizationRendererProps) {
  const { elements, elementStates, toggles, elementToggles, onElementClick, onPositionClick } = props;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const timelineElements = useMemo(
    () => elements.filter(isTimelineElement),
    [elements],
  );

  // Compute horizontal bounds from real elements (exclude spacers)
  const { minX, maxX } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const el of timelineElements) {
      if (el.id.startsWith('__spacer')) continue;
      min = Math.min(min, el.viewBoxBounds.minX);
      max = Math.max(max, el.viewBoxBounds.maxX);
    }
    if (!isFinite(min)) return { minX: 0, maxX: 100 };
    const padding = UNITS_PER_YEAR * 0.5;
    return { minX: min - padding, maxX: max + padding };
  }, [timelineElements]);

  const totalViewBoxWidth = maxX - minX;

  // Track container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    setContainerWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  const {
    panOffset,
    zoom,
    timelineWidth,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    isDragging,
  } = useTimelineZoom({
    containerRef,
    totalViewBoxWidth,
    containerWidth,
  });

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(timelineElements.map((e) => e.category)),
    [timelineElements],
  );

  // Filter out spacers for rendering
  const visibleElements = useMemo(
    () => timelineElements.filter((e) => !e.id.startsWith('__spacer')),
    [timelineElements],
  );

  // Axis ticks (more ticks when zoomed in)
  const minYear = minX / UNITS_PER_YEAR;
  const maxYear = maxX / UNITS_PER_YEAR;
  const approximatePixels = totalViewBoxWidth * zoom;
  const axisTicks = useMemo(
    () => computeAxisTicks(minYear, maxYear, approximatePixels),
    [minYear, maxYear, approximatePixels],
  );

  // Compute pixel positions and per-track sub-layers for overlapping bars.
  // Vertical positions are computed fresh here (ignoring viewBoxBounds.minY)
  // so that sub-layers expand each track's height without bleeding into the next.
  const { barLayouts, totalContentHeight } = useMemo(() => {
    const layouts = new Map<string, { readonly pixelLeft: number; readonly pixelWidth: number; readonly pixelTop: number; readonly pixelHeight: number; readonly layer: number; readonly outsideGap: number }>();
    const byTrack = new Map<number, TimelineElement[]>();

    for (const el of visibleElements) {
      const track = el.track ?? 0;
      const list = byTrack.get(track) ?? [];
      list.push(el);
      byTrack.set(track, list);
    }

    // Get sorted track numbers
    const trackNumbers = [...byTrack.keys()].sort((a, b) => a - b);

    // First pass: compute sub-layers per track to know each track's total height
    const trackLayerCounts = new Map<number, number>();
    const trackElementLayers = new Map<string, number>();

    for (const trackNum of trackNumbers) {
      const trackElements = byTrack.get(trackNum) ?? [];
      const sorted = [...trackElements].sort((a, b) => {
        const diff = a.viewBoxBounds.minX - b.viewBoxBounds.minX;
        if (diff !== 0) return diff;
        return (b.viewBoxBounds.maxX - b.viewBoxBounds.minX) - (a.viewBoxBounds.maxX - a.viewBoxBounds.minX);
      });

      const pixelExtents = sorted.map((el) => {
        // Compute from raw timestamps, not viewBoxBounds (which has baked-in minimum width)
        const startFrac = timestampToFractionalYear(el.start, false);
        const endFrac = el.end ? timestampToFractionalYear(el.end, true) : startFrac;
        const left = (startFrac * UNITS_PER_YEAR - minX) * zoom;
        const rawWidth = (endFrac - startFrac) * UNITS_PER_YEAR * zoom;
        const width = Math.max(rawWidth, MIN_PIXEL_BAR_WIDTH);
        return { el, left, right: left + width, width };
      });

      // Greedy layer packing
      const layerEnds: number[] = [];
      for (const ext of pixelExtents) {
        let assignedLayer = -1;
        for (let i = 0; i < layerEnds.length; i++) {
          if (layerEnds[i] <= ext.left) {
            assignedLayer = i;
            break;
          }
        }
        if (assignedLayer === -1) {
          assignedLayer = layerEnds.length;
          layerEnds.push(0);
        }
        layerEnds[assignedLayer] = ext.right;
        trackElementLayers.set(ext.el.id, assignedLayer);
      }

      trackLayerCounts.set(trackNum, Math.max(1, layerEnds.length));
    }

    // Second pass: compute track Y positions accounting for sub-layer heights
    const trackYPositions = new Map<number, number>();
    let currentY = 0;
    for (const trackNum of trackNumbers) {
      trackYPositions.set(trackNum, currentY);
      const layerCount = trackLayerCounts.get(trackNum) ?? 1;
      const trackHeight = BAR_HEIGHT + (layerCount - 1) * LAYER_OFFSET;
      currentY += trackHeight + TRACK_GAP;
    }

    // Third pass: compute final positions and outside label gaps
    for (const trackNum of trackNumbers) {
      const trackY = trackYPositions.get(trackNum) ?? 0;
      const trackElements = byTrack.get(trackNum) ?? [];
      const sorted = [...trackElements].sort((a, b) => a.viewBoxBounds.minX - b.viewBoxBounds.minX);

      const pixelExtents = sorted.map((el) => {
        const startFrac = timestampToFractionalYear(el.start, false);
        const endFrac = el.end ? timestampToFractionalYear(el.end, true) : startFrac;
        const left = (startFrac * UNITS_PER_YEAR - minX) * zoom;
        const rawWidth = (endFrac - startFrac) * UNITS_PER_YEAR * zoom;
        const width = Math.max(rawWidth, MIN_PIXEL_BAR_WIDTH);
        return { el, left, right: left + width, width };
      });

      // Group by layer for outside gap computation
      const byLayer = new Map<number, typeof pixelExtents>();
      for (const ext of pixelExtents) {
        const layer = trackElementLayers.get(ext.el.id) ?? 0;
        const list = byLayer.get(layer) ?? [];
        list.push(ext);
        byLayer.set(layer, list);
      }

      for (const [, layerElements] of byLayer) {
        const sortedLayer = [...layerElements].sort((a, b) => a.left - b.left);
        for (let i = 0; i < sortedLayer.length; i++) {
          const current = sortedLayer[i];
          const next = sortedLayer[i + 1];
          const gap = next ? next.left - current.right : Infinity;
          const layer = trackElementLayers.get(current.el.id) ?? 0;

          layouts.set(current.el.id, {
            pixelLeft: current.left,
            pixelWidth: current.width,
            pixelTop: trackY + layer * LAYER_OFFSET,
            pixelHeight: BAR_HEIGHT,
            layer,
            outsideGap: gap,
          });
        }
      }
    }

    return { barLayouts: layouts, totalContentHeight: currentY + AXIS_HEIGHT };
  }, [visibleElements, zoom, minX]);

  // Click handler: convert pixel click → viewBox coordinates
  const handleAreaClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPositionClick) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pixelX = event.clientX - rect.left;
    const viewBoxX = (pixelX - panOffset) / zoom + minX;
    onPositionClick({ x: viewBoxX, y: 0 });
  }, [onPositionClick, panOffset, zoom, minX]);

  const tooltipTextRef = useRef('');
  const handleBarMouseEnter = useCallback(
    (element: TimelineElement, event: React.MouseEvent) => {
      const text = `${element.label}: ${formatTimestampRange(element.start, element.end)}`;
      tooltipTextRef.current = text;
      setTooltip({ x: event.clientX, y: event.clientY, text });
    },
    [],
  );
  const handleBarMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip({ x: event.clientX, y: event.clientY, text: tooltipTextRef.current });
  }, []);
  const handleBarMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <>
      <div
        ref={containerRef}
        className={styles.outerContainer}
        data-dragging={isDragging.current || undefined}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <div
          className={styles.innerContainer}
          style={{
            width: `${timelineWidth}px`,
            transform: `translateX(${panOffset}px)`,
            minHeight: `${totalContentHeight}px`,
          }}
          onClick={handleAreaClick}
        >
          {/* Axis */}
          <div className={styles.axisArea}>
            {axisTicks.map((tick, i) => {
              const pixelX = (tick.fractionalYear * UNITS_PER_YEAR - minX) * zoom;
              return (
                <div key={i} className={styles.tick} style={{ left: `${pixelX}px` }}>
                  <div className={tick.isMajor ? styles.tickMarkMajor : styles.tickMarkMinor} />
                  <div className={tick.isMajor ? styles.tickLabelMajor : styles.tickLabelMinor}>
                    {tick.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid lines (behind bars) */}
          <div className={styles.tracksArea}>
            {axisTicks.filter((t) => t.isMajor).map((tick, i) => {
              const pixelX = (tick.fractionalYear * UNITS_PER_YEAR - minX) * zoom;
              return (
                <div
                  key={`grid-${i}`}
                  className={styles.gridLine}
                  style={{ left: `${pixelX}px`, height: `${totalContentHeight - AXIS_HEIGHT}px` }}
                />
              );
            })}

            {/* Bars */}
            <AnimatePresence>
              {visibleElements.map((element) => {
                const layout = barLayouts.get(element.id);
                if (!layout) return null;

                const isHidden = elementStates[element.id] === 'hidden';
                const showBar = elementToggle(elementToggles, toggles, element.id, 'showBars');
                const showLabel = isHidden ? false : elementToggle(elementToggles, toggles, element.id, 'showLabels');

                const stateClass = getStateClass(elementStates[element.id]);
                const bgColor = stateClass ? undefined : categoryColorMap[element.category] ?? 'var(--color-accent)';
                const barOpacity = showBar ? 1 : 0.15;

                const showInsideLabel = showLabel && layout.pixelWidth >= 60;
                const showOutsideLabel = showLabel && !showInsideLabel && layout.outsideGap > 30;

                return (
                  <motion.div
                    key={element.id}
                    className={`${styles.bar} ${stateClass ?? ''}`}
                    style={{
                      left: `${layout.pixelLeft}px`,
                      top: `${layout.pixelTop}px`,
                      width: `${layout.pixelWidth}px`,
                      height: `${layout.pixelHeight}px`,
                      backgroundColor: bgColor,
                      opacity: barOpacity,
                      zIndex: layout.layer + 1,
                    }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: barOpacity, scaleX: 1 }}
                    exit={{ opacity: 0, scaleX: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onElementClick?.(element.id);
                    }}
                    onMouseEnter={(e) => handleBarMouseEnter(element, e)}
                    onMouseMove={handleBarMouseMove}
                    onMouseLeave={handleBarMouseLeave}
                  >
                    {showInsideLabel && (
                      <span className={styles.barLabel}>{element.label}</span>
                    )}
                    {showOutsideLabel && (
                      <span
                        className={styles.barLabelOutside}
                        style={{
                          left: `${layout.pixelWidth + 4}px`,
                          maxWidth: `${layout.outsideGap - 8}px`,
                        }}
                      >
                        {element.label}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {tooltip && (
        <CursorTooltip x={tooltip.x} y={tooltip.y} text={tooltip.text} />
      )}
    </>
  );
}

function getStateClass(state: string | undefined): string | undefined {
  switch (state) {
    case 'correct': return styles.barCorrect;
    case 'correct-second': return styles.barCorrect;
    case 'correct-third': return styles.barCorrect;
    case 'incorrect': return styles.barIncorrect;
    case 'missed': return styles.barMissed;
    case 'highlighted': return styles.barHighlighted;
    case 'hidden': return styles.barHidden;
    case 'revealed': return styles.barRevealed;
    default: return undefined;
  }
}
