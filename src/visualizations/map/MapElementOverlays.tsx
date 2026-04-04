/**
 * Renders all quiz shape elements in a single overlay SVG, grouped by visual
 * state so that highlighted elements paint on top of correct, correct on top
 * of default, etc. SVG has no inherent z-index — paint order IS z-order.
 */
import { memo, useMemo } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementColorMap } from '../elementColorScale';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
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

/** Render priority: lower values paint first (behind), higher paint last (on top). */
function stateRenderPriority(state: ElementVisualState | undefined): number {
  switch (state) {
    case 'context': return 1;
    case undefined: return 2;
    case 'default': return 2;
    case 'missed': return 3;
    case 'incorrect': return 4;
    case 'correct-third': return 5;
    case 'correct-second': return 6;
    case 'correct': return 7;
    case 'highlighted': return 8;
    default: return 2;
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

interface MapElementShapesProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly showRegionColors: boolean;
  readonly elementColorMap?: ElementColorMap;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
  readonly isDrag: (e: React.MouseEvent) => boolean;
  readonly clusteredElementIds: ReadonlySet<string>;
}

export const MapElementShapes = memo(function MapElementShapes({
  elements,
  elementStates,
  uniqueGroups,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  showRegionColors,
  elementColorMap,
  elementStateColorOverrides,
  isDrag,
  clusteredElementIds,
}: MapElementShapesProps) {
  // Sort elements by state render priority so highlighted elements paint last (on top).
  const sortedElements = useMemo(() => {
    const visible: Array<MapElement> = [];
    for (const element of elements) {
      if (!isMapElement(element) || !element.svgPathData) continue;
      if (clusteredElementIds.has(element.id) && element.pathRenderStyle === 'stroke') continue;
      const state = elementStates[element.id];
      if (state === 'hidden') continue;
      visible.push(element);
    }
    visible.sort((a, b) => {
      const pa = stateRenderPriority(elementStates[a.id]);
      const pb = stateRenderPriority(elementStates[b.id]);
      return pa - pb;
    });
    return visible;
  }, [elements, elementStates, clusteredElementIds]);

  return (
    <>
      {sortedElements.map((element) => {
        const state = elementStates[element.id];
        return (
          <ElementShape
            key={element.id}
            element={element}
            state={state}
            uniqueGroups={uniqueGroups}
            onElementClick={onElementClick}
            onElementHoverStart={onElementHoverStart}
            onElementHoverEnd={onElementHoverEnd}
            showRegionColors={showRegionColors}
            colorFill={elementColorMap?.get(element.id)}
            elementStateColorOverrides={elementStateColorOverrides}
            isDrag={isDrag}
          />
        );
      })}
    </>
  );
});

interface ElementShapeProps {
  readonly element: MapElement;
  readonly state: ElementVisualState | undefined;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly showRegionColors: boolean;
  readonly colorFill?: string;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
  readonly isDrag: (e: React.MouseEvent) => boolean;
}

const ElementShape = memo(function ElementShape({
  element,
  state,
  uniqueGroups,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  showRegionColors,
  colorFill,
  elementStateColorOverrides,
  isDrag,
}: ElementShapeProps) {
  const isStrokePath = element.pathRenderStyle === 'stroke';

  // Color fill applies to unanswered states only (hidden, default, context),
  // same as the periodic table. Answered elements keep their feedback colors.
  const isUnanswered = state === undefined || state === 'hidden' || state === 'default' || state === 'context';
  const useColorFill = colorFill !== undefined && isUnanswered && !isStrokePath;

  const color = useColorFill
    ? colorFill
    : (state !== undefined && state !== 'hidden')
      ? (elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main)
      : (isStrokePath ? 'var(--color-lake)' : (showRegionColors ? groupColor(element.group, uniqueGroups) : 'var(--color-bg-primary)'));

  if (isStrokePath) {
    const subpaths = splitSubpaths(element.svgPathData ?? '');
    const strokeD = subpaths.filter((p) => !p.endsWith('Z')).join(' ');
    if (!strokeD) return null;
    const effectiveRiverStrokeWidth = state === 'highlighted' ? RIVER_STROKE_WIDTH * 2.5 : RIVER_STROKE_WIDTH;

    // Stroke elements use closest-path detection (in MapRenderer) for hover/click,
    // so no per-element pointer event handlers or invisible hit-area strokes are needed.
    return (
      <path
        d={strokeD}
        style={{
          fill: 'none',
          stroke: color,
          strokeWidth: effectiveRiverStrokeWidth,
          strokeOpacity: strokeOpacity(state),
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          pointerEvents: 'none',
        }}
      />
    );
  }

  // Context fill shapes render like background borders — unless color fill is active
  if (state === 'context' && !useColorFill) {
    return (
      <path
        d={element.svgPathData ?? ''}
        fillRule="evenodd"
        className={styles.borderPath}
      />
    );
  }

  return (
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
  );
});
