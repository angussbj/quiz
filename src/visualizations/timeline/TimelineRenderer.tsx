import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import type { TimelineElement } from './TimelineElement';
import { isTimelineElement } from './TimelineElement';
import { buildCategoryColorMap } from './categoryColors';
import { computeAxisTicks } from './computeAxisTicks';
import { formatTimestampRange } from './TimelineTimestamp';
import { UNITS_PER_YEAR } from './buildTimelineElements';
import styles from './TimelineRenderer.module.css';

/** Default track height for empty timeline fallback. */
const DEFAULT_TRACK_HEIGHT = 40;

/**
 * All rendering dimensions derived from track height.
 * Because track height scales with the data range, these produce
 * consistent screen-pixel sizes regardless of the timeline span.
 */
interface Sizes {
  readonly fontSize: number;
  readonly labelPadding: number;
  readonly minWidthForInsideLabel: number;
  readonly axisHeight: number;
  readonly tickFontMajor: number;
  readonly tickFontMinor: number;
  readonly majorTickLength: number;
  readonly minorTickLength: number;
  readonly cornerRadius: number;
}

function computeSizes(trackHeight: number): Sizes {
  const fontSize = trackHeight * 0.35;
  const labelPadding = fontSize * 0.3;
  const charWidth = fontSize * 0.6;
  return {
    fontSize,
    labelPadding,
    minWidthForInsideLabel: charWidth * 5 + labelPadding * 2,
    axisHeight: trackHeight * 0.55,
    tickFontMajor: trackHeight * 0.18,
    tickFontMinor: trackHeight * 0.14,
    majorTickLength: trackHeight * 0.12,
    minorTickLength: trackHeight * 0.08,
    cornerRadius: trackHeight * 0.06,
  };
}

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export function TimelineRenderer(props: VisualizationRendererProps) {
  const { elements, elementStates, toggles, elementToggles, onElementClick, onPositionClick, clustering } = props;
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const timelineElements = useMemo(
    () => elements.filter(isTimelineElement),
    [elements],
  );

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(timelineElements.map((e) => e.category)),
    [timelineElements],
  );

  return (
    <>
      <ZoomPanContainer
        elements={elements}
        elementStates={elementStates}
        clustering={clustering}
      >
        <TimelineContent
          elements={timelineElements}
          elementStates={elementStates}
          toggles={toggles}
          elementToggles={elementToggles}
          categoryColorMap={categoryColorMap}
          onElementClick={onElementClick}
          onPositionClick={onPositionClick}
          onTooltipChange={setTooltip}
        />
      </ZoomPanContainer>
      {tooltip && createPortal(
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          {tooltip.text}
        </div>,
        document.body,
      )}
    </>
  );
}

interface TimelineContentProps {
  readonly elements: ReadonlyArray<TimelineElement>;
  readonly elementStates: Readonly<Record<string, string>>;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles?: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  readonly categoryColorMap: Readonly<Record<string, string>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onTooltipChange: (tooltip: TooltipState | null) => void;
}

function TimelineContent({
  elements,
  elementStates,
  toggles,
  elementToggles,
  categoryColorMap,
  onElementClick,
  onPositionClick,
  onTooltipChange,
}: TimelineContentProps) {
  const { scale, clusteredElementIds } = useZoomPan();

  const visibleElements = useMemo(
    () => elements.filter((e) =>
      !clusteredElementIds.has(e.id) && !e.id.startsWith('__spacer'),
    ),
    [elements, clusteredElementIds],
  );

  const { minX, maxX, maxTrackY, trackHeight } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxY = 0;
    for (const el of elements) {
      min = Math.min(min, el.viewBoxBounds.minX);
      max = Math.max(max, el.viewBoxBounds.maxX);
      maxY = Math.max(maxY, el.viewBoxBounds.maxY);
    }
    if (!isFinite(min)) return { minX: 0, maxX: 100, maxTrackY: DEFAULT_TRACK_HEIGHT, trackHeight: DEFAULT_TRACK_HEIGHT };
    const h = elements.length > 0
      ? elements[0].viewBoxBounds.maxY - elements[0].viewBoxBounds.minY
      : DEFAULT_TRACK_HEIGHT;
    return { minX: min, maxX: max, maxTrackY: maxY, trackHeight: h };
  }, [elements]);

  const sizes = useMemo(() => computeSizes(trackHeight), [trackHeight]);

  const minYear = minX / UNITS_PER_YEAR;
  const maxYear = maxX / UNITS_PER_YEAR;
  const approximatePixels = (maxX - minX) * scale;

  const axisTicks = useMemo(
    () => computeAxisTicks(minYear, maxYear, approximatePixels),
    [minYear, maxYear, approximatePixels],
  );

  const axisY = -sizes.axisHeight;

  const tooltipTextRef = useRef('');

  const handleBarMouseEnter = useCallback(
    (element: TimelineElement, event: React.MouseEvent) => {
      const text = `${element.label}: ${formatTimestampRange(element.start, element.end)}`;
      tooltipTextRef.current = text;
      onTooltipChange({ x: event.clientX, y: event.clientY, text });
    },
    [onTooltipChange],
  );

  const handleBarMouseMove = useCallback(
    (event: React.MouseEvent) => {
      onTooltipChange({
        x: event.clientX,
        y: event.clientY,
        text: tooltipTextRef.current,
      });
    },
    [onTooltipChange],
  );

  const handleBarMouseLeave = useCallback(() => {
    onTooltipChange(null);
  }, [onTooltipChange]);

  const handleSvgClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!onPositionClick) return;
      const svg = (event.target as SVGElement).ownerSVGElement;
      if (!svg) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());
      onPositionClick({ x: svgPoint.x, y: svgPoint.y });
    },
    [onPositionClick],
  );

  // Compute available space for outside labels (gap to next bar on same track)
  const outsideLabelSpace = useMemo(() => {
    const byTrack = new Map<number, TimelineElement[]>();
    for (const el of visibleElements) {
      const track = el.track ?? 0;
      const list = byTrack.get(track) ?? [];
      list.push(el);
      byTrack.set(track, list);
    }
    const result = new Map<string, number>();
    for (const [, trackElements] of byTrack) {
      const sorted = [...trackElements].sort(
        (a, b) => a.viewBoxBounds.minX - b.viewBoxBounds.minX,
      );
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        const gap = next
          ? next.viewBoxBounds.minX - current.viewBoxBounds.maxX
          : Infinity;
        result.set(current.id, gap);
      }
    }
    return result;
  }, [visibleElements]);

  return (
    <g onClick={handleSvgClick}>
      <TimelineAxis
        ticks={axisTicks}
        axisY={axisY}
        sizes={sizes}
        minX={minX}
        maxX={maxX}
        maxTrackY={maxTrackY}
      />

      <AnimatePresence>
        {visibleElements.map((element) => {
          const showBar = elementToggle(elementToggles, toggles, element.id, 'showBars');
          const showLabel = elementToggle(elementToggles, toggles, element.id, 'showLabels');
          return (
            <TimelineBar
              key={element.id}
              element={element}
              color={categoryColorMap[element.category] ?? 'var(--color-accent)'}
              state={elementStates[element.id]}
              sizes={sizes}
              outsideSpace={outsideLabelSpace.get(element.id) ?? Infinity}
              showBar={showBar}
              showLabel={showLabel}
              onClick={onElementClick}
              onMouseEnter={handleBarMouseEnter}
              onMouseMove={handleBarMouseMove}
              onMouseLeave={handleBarMouseLeave}
            />
          );
        })}
      </AnimatePresence>
    </g>
  );
}

interface TimelineAxisProps {
  readonly ticks: ReadonlyArray<{
    readonly fractionalYear: number;
    readonly label: string;
    readonly isMajor: boolean;
  }>;
  readonly axisY: number;
  readonly sizes: Sizes;
  readonly minX: number;
  readonly maxX: number;
  readonly maxTrackY: number;
}

function TimelineAxis({ ticks, axisY, sizes, minX, maxX, maxTrackY }: TimelineAxisProps) {
  return (
    <g>
      <line className={styles.axisLine} x1={minX} y1={0} x2={maxX} y2={0} />

      {ticks.map((tick, i) => {
        const x = tick.fractionalYear * UNITS_PER_YEAR;
        const tickLen = tick.isMajor ? sizes.majorTickLength : sizes.minorTickLength;
        const tickGap = sizes.minorTickLength * 0.4;
        return (
          <g key={i}>
            <line
              className={tick.isMajor ? styles.tickMajor : styles.tickMinor}
              x1={x}
              y1={axisY + sizes.axisHeight - tickLen}
              x2={x}
              y2={axisY + sizes.axisHeight}
            />
            <text
              className={tick.isMajor ? styles.tickLabelMajor : styles.tickLabelMinor}
              x={x}
              y={axisY + sizes.axisHeight - tickLen - tickGap}
              textAnchor="middle"
              fontSize={tick.isMajor ? sizes.tickFontMajor : sizes.tickFontMinor}
            >
              {tick.label}
            </text>
            {tick.isMajor && (
              <line className={styles.gridLine} x1={x} y1={0} x2={x} y2={maxTrackY} />
            )}
          </g>
        );
      })}
    </g>
  );
}

interface TimelineBarProps {
  readonly element: TimelineElement;
  readonly color: string;
  readonly state: string | undefined;
  readonly sizes: Sizes;
  readonly outsideSpace: number;
  readonly showBar: boolean;
  readonly showLabel: boolean;
  readonly onClick?: (elementId: string) => void;
  readonly onMouseEnter: (element: TimelineElement, event: React.MouseEvent) => void;
  readonly onMouseMove: (event: React.MouseEvent) => void;
  readonly onMouseLeave: () => void;
}

function TimelineBar({
  element,
  color,
  state,
  sizes,
  outsideSpace,
  showBar,
  showLabel,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: TimelineBarProps) {
  const { minX, minY, maxX, maxY } = element.viewBoxBounds;
  const width = maxX - minX;
  const height = maxY - minY;

  const stateClass = state ? getStateClass(state) : undefined;
  const fillColor = stateClass ? undefined : color;
  const barOpacity = showBar ? 1 : 0.15;

  const showInsideLabel = showLabel && width >= sizes.minWidthForInsideLabel;
  const outsideLabel = showLabel && !showInsideLabel
    ? truncateLabel(element.label, outsideSpace - sizes.labelPadding, sizes)
    : null;

  // Translate to the bar's left-center so scaleX expands from the left edge.
  // All child coordinates are relative to (minX, minY).
  return (
    <g transform={`translate(${minX}, ${minY})`}>
      <motion.g
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ originX: 0, originY: 0.5 }}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(element.id);
        }}
        onMouseEnter={(e) => onMouseEnter(element, e)}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <rect
          className={`${styles.bar} ${stateClass ?? ''}`}
          x={0}
          y={0}
          width={width}
          height={height}
          fill={fillColor}
          opacity={barOpacity}
          rx={sizes.cornerRadius}
          ry={sizes.cornerRadius}
        />
        {showInsideLabel ? (
          <text
            className={styles.barLabel}
            x={sizes.labelPadding}
            y={height / 2}
            dominantBaseline="central"
            fontSize={sizes.fontSize}
          >
            {truncateLabel(element.label, width, sizes)}
          </text>
        ) : outsideLabel ? (
          <text
            className={styles.barLabelOutside}
            x={width + sizes.labelPadding}
            y={height / 2}
            dominantBaseline="central"
            fontSize={sizes.fontSize}
          >
            {outsideLabel}
          </text>
        ) : null}
      </motion.g>
    </g>
  );
}

function getStateClass(state: string): string | undefined {
  switch (state) {
    case 'correct': return styles.barCorrect;
    case 'incorrect': return styles.barIncorrect;
    case 'highlighted': return styles.barHighlighted;
    case 'hidden': return styles.barHidden;
    case 'revealed': return styles.barRevealed;
    default: return undefined;
  }
}

function truncateLabel(label: string, availableWidth: number, sizes: Sizes): string {
  const charWidth = sizes.fontSize * 0.6;
  const maxChars = Math.floor((availableWidth - sizes.labelPadding * 2) / charWidth);
  if (maxChars <= 0) return '';
  if (label.length <= maxChars) return label;
  if (maxChars <= 3) return label.slice(0, maxChars);
  return label.slice(0, maxChars - 1) + '\u2026';
}
