import { useCallback, useMemo } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationRendererProps, ClusteringConfig } from '../VisualizationRendererProps';
import type { ElementVisualState, ViewBoxPosition, VisualizationElement } from '../VisualizationElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { isMapElement } from './MapElement';
import { MapCountryLabels } from './MapCountryLabels';
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

function stateColor(state: ElementVisualState | undefined): string | undefined {
  switch (state) {
    case 'correct':
      return 'var(--color-correct)';
    case 'correct-second':
      return 'var(--color-correct-second)';
    case 'correct-third':
      return 'var(--color-correct-third)';
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'missed':
      return 'var(--color-missed)';
    case 'highlighted':
      return 'var(--color-highlight)';
    case 'default':
      return 'var(--color-text-muted)';
    default:
      return undefined;
  }
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
  clustering,
  onClusterClick,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  svgOverlay,
  initialCameraPosition,
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
    >
      <MapContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        uniqueGroups={uniqueGroups}
        showBorders={showBorders}
        toggles={toggles}
        elementToggles={elementToggles}
        backgroundPaths={backgroundPaths}
        lakePaths={lakePaths}
        backgroundLabels={backgroundLabels}
      />
      {svgOverlay}
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
) {
  return elements.map((element) => {
    if (!isMapElement(element) || !element.svgPathData) return null;
    // Stroke elements (rivers) are hidden when clustered; fill shapes (countries) render regardless
    if (clusteredElementIds.has(element.id) && element.pathRenderStyle === 'stroke') return null;
    const state = elementStates[element.id];
    if (state === 'hidden') return null;
    if (targetState === undefined) {
      // Default layer: only elements with no state color
      if (stateColor(state) !== undefined) return null;
    } else {
      if (state !== targetState) return null;
    }
    const color = stateColor(state) ?? groupColor(element.group, uniqueGroups);
    const isStrokePath = element.pathRenderStyle === 'stroke';

    if (isStrokePath) {
      // Split combined path into subpaths. Z-closed subpaths (lake polygons)
      // render as fills; open subpaths (river lines) render as strokes.
      const subpaths = splitSubpaths(element.svgPathData);
      const strokePaths = subpaths.filter((p) => !p.endsWith('Z'));
      const fillPaths = subpaths.filter((p) => p.endsWith('Z'));
      const strokeD = strokePaths.join(' ');
      const fillD = fillPaths.join(' ');

      return (
        <g key={`shape-${element.id}`}>
          {/* Invisible wider hit area for clicking (strokes only) */}
          {onElementClick && strokeD && (
            <path
              d={strokeD}
              style={{
                fill: 'none',
                stroke: 'transparent',
                strokeWidth: riverHitStrokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
              className={styles.interactivePath}
              onClick={(e) => {
                e.stopPropagation();
                onElementClick(element.id);
              }}
            />
          )}
          {/* Filled lake polygons */}
          {fillD && (
            <path
              d={fillD}
              style={{
                fill: color,
                fillOpacity: strokeOpacity(state) * 0.4,
                stroke: color,
                strokeWidth: riverStrokeWidth * 0.7,
                strokeOpacity: strokeOpacity(state),
              }}
              pointerEvents={onElementClick ? 'none' : undefined}
              className={onElementClick ? styles.interactivePath : undefined}
              onClick={
                onElementClick
                  ? (e) => {
                      e.stopPropagation();
                      onElementClick(element.id);
                    }
                  : undefined
              }
            />
          )}
          {/* Visible river strokes */}
          {strokeD && (
            <path
              d={strokeD}
              style={{
                fill: 'none',
                stroke: color,
                strokeWidth: riverStrokeWidth,
                strokeOpacity: strokeOpacity(state),
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
              pointerEvents={onElementClick ? 'none' : undefined}
              className={onElementClick ? styles.interactivePath : undefined}
              onClick={
                onElementClick
                  ? (e) => {
                      e.stopPropagation();
                      onElementClick(element.id);
                    }
                  : undefined
              }
            />
          )}
        </g>
      );
    }

    return (
      <path
        key={`shape-${element.id}`}
        d={element.svgPathData}
        style={{
          fill: color,
          fillOpacity: stateFillOpacity(state),
          stroke: color,
          strokeWidth: 0.15,
        }}
        className={onElementClick ? styles.interactivePath : styles.borderPath}
        onClick={
          onElementClick
            ? (e) => {
                e.stopPropagation();
                onElementClick(element.id);
              }
            : undefined
        }
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

interface MapContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly showBorders: boolean;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles: VisualizationRendererProps['elementToggles'];
  readonly backgroundPaths: VisualizationRendererProps['backgroundPaths'];
  readonly lakePaths: VisualizationRendererProps['lakePaths'];
  readonly backgroundLabels: VisualizationRendererProps['backgroundLabels'];
}

function MapContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  uniqueGroups,
  showBorders,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
}: MapContentProps) {
  const { clusteredElementIds, scale, basePixelsPerViewBoxUnit } = useZoomPan();

  const dotRadius = DOT_SCREEN_RADIUS / (scale * basePixelsPerViewBoxUnit);

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
    [onPositionClick],
  );

  return (
    <g onClick={handleBackgroundClick}>
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
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, undefined, RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'default', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'incorrect', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'missed', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'context', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'correct', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'highlighted', RIVER_STROKE_WIDTH, RIVER_HIT_STROKE_WIDTH)}

      {/* Country name labels and flags (from background border data, unified overlap detection) */}
      {(toggles['showCountryNames'] || toggles['showMapFlags']) && backgroundLabels && (
        <MapCountryLabels
          labels={backgroundLabels}
          showNames={toggles['showCountryNames'] ?? false}
          showFlags={toggles['showMapFlags'] ?? false}
          avoidPoints={visibleDotPositions}
        />
      )}

      {/* River name labels (for stroke-style path elements like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!isMapElement(element) || element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showRiverNames')) return null;
        const color = stateColor(state) ?? 'var(--color-text-primary)';
        const anchor = element.labelAnchor ?? element.viewBoxCenter;
        const pos = element.labelPosition;
        const labelOffset = 0.8; // viewBox units
        const labelProps = computeLabelProps(anchor, pos, labelOffset);
        return (
          <text
            key={`river-label-${element.id}`}
            {...labelProps}
            className={styles.riverLabel}
            style={{ fill: color }}
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

      {/* City dot markers (rendered last = on top of flags — not for stroke-style paths like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showCityDots')) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const color = stateColor(state) ?? 'var(--color-city-dot)';
        return (
          <circle
            key={`dot-${element.id}`}
            cx={element.viewBoxCenter.x}
            cy={element.viewBoxCenter.y}
            r={dotRadius}
            fill={color}
            stroke={'var(--color-bg-primary)'}
            strokeWidth={dotRadius * 0.27}
            className={onElementClick ? styles.interactiveDot : undefined}
            onClick={
              onElementClick
                ? (e) => {
                    e.stopPropagation();
                    onElementClick(element.id);
                  }
                : undefined
            }
          />
        );
      })}

      {/* City name labels (rendered on top of dots — not for stroke-style paths like rivers or fill shapes like countries) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        // Shape elements (countries) use MapCountryLabels, not element labels
        if (isMapElement(element) && element.svgPathData && element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showCityNames')) return null;
        const offset = dotRadius * 1.5;
        const fontSize = dotRadius * 2;
        const labelProps = computeLabelProps(element.viewBoxCenter, element.labelPosition, offset);
        return (
          <text
            key={`city-label-${element.id}`}
            {...labelProps}
            className={styles.cityLabel}
            style={{ fontSize: `${fontSize}px` }}
          >
            {element.label}
          </text>
        );
      })}
    </g>
  );
}
