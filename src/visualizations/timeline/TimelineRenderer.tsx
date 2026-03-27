import { useMemo, useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CursorTooltip } from '../CursorTooltip';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { elementToggle } from '../elementToggle';
import { shouldShowLabel } from '../shouldShowLabel';
import type { TimelineElement } from './TimelineElement';
import { isTimelineElement } from './TimelineElement';
import { buildCategoryColorMap } from './categoryColors';
import { STATUS_COLORS } from '../elementStateColors';
import { computeAxisTicks } from './computeAxisTicks';
import { computeLogAxisTicks, computeLogReferenceYear, logYearToViewBoxX, viewBoxXToLogYear } from './logTimeScale';
import { formatTimestampRange, formatYear, timestampToFractionalYear } from './TimelineTimestamp';
import { UNITS_PER_YEAR } from './buildTimelineElements';
import { useTimelineZoom } from './useTimelineZoom';
import styles from './TimelineRenderer.module.css';

/** Axis area height in px. */
const AXIS_HEIGHT = 32;

/** Fixed bar height in pixels (constant, unaffected by zoom). */
const BAR_HEIGHT = 28;

/** Gap between tracks in pixels (used when tracks don't need compression). */
const TRACK_GAP = 6;

/** Vertical offset per sub-layer when bars overlap within a track (px). */
const LAYER_OFFSET = 24;

/** Maximum number of tracks before vertical compression kicks in. */
const COMPRESS_THRESHOLD = 12;

/** Minimum visible height per track when compressed (enough for one line of text). */
const MIN_TRACK_STEP = 16;

/** Minimum visual bar width in pixels (for very short / point events). */
const MIN_PIXEL_BAR_WIDTH = 8;

const MONTH_NAMES_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export function TimelineRenderer(props: VisualizationRendererProps) {
  const { elements, elementStates, toggles, elementToggles, onElementClick, onPositionClick, onElementHoverStart, onElementHoverEnd, putInView, timeScale, autoRevealElementIds } = props;
  const isLogScale = timeScale === 'log';

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  const timelineElements = useMemo(
    () => elements.filter(isTimelineElement),
    [elements],
  );

  // Compute the log-scale reference year from the latest event in the data.
  const logReferenceYear = useMemo(() => {
    if (!isLogScale) return 0;
    let maxYear = -Infinity;
    for (const el of timelineElements) {
      const endYear = el.end
        ? timestampToFractionalYear(el.end, true)
        : timestampToFractionalYear(el.start, false);
      maxYear = Math.max(maxYear, endYear);
    }
    return computeLogReferenceYear(maxYear);
  }, [isLogScale, timelineElements]);

  /** Convert a fractional year to its viewBox X coordinate. */
  const yearToViewBoxX = useMemo(
    () => isLogScale
      ? (y: number) => logYearToViewBoxX(y, logReferenceYear)
      : (y: number) => y * UNITS_PER_YEAR,
    [isLogScale, logReferenceYear],
  );

  const { minX, maxX } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const el of timelineElements) {
      min = Math.min(min, el.viewBoxBounds.minX);
      max = Math.max(max, el.viewBoxBounds.maxX);
    }
    if (!isFinite(min)) return { minX: 0, maxX: 100 };
    const extent = max - min;
    // Use proportional padding (1%) so bars with minimum pixel width
    // don't extend beyond the viewport at full zoom-out.
    const padding = Math.max(UNITS_PER_YEAR * 0.5, extent * 0.01);
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
    isScrolling,
    scrollIntoView,
  } = useTimelineZoom({
    containerRef,
    innerContainerRef,
    totalViewBoxWidth,
    containerWidth,
  });

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(timelineElements.map((e) => e.category)),
    [timelineElements],
  );

  const visibleElements = timelineElements;

  // Axis ticks: compute for the visible viewport plus padding on each side so that
  // ticks are already in the DOM when panning brings them into view. Panning applies
  // a CSS translateX via ref (no React re-render), so pre-rendering ticks beyond the
  // viewport edge prevents blank axis gaps during drag or wheel pan.
  //
  // We render ticks covering (1 + 2 * AXIS_PADDING_SCREENS) viewport widths, centred
  // on the current React-state viewport. The zoom hook calls syncPanToState when the
  // live pan offset drifts far enough (> AXIS_PADDING_SCREENS * containerWidth) to
  // approach the pre-rendered edge, triggering a re-render with fresh ticks.
  const AXIS_PADDING_SCREENS = 0.75;

  const hasValidViewport = containerWidth > 0 && zoom > 0;
  const paddingViewBoxUnits = hasValidViewport ? (containerWidth * AXIS_PADDING_SCREENS) / zoom : 0;

  const visibleStartYear = hasValidViewport
    ? (isLogScale
        ? viewBoxXToLogYear(-panOffset / zoom + minX, logReferenceYear)
        : (-panOffset / zoom + minX) / UNITS_PER_YEAR)
    : (isLogScale ? viewBoxXToLogYear(minX, logReferenceYear) : minX / UNITS_PER_YEAR);
  const visibleEndYear = hasValidViewport
    ? (isLogScale
        ? viewBoxXToLogYear((containerWidth - panOffset) / zoom + minX, logReferenceYear)
        : ((containerWidth - panOffset) / zoom + minX) / UNITS_PER_YEAR)
    : (isLogScale ? viewBoxXToLogYear(maxX, logReferenceYear) : maxX / UNITS_PER_YEAR);

  // Padded range for tick generation — wider than the viewport so off-screen ticks
  // are pre-rendered and slide into view during pan gestures.
  const paddedStartYear = isLogScale
    ? viewBoxXToLogYear(-panOffset / zoom + minX - paddingViewBoxUnits, logReferenceYear)
    : visibleStartYear - paddingViewBoxUnits / UNITS_PER_YEAR;
  const paddedEndYear = isLogScale
    ? viewBoxXToLogYear((containerWidth - panOffset) / zoom + minX + paddingViewBoxUnits, logReferenceYear)
    : visibleEndYear + paddingViewBoxUnits / UNITS_PER_YEAR;

  const effectivePixels = (containerWidth || timelineWidth || 800) * (1 + 2 * AXIS_PADDING_SCREENS);
  const axisTicks = useMemo(
    () => isLogScale
      ? computeLogAxisTicks(paddedStartYear, paddedEndYear, effectivePixels, logReferenceYear)
      : computeAxisTicks(paddedStartYear, paddedEndYear, effectivePixels),
    [isLogScale, paddedStartYear, paddedEndYear, effectivePixels, logReferenceYear],
  );

  // Context label: when deeply zoomed, show year/month in top-left for orientation.
  // Only shown when no major tick is visible on the axis (otherwise the axis already
  // provides the date context and the label would be redundant/overlapping).
  const contextLabel = useMemo(() => {
    if (isLogScale) return undefined;
    const hasMajorTickOnScreen = axisTicks.some(
      (t) => t.isMajor && t.fractionalYear >= visibleStartYear && t.fractionalYear <= visibleEndYear,
    );
    if (hasMajorTickOnScreen) return undefined;
    const startFloorYear = Math.floor(visibleStartYear);
    const endFloorYear = Math.floor(visibleEndYear);
    if (startFloorYear !== endFloorYear) return undefined;
    // All visible dates are in the same year
    const year = startFloorYear;
    const startMonth = Math.floor((visibleStartYear - year) * 12);
    const endMonth = Math.floor((visibleEndYear - year) * 12);
    if (startMonth === endMonth && startMonth >= 0 && startMonth < 12) {
      return `${MONTH_NAMES_FULL[startMonth]} ${formatYear(year)}`;
    }
    return formatYear(year);
  }, [isLogScale, visibleStartYear, visibleEndYear, axisTicks]);

  // Compute pixel positions and per-track sub-layers for overlapping bars.
  // Vertical positions are computed fresh here (ignoring viewBoxBounds.minY)
  // so that sub-layers expand each track's height without bleeding into the next.
  const { barLayouts, totalContentHeight } = useMemo(() => {
    const layouts = new Map<string, { readonly pixelLeft: number; readonly pixelWidth: number; readonly pixelTop: number; readonly pixelHeight: number; readonly layer: number; readonly outsideGap: number; readonly trackIndex: number }>();
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
        const endFrac = timestampToFractionalYear(el.end ?? el.start, true);
        const left = (yearToViewBoxX(startFrac) - minX) * zoom;
        const rawWidth = (yearToViewBoxX(endFrac) - yearToViewBoxX(startFrac)) * zoom;
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
    // When there are many tracks, compress vertical spacing so bars overlap
    const trackYPositions = new Map<number, number>();
    const needsCompression = trackNumbers.length > COMPRESS_THRESHOLD;

    // Compute natural track steps (height of each track including sub-layers + gap)
    const naturalTrackSteps: number[] = [];
    for (const trackNum of trackNumbers) {
      const layerCount = trackLayerCounts.get(trackNum) ?? 1;
      const trackHeight = BAR_HEIGHT + (layerCount - 1) * LAYER_OFFSET;
      naturalTrackSteps.push(trackHeight + TRACK_GAP);
    }

    // If compressed, scale down track steps to fit a target height
    let effectiveTrackSteps = naturalTrackSteps;
    if (needsCompression) {
      const targetHeight = COMPRESS_THRESHOLD * (BAR_HEIGHT + TRACK_GAP);
      const naturalTotal = naturalTrackSteps.reduce((sum, s) => sum + s, 0);
      const scale = Math.min(1, targetHeight / naturalTotal);
      effectiveTrackSteps = naturalTrackSteps.map((step) =>
        Math.max(MIN_TRACK_STEP, step * scale),
      );
    }

    let currentY = 0;
    for (let i = 0; i < trackNumbers.length; i++) {
      trackYPositions.set(trackNumbers[i], currentY);
      currentY += effectiveTrackSteps[i];
    }

    // Third pass: compute final positions and outside label gaps
    // When compressed, also scale the sub-layer offset
    const effectiveLayerOffset = needsCompression
      ? Math.max(MIN_TRACK_STEP, LAYER_OFFSET * Math.min(1, (COMPRESS_THRESHOLD * (BAR_HEIGHT + TRACK_GAP)) / naturalTrackSteps.reduce((sum, s) => sum + s, 0)))
      : LAYER_OFFSET;

    for (let ti = 0; ti < trackNumbers.length; ti++) {
      const trackNum = trackNumbers[ti];
      const trackY = trackYPositions.get(trackNum) ?? 0;
      const trackElements = byTrack.get(trackNum) ?? [];
      const sorted = [...trackElements].sort((a, b) => a.viewBoxBounds.minX - b.viewBoxBounds.minX);

      const pixelExtents = sorted.map((el) => {
        const startFrac = timestampToFractionalYear(el.start, false);
        const endFrac = timestampToFractionalYear(el.end ?? el.start, true);
        const left = (yearToViewBoxX(startFrac) - minX) * zoom;
        const rawWidth = (yearToViewBoxX(endFrac) - yearToViewBoxX(startFrac)) * zoom;
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
            pixelTop: trackY + layer * effectiveLayerOffset,
            pixelHeight: BAR_HEIGHT,
            layer,
            outsideGap: gap,
            trackIndex: ti,
          });
        }
      }
    }

    return { barLayouts: layouts, totalContentHeight: currentY + AXIS_HEIGHT };
  }, [visibleElements, zoom, minX, yearToViewBoxX]);

  // Scroll to newly-revealed elements (correct answers, or incorrect/missed when first becoming visible)
  const prevElementStatesRef = useRef<Readonly<Record<string, string>>>({});
  useEffect(() => {
    const prev = prevElementStatesRef.current;
    for (const [id, state] of Object.entries(elementStates)) {
      const prevState = prev[id];
      const isCorrectReveal =
        (state === 'correct' || state === 'correct-second' || state === 'correct-third') &&
        prevState !== state;
      const isWrongReveal =
        (state === 'incorrect' || state === 'missed') &&
        (prevState === 'hidden' || prevState === 'default');
      if (isCorrectReveal || isWrongReveal) {
        const layout = barLayouts.get(id);
        if (layout) scrollIntoView(layout.pixelLeft, layout.pixelWidth);
      }
    }
    prevElementStatesRef.current = elementStates;
  }, [elementStates, barLayouts, scrollIntoView]);

  // Bring specified elements into view when putInView changes.
  const putInViewLatestRef = useRef({ barLayouts, scrollIntoView });
  putInViewLatestRef.current = { barLayouts, scrollIntoView };

  useEffect(() => {
    if (!putInView || putInView.length === 0) return;
    const { barLayouts, scrollIntoView } = putInViewLatestRef.current;
    let minLeft = Infinity;
    let maxRight = -Infinity;
    for (const id of putInView) {
      const layout = barLayouts.get(id);
      if (layout) {
        minLeft = Math.min(minLeft, layout.pixelLeft);
        maxRight = Math.max(maxRight, layout.pixelLeft + layout.pixelWidth);
      }
    }
    if (minLeft === Infinity) return;
    scrollIntoView(minLeft, maxRight - minLeft);
  }, [putInView]);

  // Click handler: convert pixel click → viewBox coordinates
  // The x value passed to onPositionClick is always in viewBox units (log or linear).
  const handleAreaClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPositionClick) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pixelX = event.clientX - rect.left;
    const viewBoxX = (pixelX - panOffset) / zoom + minX;
    onPositionClick({ x: viewBoxX, y: 0 });
  }, [onPositionClick, panOffset, zoom, minX]);

  // Hide overlapping tick labels via DOM measurement after layout.
  // Priority ticks (e.g. year boundaries when months visible) are placed first,
  // then non-priority ticks fill remaining gaps.
  const axisAreaRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const axisArea = axisAreaRef.current;
    if (!axisArea) return;
    const labels = axisArea.querySelectorAll<HTMLElement>('[data-tick-label]');

    // First pass: hide all, measure all
    const entries: Array<{ label: HTMLElement; rect: DOMRect; priority: boolean }> = [];
    for (const label of labels) {
      label.style.visibility = 'hidden';
      const rect = label.getBoundingClientRect();
      if (rect.width === 0) continue;
      entries.push({ label, rect, priority: label.dataset.tickPriority === 'true' });
    }

    // Place priority ticks first, then non-priority
    const kept: DOMRect[] = [];
    for (const pass of [true, false]) {
      for (const entry of entries) {
        if (entry.priority !== pass) continue;
        const overlaps = kept.some((prev) => prev.right > entry.rect.left && prev.left < entry.rect.right);
        if (!overlaps) {
          entry.label.style.visibility = '';
          kept.push(entry.rect);
        }
      }
    }
  }, [axisTicks, zoom, panOffset]);

  const tooltipTextRef = useRef('');
  const hoveredElementRef = useRef<TimelineElement | null>(null);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const hoveredLabelWasVisibleRef = useRef(false);

  // Re-evaluate tooltip when toggles/states change (e.g. click-to-reveal while hovering).
  // Also re-fire onElementHoverStart so Wikipedia preview timer begins immediately on reveal.
  useEffect(() => {
    const element = hoveredElementRef.current;
    if (!element) return;
    const labelVisible = shouldShowLabel(elementStates[element.id], elementToggle(elementToggles, toggles, element.id, 'showLabels'));
    const text = labelVisible
      ? `${element.label}: ${formatTimestampRange(element.start, element.end)}`
      : formatTimestampRange(element.start, element.end);
    tooltipTextRef.current = text;
    setTooltip({ x: lastMousePosRef.current.x, y: lastMousePosRef.current.y, text });
    // When a label becomes visible while hovering (click-to-reveal), re-fire hover
    // so the Wikipedia preview hook picks up the newly-revealed element immediately.
    if (labelVisible && !hoveredLabelWasVisibleRef.current) {
      onElementHoverStart?.(element.id);
    }
    hoveredLabelWasVisibleRef.current = labelVisible;
  }, [elementToggles, toggles, elementStates, onElementHoverStart]);

  const handleBarMouseEnter = useCallback(
    (element: TimelineElement, event: React.MouseEvent) => {
      hoveredElementRef.current = element;
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      onElementHoverStart?.(element.id);
      const labelVisible = shouldShowLabel(elementStates[element.id], elementToggle(elementToggles, toggles, element.id, 'showLabels'));
      hoveredLabelWasVisibleRef.current = labelVisible;
      // Show "label: dates" when label is visible, just dates when hidden (don't reveal the answer)
      const text = labelVisible
        ? `${element.label}: ${formatTimestampRange(element.start, element.end)}`
        : formatTimestampRange(element.start, element.end);
      tooltipTextRef.current = text;
      setTooltip({ x: event.clientX, y: event.clientY, text });
    },
    [elementToggles, toggles, elementStates, onElementHoverStart],
  );
  const handleBarMouseMove = useCallback((event: React.MouseEvent) => {
    lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    if (!tooltipTextRef.current) return;
    setTooltip({ x: event.clientX, y: event.clientY, text: tooltipTextRef.current });
  }, []);
  const handleBarMouseLeave = useCallback(() => {
    hoveredElementRef.current = null;
    hoveredLabelWasVisibleRef.current = false;
    tooltipTextRef.current = '';
    setTooltip(null);
    onElementHoverEnd?.();
  }, [onElementHoverEnd]);

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
          ref={innerContainerRef}
          className={styles.innerContainer}
          style={{
            width: `${timelineWidth}px`,
            transform: `translateX(${panOffset}px)`,
            transition: isScrolling && !isDragging.current ? 'transform 0.4s ease-out' : undefined,
          }}
          onClick={handleAreaClick}
        >
          {/* Axis */}
          <div className={styles.axisArea} ref={axisAreaRef}>
            {axisTicks.map((tick, i) => {
              const pixelX = (yearToViewBoxX(tick.fractionalYear) - minX) * zoom;
              return (
                <div key={i} className={styles.tick} style={{ left: `${pixelX}px` }}>
                  <div className={tick.isMajor ? styles.tickMarkMajor : styles.tickMarkMinor} />
                  {tick.showLabel && (
                    <div
                      data-tick-label
                      data-tick-priority={tick.priority || undefined}
                      className={tick.isMajor ? styles.tickLabelMajor : styles.tickLabelMinor}
                    >
                      {tick.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid lines (behind bars) */}
          <div className={styles.tracksArea} style={{ minHeight: `${totalContentHeight - AXIS_HEIGHT}px` }}>
            {axisTicks.filter((t) => t.isMajor).map((tick, i) => {
              const pixelX = (yearToViewBoxX(tick.fractionalYear) - minX) * zoom;
              return (
                <div
                  key={`grid-${i}`}
                  className={styles.gridLine}
                  style={{ left: `${pixelX}px` }}
                />
              );
            })}

            {/* Bars */}
            <AnimatePresence>
              {visibleElements.map((element) => {
                const layout = barLayouts.get(element.id);
                if (!layout) return null;

                const showBar = elementToggle(elementToggles, toggles, element.id, 'showBars');
                const showLabel = shouldShowLabel(elementStates[element.id], elementToggle(elementToggles, toggles, element.id, 'showLabels'));

                const state = elementStates[element.id];
                const stateClass = getStateClass(state);
                const showColours = elementToggle(elementToggles, toggles, element.id, 'showColours');
                // When category colours are on, status is shown via CSS outline (preserving the category fill).
                // When category colours are off, all bars are the same neutral colour, so status must use background.
                const bgColor = showColours
                  ? (categoryColorMap[element.category] ?? 'var(--color-accent)')
                  : (state !== undefined && state !== 'hidden' ? STATUS_COLORS[state].main : 'var(--color-accent)');
                const barOpacity = showBar ? 1 : 0.15;

                const showInsideLabel = showLabel && layout.pixelWidth >= 60;
                const showOutsideLabel = showLabel && !showInsideLabel && layout.outsideGap > 30;
                const isRevealing = autoRevealElementIds?.includes(element.id) ?? false;

                return (
                  <motion.div
                    key={element.id}
                    className={`${styles.bar} ${stateClass ?? ''} ${isRevealing ? styles.barRevealPulse : ''}`}
                    style={{
                      left: `${layout.pixelLeft}px`,
                      top: `${layout.pixelTop}px`,
                      width: `${layout.pixelWidth}px`,
                      height: `${layout.pixelHeight}px`,
                      backgroundColor: bgColor,
                      opacity: barOpacity,
                      zIndex: layout.trackIndex * 10 + layout.layer + 1,
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

        {contextLabel && (
          <div className={styles.contextLabel}>{contextLabel}</div>
        )}
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
    case 'correct-second': return styles.barCorrectSecond;
    case 'correct-third': return styles.barCorrectThird;
    case 'incorrect': return styles.barIncorrect;
    case 'missed': return styles.barMissed;
    case 'highlighted': return styles.barHighlighted;
    case 'hidden': return styles.barHidden;
    case 'context': return styles.barContext;
    default: return undefined;
  }
}

