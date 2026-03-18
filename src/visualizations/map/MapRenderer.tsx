import { useCallback } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { isMapElement } from './MapElement';
import styles from './MapRenderer.module.css';

const CITY_DOT_RADIUS = 0.3;
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
    case 'incorrect':
    case 'missed':
    case 'highlighted':
      return 0.3;
    case 'default':
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
  elementToggles,
  backgroundPaths,
  backgroundLabels,
  svgOverlay,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );
  const showBorders = toggles['showBorders'] !== false;

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
        toggles={toggles}
        elementToggles={elementToggles}
        backgroundPaths={backgroundPaths}
        backgroundLabels={backgroundLabels}
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
      })}

      {/* Country name labels (from background border data) */}
      {toggles['showCountryNames'] && backgroundLabels?.map((label) => (
        <text
          key={`bg-label-${label.id}`}
          x={label.center.x}
          y={label.center.y}
          className={styles.backgroundLabel}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {label.name}
        </text>
      ))}

      {/* Flag images at country centroids (country quizzes, from background data) */}
      {toggles['showMapFlags'] && backgroundLabels?.map((label) => {
        if (!label.code) return null;
        const flagHeight = 1.5;
        const flagWidth = flagHeight * 4 / 3;
        return (
          <image
            key={`bg-flag-${label.id}`}
            href={`/flags/${label.code}.svg`}
            x={label.center.x - flagWidth / 2}
            y={label.center.y + 0.3}
            width={flagWidth}
            height={flagHeight}
            className={styles.flagImage}
          />
        );
      })}

      {/* Flag images near city dots (capitals quizzes) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
        if (!isMapElement(element) || !element.code) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const flagHeight = 1.2;
        const flagWidth = flagHeight * 4 / 3;
        return (
          <image
            key={`flag-${element.id}`}
            href={`/flags/${element.code}.svg`}
            x={element.viewBoxCenter.x + CITY_DOT_RADIUS + 0.15}
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
            r={CITY_DOT_RADIUS}
            fill={color}
            stroke={isTarget ? 'var(--color-highlight)' : 'var(--color-bg-primary)'}
            strokeWidth={isTarget ? 0.15 : 0.08}
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
