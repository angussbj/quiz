/**
 * SPIKE: Renders each quiz shape element in its own SVG for compositing isolation.
 * This prevents CSS hover effects on one element from triggering repaints of others.
 *
 * Each element SVG uses `contain: strict` and `will-change: opacity` to hint the
 * browser to isolate repaints to GPU compositing layers.
 */
import { memo, useCallback, useRef } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { useZoomPan } from '../ZoomPanContext';
import { isMapElement } from './MapElement';
import type { MapElement } from './MapElement';
import styles from './MapRenderer.module.css';

const GROUP_COLORS = [
  'var(--color-group-1)',
  'var(--color-group-2)',
  'var(--color-group-3)',
  'var(--color-group-4)',
  'var(--color-group-5)',
  'var(--color-group-6)',
  'var(--color-group-7)',
  'var(--color-group-8)',
];

function groupColor(group: string | undefined, groups: ReadonlyArray<string>): string {
  if (!group) return GROUP_COLORS[0];
  const index = groups.indexOf(group);
  return GROUP_COLORS[index >= 0 ? index % GROUP_COLORS.length : 0];
}

function stateFillOpacity(state: ElementVisualState | undefined): number {
  switch (state) {
    case 'hidden':
      return 0;
    case 'correct':
    case 'correct-second':
    case 'correct-third':
    case 'incorrect':
    case 'missed':
    case 'highlighted':
      return 0.3;
    case 'default':
      return 0.6;
    case 'context':
      return 0.4;
    default:
      return 0.15;
  }
}

function strokeOpacity(state: ElementVisualState | undefined): number {
  switch (state) {
    case 'hidden':
      return 0;
    case 'correct':
    case 'correct-second':
    case 'correct-third':
    case 'incorrect':
    case 'missed':
    case 'highlighted':
      return 1;
    case 'default':
    case 'context':
      return 0.8;
    default:
      return 0.6;
  }
}

/** Split a combined SVG path `d` string into individual subpaths (each starting with M). */
function splitSubpaths(d: string): ReadonlyArray<string> {
  const parts: Array<string> = [];
  const matches = d.matchAll(/M\s/g);
  const indices: Array<number> = [];
  for (const m of matches) {
    if (m.index !== undefined) indices.push(m.index);
  }
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i < indices.length - 1 ? indices[i + 1] : d.length;
    const sub = d.slice(start, end).trim();
    if (sub) parts.push(sub);
  }
  return parts;
}

const RIVER_STROKE_WIDTH = 0.15;
const RIVER_HIT_STROKE_WIDTH = 2.0;
const DRAG_THRESHOLD_PX = 5;

/** Each overlay SVG is absolutely positioned, with paint containment for GPU isolation. */
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  contain: 'strict',
  willChange: 'opacity',
};

interface MapElementOverlaysProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly showRegionColors: boolean;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
}

export const MapElementOverlays = memo(function MapElementOverlays({
  elements,
  elementStates,
  uniqueGroups,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  showRegionColors,
  elementStateColorOverrides,
}: MapElementOverlaysProps) {
  const { viewBoxString, clusteredElementIds } = useZoomPan();

  return (
    <>
      {elements.map((element) => {
        if (!isMapElement(element) || !element.svgPathData) return null;
        if (clusteredElementIds.has(element.id) && element.pathRenderStyle === 'stroke') return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;

        return (
          <OverlayElement
            key={element.id}
            element={element}
            state={state}
            viewBoxString={viewBoxString}
            uniqueGroups={uniqueGroups}
            onElementClick={onElementClick}
            onElementHoverStart={onElementHoverStart}
            onElementHoverEnd={onElementHoverEnd}
            showRegionColors={showRegionColors}
            elementStateColorOverrides={elementStateColorOverrides}
          />
        );
      })}
    </>
  );
});

interface OverlayElementProps {
  readonly element: MapElement;
  readonly state: ElementVisualState | undefined;
  readonly viewBoxString: string;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly showRegionColors: boolean;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
}

/** Each element in its own memo'd SVG — React skips re-render when state hasn't changed. */
const OverlayElement = memo(function OverlayElement({
  element,
  state,
  viewBoxString,
  uniqueGroups,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  showRegionColors,
  elementStateColorOverrides,
}: OverlayElementProps) {
  const downRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const isDrag = useCallback((e: React.MouseEvent): boolean => {
    if (!downRef.current) return false;
    const dx = e.clientX - downRef.current.x;
    const dy = e.clientY - downRef.current.y;
    return Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX;
  }, []);

  const isStrokePath = element.pathRenderStyle === 'stroke';
  const color = (state !== undefined && state !== 'hidden')
    ? (elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main)
    : (isStrokePath ? 'var(--color-lake)' : (showRegionColors ? groupColor(element.group, uniqueGroups) : 'var(--color-bg-primary)'));

  if (isStrokePath) {
    const subpaths = splitSubpaths(element.svgPathData ?? '');
    const strokeD = subpaths.filter((p) => !p.endsWith('Z')).join(' ');
    if (!strokeD) return null;
    const effectiveRiverStrokeWidth = state === 'highlighted' ? RIVER_STROKE_WIDTH * 2.5 : RIVER_STROKE_WIDTH;
    const isHoverable = !onElementClick && !!onElementHoverStart;

    return (
      <svg
        viewBox={viewBoxString}
        preserveAspectRatio="xMidYMid meet"
        style={overlayStyle}
      >
        <g
          className={onElementClick ? styles.interactiveGroup : isHoverable ? styles.hoverableGroup : undefined}
          onPointerDown={onPointerDown}
        >
          {(onElementClick || isHoverable) && (
            <path
              d={strokeD}
              style={{
                fill: 'none',
                stroke: 'transparent',
                strokeWidth: RIVER_HIT_STROKE_WIDTH,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                pointerEvents: 'auto',
              }}
              className={onElementClick ? styles.interactivePath : styles.hoverablePath}
              onClick={onElementClick ? (e) => {
                if (isDrag(e)) return;
                e.stopPropagation();
                onElementClick(element.id);
              } : undefined}
              onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
              onMouseLeave={onElementHoverEnd}
            />
          )}
          <path
            d={strokeD}
            style={{
              fill: 'none',
              stroke: color,
              strokeWidth: effectiveRiverStrokeWidth,
              strokeOpacity: strokeOpacity(state),
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
            pointerEvents={(onElementClick || isHoverable) ? 'none' : undefined}
            className={onElementClick ? styles.interactivePath : undefined}
          />
        </g>
      </svg>
    );
  }

  // Context fill shapes render like background borders
  if (state === 'context') {
    return (
      <svg
        viewBox={viewBoxString}
        preserveAspectRatio="xMidYMid meet"
        style={overlayStyle}
      >
        <path
          d={element.svgPathData ?? ''}
          fillRule="evenodd"
          className={styles.borderPath}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox={viewBoxString}
      preserveAspectRatio="xMidYMid meet"
      style={overlayStyle}
      onPointerDown={onPointerDown}
    >
      <path
        d={element.svgPathData ?? ''}
        fillRule="evenodd"
        style={{
          fill: color,
          fillOpacity: stateFillOpacity(state),
          stroke: color,
          strokeWidth: 0.075,
          pointerEvents: 'auto',
        }}
        className={onElementClick ? styles.interactivePath : onElementHoverStart ? styles.hoverablePath : styles.borderPath}
        onClick={
          onElementClick
            ? (e) => {
                if (isDrag(e)) return;
                e.stopPropagation();
                onElementClick(element.id);
              }
            : undefined
        }
        onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
        onMouseLeave={onElementHoverEnd}
      />
    </svg>
  );
});
