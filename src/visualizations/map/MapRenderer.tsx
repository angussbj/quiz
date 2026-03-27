import { useCallback, useMemo, useRef } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationRendererProps, ClusteringConfig } from '../VisualizationRendererProps';
import type { ElementVisualState, ViewBoxPosition, VisualizationElement } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { RevealPulseOverlay } from '../RevealPulse';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { isMapElement } from './MapElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { MapCountryLabels } from './MapCountryLabels';
import { computeElementLabels } from './computeElementLabels';
import { shouldShowLabel } from '../shouldShowLabel';
import styles from './MapRenderer.module.css';

/** Default clustering for map quizzes: cluster overlapping city dots. */
const DEFAULT_MAP_CLUSTERING: ClusteringConfig = {
  minScreenPixelDistance: 10,
  clusterAbsorptionDistance: 25,
  clusterMergeDistance: 40,
  countedState: 'correct',
};

/** City dot radius in screen pixels. Converted to viewBox units at render time. */
const DOT_SCREEN_RADIUS = 5;
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

export function MapRenderer({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  clustering,
  onClusterClick,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  svgOverlay,
  initialCameraPosition,
  putInView,
  elementStateColorOverrides,
  autoRevealElementIds,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );
  const showBorders = toggles['showBorders'] !== false;
  // Disable default clustering for stroke-style elements since clustering
  // by centroid doesn't make sense for line features spread across the map.
  const hasStrokeElements = elements.some((e) => isMapElement(e) && e.pathRenderStyle === 'stroke');
  const effectiveClustering = clustering ?? (hasStrokeElements ? undefined : DEFAULT_MAP_CLUSTERING);

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      clustering={effectiveClustering}
      onClusterClick={onClusterClick}
      initialCameraPosition={initialCameraPosition}
      backgroundPaths={backgroundPaths}
      putInView={putInView}
    >
      <MapContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        onElementHoverStart={onElementHoverStart}
        onElementHoverEnd={onElementHoverEnd}
        uniqueGroups={uniqueGroups}
        showBorders={showBorders}
        toggles={toggles}
        elementToggles={elementToggles}
        backgroundPaths={backgroundPaths}
        lakePaths={lakePaths}
        backgroundLabels={backgroundLabels}
        elementStateColorOverrides={elementStateColorOverrides}
      />
      {svgOverlay}
      <RevealPulseOverlay elements={elements} elementStates={elementStates} autoRevealElementIds={autoRevealElementIds} />
    </ZoomPanContainer>
  );
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

/** Stroke width for river paths in viewBox units (matches border stroke-width). */
const RIVER_STROKE_WIDTH = 0.15;

/** Wider hit area for clicking river paths in viewBox units. */
const RIVER_HIT_STROKE_WIDTH = 2.0;

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

/** Render shape elements filtered to a specific state (or undefined for default/no-state). */
function renderShapeElements(
  elements: VisualizationRendererProps['elements'],
  elementStates: VisualizationRendererProps['elementStates'],
  uniqueGroups: ReadonlyArray<string>,
  clusteredElementIds: ReadonlySet<string>,
  onElementClick: ((elementId: string) => void) | undefined,
  targetState: ElementVisualState | undefined,
  riverStrokeWidth: number,
  riverHitStrokeWidth: number,
  showRegionColors: boolean,
  isDrag: (e: React.MouseEvent) => boolean,
  elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'],
  onElementHoverStart?: (elementId: string) => void,
  onElementHoverEnd?: () => void,
) {
  return elements.map((element) => {
    if (!isMapElement(element) || !element.svgPathData) return null;
    // Stroke elements (rivers) are hidden when clustered; fill shapes (countries) render regardless
    if (clusteredElementIds.has(element.id) && element.pathRenderStyle === 'stroke') return null;
    const state = elementStates[element.id];
    if (state === 'hidden') return null;
    if (targetState === undefined) {
      // Default layer: only elements with no state assigned
      if (state !== undefined) return null;
    } else {
      if (state !== targetState) return null;
    }
    const isStrokePath = element.pathRenderStyle === 'stroke';
    const effectiveState = state;

    // Rivers use a neutral water color instead of region-based group colors
    const color = effectiveState !== undefined
      ? (elementStateColorOverrides?.[effectiveState] ?? STATUS_COLORS[effectiveState].main)
      : (isStrokePath ? 'var(--color-lake)' : (showRegionColors ? groupColor(element.group, uniqueGroups) : 'var(--color-bg-primary)'));
    const effectiveRiverStrokeWidth = isStrokePath && effectiveState === 'highlighted' ? riverStrokeWidth * 2.5 : riverStrokeWidth;

    if (isStrokePath) {
      // Split combined path into subpaths. Z-closed subpaths are lake polygons
      // embedded by Natural Earth — skip them (lakes are rendered separately).
      const subpaths = splitSubpaths(element.svgPathData);
      const strokeD = subpaths.filter((p) => !p.endsWith('Z')).join(' ');
      const handleClick = onElementClick;
      const isHoverable = !handleClick && !!onElementHoverStart;

      return (
        <g key={`shape-${element.id}`} className={handleClick ? styles.interactiveGroup : isHoverable ? styles.hoverableGroup : undefined}>
          {/* Invisible wider hit area for clicking/hovering (strokes only) */}
          {(handleClick || isHoverable) && strokeD && (
            <path
              d={strokeD}
              style={{
                fill: 'none',
                stroke: 'transparent',
                strokeWidth: riverHitStrokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
              className={handleClick ? styles.interactivePath : styles.hoverablePath}
              onClick={handleClick ? (e) => {
                if (isDrag(e)) return;
                e.stopPropagation();
                handleClick(element.id);
              } : undefined}
              onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
              onMouseLeave={onElementHoverEnd}
            />
          )}
          {/* Visible river strokes */}
          {strokeD && (
            <path
              d={strokeD}
              style={{
                fill: 'none',
                stroke: color,
                strokeWidth: effectiveRiverStrokeWidth,
                strokeOpacity: strokeOpacity(effectiveState),
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
              pointerEvents={(handleClick || isHoverable) ? 'none' : undefined}
              className={handleClick ? styles.interactivePath : undefined}
              onClick={
                handleClick
                  ? (e) => {
                      if (isDrag(e)) return;
                      e.stopPropagation();
                      handleClick(element.id);
                    }
                  : undefined
              }
            />
          )}
        </g>
      );
    }

    // Context fill shapes render like background borders — non-interactive, muted
    if (effectiveState === 'context') {
      return (
        <path
          key={`shape-${element.id}`}
          d={element.svgPathData}
          fillRule="evenodd"
          className={styles.borderPath}
        />
      );
    }

    return (
      <path
        key={`shape-${element.id}`}
        d={element.svgPathData}
        fillRule="evenodd"
        style={{
          fill: color,
          fillOpacity: stateFillOpacity(state),
          stroke: color,
          strokeWidth: 0.075,
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
}

type LabelPosition = NonNullable<VisualizationElement['labelPosition']>;

/** Compute SVG text positioning props for a label at a given position relative to an anchor point. */
function computeLabelProps(
  anchor: ViewBoxPosition,
  position: LabelPosition | undefined,
  offset: number,
): { x: number; y: number; textAnchor: 'start' | 'middle' | 'end'; dominantBaseline: 'central' | 'auto' | 'hanging' } {
  const pos = position ?? 'right';
  const isLeft = pos === 'left' || pos === 'above-left' || pos === 'below-left';
  const isRight = pos === 'right' || pos === 'above-right' || pos === 'below-right';
  const isAbove = pos === 'above' || pos === 'above-left' || pos === 'above-right';
  const isBelow = pos === 'below' || pos === 'below-left' || pos === 'below-right';

  const x = anchor.x + (isRight ? offset : isLeft ? -offset : 0);
  const y = anchor.y + (isBelow ? offset : isAbove ? -offset : 0);

  const textAnchor = isLeft ? 'end' as const
    : isRight ? 'start' as const
    : 'middle' as const;

  const dominantBaseline = isAbove ? 'auto' as const
    : isBelow ? 'hanging' as const
    : 'central' as const;

  return { x, y, textAnchor, dominantBaseline };
}

/** Threshold in screen pixels above which a pointerdown→click sequence is treated as a drag. */
const DRAG_THRESHOLD_PX = 5;

/**
 * Tracks whether the last pointer gesture was a drag (pan) rather than a tap/click.
 * Returns an `onPointerDown` handler to attach to the SVG and an `isDrag` predicate
 * to call inside onClick handlers to suppress false-positive clicks after panning.
 */
function useDragDetector() {
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

  return { onPointerDown, isDrag };
}

interface MapContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly showBorders: boolean;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles: VisualizationRendererProps['elementToggles'];
  readonly backgroundPaths: VisualizationRendererProps['backgroundPaths'];
  readonly lakePaths: VisualizationRendererProps['lakePaths'];
  readonly backgroundLabels: VisualizationRendererProps['backgroundLabels'];
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
}

function MapContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  uniqueGroups,
  showBorders,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  elementStateColorOverrides,
}: MapContentProps) {
  const { clusteredElementIds, scale, basePixelsPerViewBoxUnit } = useZoomPan();
  const { onPointerDown, isDrag } = useDragDetector();

  const showRegionColors = toggles['showRegionColors'] === true;
  const dotRadius = DOT_SCREEN_RADIUS / (scale * basePixelsPerViewBoxUnit);

  // Map from element label → element state, used by MapCountryLabels for state-aware colours.
  const elementNameToState = useMemo(() => {
    const map: Record<string, ElementVisualState | undefined> = {};
    for (const el of elements) {
      if (isMapElement(el) && el.svgPathData && el.pathRenderStyle !== 'stroke') {
        map[el.label] = elementStates[el.id];
      }
    }
    return map;
  }, [elements, elementStates]);

  // Map from element label → element id, used by MapCountryLabels for hover.
  const nameToElementId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const el of elements) {
      if (isMapElement(el) && el.svgPathData && el.pathRenderStyle !== 'stroke') {
        map[el.label] = el.id;
      }
    }
    return map;
  }, [elements]);

  // Build BackgroundLabel objects from polygon quiz elements so they pass through the
  // full label placement system (polylabel positioning, area-based sizing, collision detection).
  const elementPolygonLabels = useMemo(
    () => computeElementLabels(elements),
    [elements],
  );

  // Merge background labels (excluding polygon element names to avoid duplicates) with
  // element-derived labels for a single unified placement pass.
  const allLabels = useMemo((): ReadonlyArray<BackgroundLabel> => {
    const polygonElementNames = new Set(elementPolygonLabels.map((l) => l.name));
    const filteredBg = (backgroundLabels ?? []).filter((l) => !polygonElementNames.has(l.name));
    return [...filteredBg, ...elementPolygonLabels];
  }, [backgroundLabels, elementPolygonLabels]);

  const visibleDotPositions = useMemo(
    () => elements
      .filter((el) => {
        if (!elementToggle(elementToggles, toggles, el.id, 'showCityDots')) return false;
        const state = elementStates[el.id];
        return state !== 'hidden';
      })
      .map((el) => el.viewBoxCenter),
    [elements, elementToggles, toggles, elementStates],
  );

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!onPositionClick) return;
      if (isDrag(event)) return;
      const svg = (event.currentTarget as SVGElement).ownerSVGElement;
      if (!svg) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());
      onPositionClick({ x: svgPoint.x, y: svgPoint.y });
    },
    [onPositionClick, isDrag],
  );

  return (
    <g onPointerDown={onPointerDown} onClick={handleBackgroundClick}>
      {/* Invisible rect to catch clicks on empty SVG space.
          Without this, clicks on areas with no visible children
          don't trigger the <g>'s onClick handler. */}
      {onPositionClick && (
        <rect
          x={-1e4} y={-1e4} width={2e4} height={2e4}
          fill="transparent"
        />
      )}

      {/* Ocean background tint (clamped to ±90° latitude) */}
      {toggles['showLakes'] !== false && (
        <rect
          x={-1e4} y={-90} width={2e4} height={180}
          className={styles.oceanBackground}
        />
      )}

      {/* Background country borders */}
      {showBorders && backgroundPaths?.map((path) => (
        <path
          key={path.id}
          d={path.svgPathData}
          fillRule="evenodd"
          className={styles.borderPath}
        />
      ))}

      {/* Lake polygons */}
      {toggles['showLakes'] !== false && lakePaths?.map((lake) => (
        <path
          key={lake.id}
          d={lake.svgPathData}
          className={styles.lakePath}
        />
      ))}

      {/* Map element shapes (for country quizzes where elements have svgPathData).
          Rendered in layers: default first, then incorrect, correct, highlighted on top
          so state-colored shapes aren't obscured by neighbouring borders. */}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, undefined, RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'default', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'incorrect', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'missed', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'context', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'correct', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'highlighted', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH, showRegionColors, isDrag, elementStateColorOverrides, onElementHoverStart, onElementHoverEnd)}

      {/* Country/region name labels and flags — background context labels merged with polygon
          quiz element labels, run through unified placement (polylabel, collision detection). */}
      {allLabels.length > 0 && (
        <MapCountryLabels
          labels={allLabels}
          showNames={toggles['showCountryNames'] ?? false}
          showFlags={toggles['showMapFlags'] ?? false}
          avoidPoints={visibleDotPositions}
          elementNameToState={elementNameToState}
          nameToElementId={nameToElementId}
          onElementHoverStart={onElementHoverStart}
          onElementHoverEnd={onElementHoverEnd}
        />
      )}

      {/* River name labels (for stroke-style path elements like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!isMapElement(element) || element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (!shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showRiverNames'))) return null;
        const color = (state !== undefined && state !== 'hidden')
          ? (elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main)
          : 'var(--color-text-primary)';
        const anchor = element.labelAnchor ?? element.viewBoxCenter;
        const pos = element.labelPosition;
        const labelOffset = 0.8; // viewBox units
        const labelProps = computeLabelProps(anchor, pos, labelOffset);
        return (
          <text
            key={`river-label-${element.id}`}
            {...labelProps}
            className={onElementHoverStart ? styles.riverLabelHoverable : styles.riverLabel}
            style={{
              fill: color,
              strokeOpacity: 0.75,
              paintOrder: 'stroke',
              stroke: 'var(--color-label-halo)',
              strokeWidth: 0.5,
              strokeLinejoin: 'round',
            }}
            onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverEnd}
          >
            {element.label}
          </text>
        );
      })}

      {/* Flag images near city dots (capitals quizzes — not for stroke-style paths like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
        if (!isMapElement(element) || !element.code) return null;
        if (element.pathRenderStyle === 'stroke') return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const flagHeight = dotRadius * 4;
        const flagWidth = flagHeight * 4 / 3;
        return (
          <image
            key={`flag-${element.id}`}
            href={assetPath(`/flags/${element.code}.svg`)}
            x={element.viewBoxCenter.x + dotRadius + 0.15}
            y={element.viewBoxCenter.y - flagHeight / 2}
            width={flagWidth}
            height={flagHeight}
            className={styles.flagImage}
          />
        );
      })}

      {/* City dot markers (rendered last = on top of flags — not for stroke-style paths like rivers or large fill polygons) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        // Skip dots for fill-style polygon elements unless the polygon is tiny
        if (isMapElement(element) && element.svgPathData && element.pathRenderStyle !== 'stroke') {
          const { minX, minY, maxX, maxY } = element.viewBoxBounds;
          const dx = maxX - minX;
          const dy = maxY - minY;
          if (dx > 1.5 || dy > 1.5) return null;
        }
        if (!elementToggle(elementToggles, toggles, element.id, 'showCityDots')) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const color = state !== undefined ? STATUS_COLORS[state].main : 'var(--color-city-dot)';
        return (
          <circle
            key={`dot-${element.id}`}
            cx={element.viewBoxCenter.x}
            cy={element.viewBoxCenter.y}
            r={dotRadius}
            fill={color}
            stroke={'var(--color-bg-primary)'}
            strokeWidth={dotRadius * 0.27}
            className={onElementClick ? styles.interactiveDot : onElementHoverStart ? styles.hoverableDot : undefined}
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
      })}

      {/* City name labels (rendered on top of dots — not for stroke-style paths like rivers or fill shapes like countries) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        // Shape elements (countries/states) use the "Region polygon labels" section above
        if (isMapElement(element) && element.svgPathData && element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (!shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showCityNames'))) return null;
        const offset = dotRadius * 1.5;
        const fontSize = dotRadius * 2;
        const labelProps = computeLabelProps(element.viewBoxCenter, element.labelPosition, offset);
        return (
          <text
            key={`city-label-${element.id}`}
            {...labelProps}
            className={onElementHoverStart ? styles.cityLabelHoverable : styles.cityLabel}
            style={{ fontSize: `${fontSize}px` }}
            onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverEnd}
          >
            {element.label}
          </text>
        );
      })}
    </g>
  );
}
