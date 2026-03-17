import { useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import type { TimelineElement } from './TimelineElement';
import { isTimelineElement } from './TimelineElement';
import { buildCategoryColorMap } from './categoryColors';
import { computeAxisTicks } from './computeAxisTicks';
import { formatTimestampRange } from './TimelineTimestamp';
import { UNITS_PER_YEAR } from './buildTimelineElements';
import styles from './TimelineRenderer.module.css';

/** Default track height for empty timeline fallback. */
const DEFAULT_TRACK_HEIGHT = 40;
/** Font size for bar labels in viewBox units. */
const BAR_LABEL_FONT_SIZE = 14;
/** Minimum bar width in viewBox units to fit an inside label. */
const MIN_WIDTH_FOR_INSIDE_LABEL = BAR_LABEL_FONT_SIZE * 0.6 * 5 + 8;
/** Padding inside bars for labels in viewBox units. */
const LABEL_PADDING = 4;
/** Font size for major axis tick labels. */
const TICK_FONT_MAJOR = 10;
/** Font size for minor axis tick labels. */
const TICK_FONT_MINOR = 8;
/** Major tick mark length. */
const MAJOR_TICK_LENGTH = 8;
/** Minor tick mark length. */
const MINOR_TICK_LENGTH = 5;

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export function TimelineRenderer(props: VisualizationRendererProps) {
  const { elements, elementStates, onElementClick, onPositionClick, clustering } = props;
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
  readonly categoryColorMap: Readonly<Record<string, string>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onTooltipChange: (tooltip: TooltipState | null) => void;
}

function TimelineContent({
  elements,
  elementStates,
  categoryColorMap,
  onElementClick,
  onPositionClick,
  onTooltipChange,
}: TimelineContentProps) {
  const { scale, clusteredElementIds } = useZoomPan();

  const visibleElements = useMemo(
    () => elements.filter((e) => !clusteredElementIds.has(e.id)),
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
    // Derive track height from the first element's bounds
    const h = elements.length > 0
      ? elements[0].viewBoxBounds.maxY - elements[0].viewBoxBounds.minY
      : DEFAULT_TRACK_HEIGHT;
    return { minX: min, maxX: max, maxTrackY: maxY, trackHeight: h };
  }, [elements]);

  const minYear = minX / UNITS_PER_YEAR;
  const maxYear = maxX / UNITS_PER_YEAR;
  const approximatePixels = 1200 * scale;

  const axisTicks = useMemo(
    () => computeAxisTicks(minYear, maxYear, approximatePixels),
    [minYear, maxYear, approximatePixels],
  );

  const axisHeight = trackHeight * 0.6;
  const axisY = -axisHeight;

  const handleBarMouseEnter = useCallback(
    (element: TimelineElement, event: React.MouseEvent) => {
      const text = `${element.label}: ${formatTimestampRange(element.start, element.end)}`;
      tooltipTextRef.current = text;
      onTooltipChange({ x: event.clientX, y: event.clientY, text });
    },
    [onTooltipChange],
  );

  const tooltipTextRef = useRef('');

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

  return (
    <>
      <g onClick={handleSvgClick}>
        <TimelineAxis
          ticks={axisTicks}
          axisY={axisY}
          axisHeight={axisHeight}
          minX={minX}
          maxX={maxX}
          maxTrackY={maxTrackY}
        />

        <AnimatePresence>
          {visibleElements.map((element) => (
            <TimelineBar
              key={element.id}
              element={element}
              color={categoryColorMap[element.category] ?? 'var(--color-accent)'}
              state={elementStates[element.id]}
              onClick={onElementClick}
              onMouseEnter={handleBarMouseEnter}
              onMouseMove={handleBarMouseMove}
              onMouseLeave={handleBarMouseLeave}
            />
          ))}
        </AnimatePresence>
      </g>

    </>
  );
}

interface TimelineAxisProps {
  readonly ticks: ReadonlyArray<{
    readonly fractionalYear: number;
    readonly label: string;
    readonly isMajor: boolean;
  }>;
  readonly axisY: number;
  readonly axisHeight: number;
  readonly minX: number;
  readonly maxX: number;
  readonly maxTrackY: number;
}

function TimelineAxis({ ticks, axisY, axisHeight, minX, maxX, maxTrackY }: TimelineAxisProps) {
  return (
    <g>
      <line className={styles.axisLine} x1={minX} y1={0} x2={maxX} y2={0} />

      {ticks.map((tick, i) => {
        const x = tick.fractionalYear * UNITS_PER_YEAR;
        const tickLen = tick.isMajor ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH;
        return (
          <g key={i}>
            <line
              className={tick.isMajor ? styles.tickMajor : styles.tickMinor}
              x1={x}
              y1={axisY + axisHeight - tickLen}
              x2={x}
              y2={axisY + axisHeight}
            />
            <text
              className={tick.isMajor ? styles.tickLabelMajor : styles.tickLabelMinor}
              x={x}
              y={axisY + axisHeight - tickLen - 3}
              textAnchor="middle"
              fontSize={tick.isMajor ? TICK_FONT_MAJOR : TICK_FONT_MINOR}
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
  readonly onClick?: (elementId: string) => void;
  readonly onMouseEnter: (element: TimelineElement, event: React.MouseEvent) => void;
  readonly onMouseMove: (event: React.MouseEvent) => void;
  readonly onMouseLeave: () => void;
}

function TimelineBar({
  element,
  color,
  state,
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

  const showInsideLabel = width >= MIN_WIDTH_FOR_INSIDE_LABEL;

  return (
    <motion.g
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={{ opacity: 0, scaleX: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ originX: `${minX}px`, originY: `${minY + height / 2}px` }}
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
        x={minX}
        y={minY}
        width={width}
        height={height}
        fill={fillColor}
        rx={3}
        ry={3}
      />
      {showInsideLabel ? (
        <text
          className={styles.barLabel}
          x={minX + LABEL_PADDING}
          y={minY + height / 2}
          dominantBaseline="central"
          fontSize={BAR_LABEL_FONT_SIZE}
        >
          {truncateLabel(element.label, width)}
        </text>
      ) : (
        <text
          className={styles.barLabelOutside}
          x={maxX + LABEL_PADDING}
          y={minY + height / 2}
          dominantBaseline="central"
          fontSize={BAR_LABEL_FONT_SIZE}
        >
          {element.label}
        </text>
      )}
    </motion.g>
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

function truncateLabel(label: string, availableWidth: number): string {
  const charWidth = BAR_LABEL_FONT_SIZE * 0.6;
  const maxChars = Math.floor((availableWidth - LABEL_PADDING * 2) / charWidth);
  if (maxChars <= 0) return '';
  if (label.length <= maxChars) return label;
  if (maxChars <= 3) return label.slice(0, maxChars);
  return label.slice(0, maxChars - 1) + '\u2026';
}
