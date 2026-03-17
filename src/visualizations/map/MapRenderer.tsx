import { useCallback } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { isMapElement } from './MapElement';
import styles from './MapRenderer.module.css';

const CITY_DOT_RADIUS = 0.3;
const LABEL_OFFSET_Y = -0.6;
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
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'highlighted':
      return 'var(--color-highlight)';
    default:
      return undefined;
  }
}

function stateFillOpacity(state: ElementVisualState | undefined): number {
  switch (state) {
    case 'hidden':
      return 0;
    case 'correct':
    case 'incorrect':
    case 'highlighted':
      return 0.3;
    case 'revealed':
      return 0.15;
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
  backgroundPaths,
  svgOverlay,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );
  const showBorders = toggles['showBorders'] !== false;
  const showCityDots = toggles['showCityDots'] !== false;
  const showCountryNames = toggles['showCountryNames'] === true;

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      clustering={clustering}
      onClusterClick={onClusterClick}
    >
      <MapContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        targetElementId={targetElementId}
        uniqueGroups={uniqueGroups}
        showBorders={showBorders}
        showCityDots={showCityDots}
        showCountryNames={showCountryNames}
        backgroundPaths={backgroundPaths}
      />
      {svgOverlay}
    </ZoomPanContainer>
  );
}

interface MapContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly targetElementId?: string;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly showBorders: boolean;
  readonly showCityDots: boolean;
  readonly showCountryNames: boolean;
  readonly backgroundPaths: VisualizationRendererProps['backgroundPaths'];
}

function MapContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  targetElementId,
  uniqueGroups,
  showBorders,
  showCityDots,
  showCountryNames,
  backgroundPaths,
}: MapContentProps) {
  const { clusteredElementIds } = useZoomPan();

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
      {/* Background country borders */}
      {showBorders && backgroundPaths?.map((path) => (
        <path
          key={path.id}
          d={path.svgPathData}
          className={styles.borderPath}
        />
      ))}

      {/* Map element shapes (for country quizzes where elements have svgPathData).
          Always rendered — these are interactive quiz items, not decorative borders. */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!isMapElement(element) || !element.svgPathData) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const color = stateColor(state) ?? groupColor(element.group, uniqueGroups);
        return (
          <path
            key={`shape-${element.id}`}
            d={element.svgPathData}
            fill={color}
            fillOpacity={stateFillOpacity(state)}
            stroke={color}
            strokeWidth={0.15}
            className={element.interactive ? styles.interactivePath : styles.borderPath}
            onClick={
              element.interactive && onElementClick
                ? (e) => {
                    e.stopPropagation();
                    onElementClick(element.id);
                  }
                : undefined
            }
          />
        );
      })}

      {/* City dot markers */}
      {showCityDots && elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const isTarget = element.id === targetElementId;
        const color = stateColor(state) ?? groupColor(element.group, uniqueGroups);
        return (
          <circle
            key={`dot-${element.id}`}
            cx={element.viewBoxCenter.x}
            cy={element.viewBoxCenter.y}
            r={CITY_DOT_RADIUS}
            fill={color}
            stroke={isTarget ? 'var(--color-highlight)' : 'var(--color-bg-primary)'}
            strokeWidth={isTarget ? 0.15 : 0.08}
            className={element.interactive ? styles.interactiveDot : undefined}
            onClick={
              element.interactive && onElementClick
                ? (e) => {
                    e.stopPropagation();
                    onElementClick(element.id);
                  }
                : undefined
            }
          />
        );
      })}

      {/* Labels */}
      {showCountryNames && elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        return (
          <text
            key={`label-${element.id}`}
            x={element.viewBoxCenter.x}
            y={element.viewBoxCenter.y + LABEL_OFFSET_Y}
            className={styles.label}
            textAnchor="middle"
          >
            {element.label}
          </text>
        );
      })}
    </g>
  );
}
