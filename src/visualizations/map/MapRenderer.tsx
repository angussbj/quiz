import { useCallback, useMemo } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationRendererProps, ClusteringConfig } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { isMapElement } from './MapElement';
import { MapCountryLabels } from './MapCountryLabels';
import styles from './MapRenderer.module.css';

/** Default clustering for map quizzes: cluster overlapping city dots. */
const DEFAULT_MAP_CLUSTERING: ClusteringConfig = {
  minScreenPixelDistance: 30,
  disableAboveScale: 6,
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
    case 'revealed':
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
  targetElementId,
  toggles,
  elementToggles,
  backgroundPaths,
  backgroundLabels,
  svgOverlay,
  initialViewBox,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );
  const showBorders = toggles['showBorders'] !== false;
  const effectiveClustering = clustering ?? DEFAULT_MAP_CLUSTERING;

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      clustering={effectiveClustering}
      onClusterClick={onClusterClick}
      initialViewBox={initialViewBox}
      backgroundPaths={backgroundPaths}
    >
      <MapContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        targetElementId={targetElementId}
        uniqueGroups={uniqueGroups}
        showBorders={showBorders}
        toggles={toggles}
        elementToggles={elementToggles}
        backgroundPaths={backgroundPaths}
        backgroundLabels={backgroundLabels}
      />
      {svgOverlay}
    </ZoomPanContainer>
  );
}

/** Render shape elements filtered to a specific state (or undefined for default/no-state). */
function renderShapeElements(
  elements: VisualizationRendererProps['elements'],
  elementStates: VisualizationRendererProps['elementStates'],
  uniqueGroups: ReadonlyArray<string>,
  clusteredElementIds: ReadonlySet<string>,
  onElementClick: ((elementId: string) => void) | undefined,
  targetState: ElementVisualState | undefined,
) {
  return elements.map((element) => {
    if (clusteredElementIds.has(element.id)) return null;
    if (!isMapElement(element) || !element.svgPathData) return null;
    const state = elementStates[element.id];
    if (state === 'hidden') return null;
    if (targetState === undefined) {
      // Default layer: only elements with no state color
      if (stateColor(state) !== undefined) return null;
    } else {
      if (state !== targetState) return null;
    }
    const color = stateColor(state) ?? groupColor(element.group, uniqueGroups);
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

interface MapContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly targetElementId?: string;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly showBorders: boolean;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles: VisualizationRendererProps['elementToggles'];
  readonly backgroundPaths: VisualizationRendererProps['backgroundPaths'];
  readonly backgroundLabels: VisualizationRendererProps['backgroundLabels'];
}

function MapContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  targetElementId,
  uniqueGroups,
  showBorders,
  toggles,
  elementToggles,
  backgroundPaths,
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

      {/* Background country borders */}
      {showBorders && backgroundPaths?.map((path) => (
        <path
          key={path.id}
          d={path.svgPathData}
          className={styles.borderPath}
        />
      ))}

      {/* Map element shapes (for country quizzes where elements have svgPathData).
          Rendered in layers: default first, then incorrect, correct, highlighted on top
          so state-colored shapes aren't obscured by neighbouring borders. */}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, undefined)}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'incorrect')}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'revealed')}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'correct')}
      {renderShapeElements(elements, elementStates, uniqueGroups, clusteredElementIds, onElementClick, 'highlighted')}

      {/* Country name labels and flags (from background border data, unified overlap detection) */}
      {(toggles['showCountryNames'] || toggles['showMapFlags']) && backgroundLabels && (
        <MapCountryLabels
          labels={backgroundLabels}
          showNames={toggles['showCountryNames'] ?? false}
          showFlags={toggles['showMapFlags'] ?? false}
          avoidPoints={visibleDotPositions}
        />
      )}

      {/* Flag images near city dots (capitals quizzes) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
        if (!isMapElement(element) || !element.code) return null;
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

      {/* City dot markers (rendered last = on top of flags) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showCityDots')) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const isTarget = element.id === targetElementId;
        const isCorrectPulse = isTarget && state === 'correct';
        const color = stateColor(state) ?? 'var(--color-city-dot)';
        const dotClassName = [
          onElementClick ? styles.interactiveDot : '',
          isCorrectPulse ? styles.correctPulse : '',
        ].filter(Boolean).join(' ') || undefined;
        return (
          <circle
            key={`dot-${element.id}`}
            cx={element.viewBoxCenter.x}
            cy={element.viewBoxCenter.y}
            r={dotRadius}
            fill={color}
            stroke={isTarget ? 'var(--color-highlight)' : 'var(--color-bg-primary)'}
            strokeWidth={isTarget ? dotRadius * 0.5 : dotRadius * 0.27}
            className={dotClassName}
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
    </g>
  );
}
