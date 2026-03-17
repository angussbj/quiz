import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import type { TimelineElement } from './TimelineElement';
import { isTimelineElement } from './TimelineElement';
import { buildCategoryColorMap } from './categoryColors';
import { computeAxisTicks } from './computeAxisTicks';
import { formatTimestampRange } from './TimelineTimestamp';
import { TRACK_HEIGHT, UNITS_PER_YEAR } from './buildTimelineElements';
import styles from './TimelineRenderer.module.css';

/** Axis area height in viewBox units, above the track area. */
const AXIS_HEIGHT = 30;
/** Font size for bar labels in viewBox units. */
const BAR_LABEL_FONT_SIZE = 14;
/** Minimum bar width in viewBox units to fit an inside label. */
const MIN_WIDTH_FOR_INSIDE_LABEL = 60;
/** Padding inside bars for labels in viewBox units. */
const LABEL_PADDING = 4;

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

export function TimelineRenderer(props: VisualizationRendererProps) {
  const { elements, elementStates, onElementClick, onPositionClick, clustering } = props;

  const timelineElements = useMemo(
    () => elements.filter(isTimelineElement),
    [elements],
  );

  const categoryColorMap = useMemo(
    () => buildCategoryColorMap(timelineElements.map((e) => e.category)),
    [timelineElements],
  );

  return (
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
      />
    </ZoomPanContainer>
  );
}

interface TimelineContentProps {
  readonly elements: ReadonlyArray<TimelineElement>;
  readonly elementStates: Readonly<Record<string, string>>;
  readonly categoryColorMap: Readonly<Record<string, string>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: { readonly x: number; readonly y: number }) => void;
}

function TimelineContent({
  elements,
  elementStates,
  categoryColorMap,
  onElementClick,
  onPositionClick,
}: TimelineContentProps) {
  const { scale, clusteredElementIds } = useZoomPan();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const visibleElements = useMemo(
    () => elements.filter((e) => !clusteredElementIds.has(e.id)),
    [elements, clusteredElementIds],
  );

  // Compute extent from all elements (in viewBox units)
  const { minX, maxX, maxTrackY } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    let maxY = 0;
    for (const el of elements) {
      min = Math.min(min, el.viewBoxBounds.minX);
      max = Math.max(max, el.viewBoxBounds.maxX);
      maxY = Math.max(maxY, el.viewBoxBounds.maxY);
    }
    if (!isFinite(min)) return { minX: 0, maxX: 100, maxTrackY: TRACK_HEIGHT };
    return { minX: min, maxX: max, maxTrackY: maxY };
  }, [elements]);

  // Convert viewBox extent back to years for tick computation
  const minYear = minX / UNITS_PER_YEAR;
  const maxYear = maxX / UNITS_PER_YEAR;
  const rangeYears = maxYear - minYear;
  const approximatePixels = rangeYears * scale * 80;

  const axisTicks = useMemo(
    () => computeAxisTicks(minYear, maxYear, approximatePixels),
    [minYear, maxYear, approximatePixels],
  );

  const axisY = -AXIS_HEIGHT;

  const handleBarMouseEnter = useCallback(
    (element: TimelineElement, event: React.MouseEvent) => {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        text: `${element.label}: ${formatTimestampRange(element.start, element.end)}`,
      });
    },
    [],
  );

  const handleBarMouseMove = useCallback(
    (event: React.MouseEvent) => {
      setTooltip((prev) =>
        prev ? { ...prev, x: event.clientX, y: event.clientY } : null,
      );
    },
    [],
  );

  const handleBarMouseLeave = useCallback(() => {
    setTooltip(null);
  }, []);

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
        {/* Axis */}
        <TimelineAxis
          ticks={axisTicks}
          axisY={axisY}
          minX={minX}
          maxX={maxX}
          maxTrackY={maxTrackY}
        />

        {/* Bars */}
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

      {/* Tooltip rendered as foreignObject so it floats above SVG */}
      {tooltip && (
        <foreignObject x={0} y={0} width={1} height={1} overflow="visible">
          <div
            className={styles.tooltip}
            style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
          >
            {tooltip.text}
          </div>
        </foreignObject>
      )}
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
  readonly minX: number;
  readonly maxX: number;
  readonly maxTrackY: number;
}

/** Height of a major tick mark in viewBox units. */
const MAJOR_TICK_LENGTH = 8;
/** Height of a minor tick mark in viewBox units. */
const MINOR_TICK_LENGTH = 5;
/** Font size for major tick labels. */
const TICK_FONT_MAJOR = 10;
/** Font size for minor tick labels. */
const TICK_FONT_MINOR = 8;

function TimelineAxis({ ticks, axisY, minX, maxX, maxTrackY }: TimelineAxisProps) {
  return (
    <g>
      {/* Axis baseline */}
      <line className={styles.axisLine} x1={minX} y1={0} x2={maxX} y2={0} />

      {/* Tick marks and labels */}
      {ticks.map((tick, i) => {
        const x = tick.fractionalYear * UNITS_PER_YEAR;
        const tickLen = tick.isMajor ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH;
        return (
          <g key={i}>
            <line
              className={tick.isMajor ? styles.tickMajor : styles.tickMinor}
              x1={x}
              y1={axisY + AXIS_HEIGHT - tickLen}
              x2={x}
              y2={axisY + AXIS_HEIGHT}
            />
            <text
              className={tick.isMajor ? styles.tickLabelMajor : styles.tickLabelMinor}
              x={x}
              y={axisY + AXIS_HEIGHT - tickLen - 3}
              textAnchor="middle"
              fontSize={tick.isMajor ? TICK_FONT_MAJOR : TICK_FONT_MINOR}
            >
              {tick.label}
            </text>
            {/* Vertical grid line for major ticks */}
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

/**
 * Truncate a label to fit within a given viewBox width.
 * Uses a rough character-width estimate based on the bar label font size.
 */
function truncateLabel(label: string, availableWidth: number): string {
  const charWidth = BAR_LABEL_FONT_SIZE * 0.6;
  const maxChars = Math.floor((availableWidth - LABEL_PADDING * 2) / charWidth);
  if (maxChars <= 0) return '';
  if (label.length <= maxChars) return label;
  if (maxChars <= 3) return label.slice(0, maxChars);
  return label.slice(0, maxChars - 1) + '\u2026';
}
