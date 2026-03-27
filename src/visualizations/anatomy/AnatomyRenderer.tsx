import { useCallback } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { shouldShowLabel } from '../shouldShowLabel';
import { isAnatomyElement } from './AnatomyElement';
import styles from './AnatomyRenderer.module.css';

const GROUP_COLORS: ReadonlyArray<string> = [
  'var(--color-group-1)',
  'var(--color-group-2)',
  'var(--color-group-3)',
  'var(--color-group-4)',
  'var(--color-group-5)',
  'var(--color-group-6)',
  'var(--color-group-7)',
  'var(--color-group-8)',
];

/** Distinct hues for per-element coloring (used when showGroupColors is on). */
const ELEMENT_COLORS: ReadonlyArray<string> = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#9A6324', '#800000', '#aaffc3', '#808000', '#ffd8b1',
  '#000075', '#a9a9a9', '#dcbeff', '#469990', '#e6beff',
  '#ff6961', '#77dd77', '#fdfd96', '#84b6f4', '#fdcae1',
  '#c23b22', '#03c03c', '#b19cd9', '#ffb347', '#ff6961',
];

function groupColor(group: string | undefined, groups: ReadonlyArray<string>): string {
  if (!group) return GROUP_COLORS[0];
  const index = groups.indexOf(group);
  return GROUP_COLORS[index >= 0 ? index % GROUP_COLORS.length : 0];
}

function elementColor(elementIndex: number): string {
  return ELEMENT_COLORS[elementIndex % ELEMENT_COLORS.length];
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
      return 0.6;
    case 'default':
      return 0.55;
    default:
      return 0.5;
  }
}

/** Render bone shape elements filtered to a specific state (or undefined for default/no-state). */
function renderBoneElements(
  elements: VisualizationRendererProps['elements'],
  elementStates: VisualizationRendererProps['elementStates'],
  uniqueGroups: ReadonlyArray<string>,
  onElementClick: ((elementId: string) => void) | undefined,
  targetState: ElementVisualState | undefined,
  showGroupColors: boolean,
  onElementHoverStart?: (elementId: string) => void,
  onElementHoverEnd?: () => void,
) {
  return elements.map((element) => {
    if (!isAnatomyElement(element) || !element.svgPathData) return null;
    const state = elementStates[element.id];
    if (state === 'hidden') return null;
    if (targetState === undefined) {
      if (state !== undefined) return null;
    } else {
      if (state !== targetState) return null;
    }
    const usePerElementColor = showGroupColors && state === 'default';
    const elementIndex = elements.indexOf(element);
    const color = usePerElementColor
      ? elementColor(elementIndex)
      : (state !== undefined ? STATUS_COLORS[state].main : groupColor(element.group, uniqueGroups));
    const opacity = usePerElementColor ? 0.75 : stateFillOpacity(state);
    return (
      <path
        key={`bone-${element.id}`}
        d={element.svgPathData}
        style={{
          fill: color,
          fillOpacity: opacity,
          stroke: color,
          strokeWidth: 0.8,
          strokeOpacity: 0.8,
        }}
        className={onElementClick ? styles.interactivePath : styles.bonePath}
        onClick={
          onElementClick
            ? (e) => {
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

export function AnatomyRenderer({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  targetElementId,
  toggles,
  elementToggles,
  svgOverlay,
  initialCameraPosition,
  putInView,
  autoRevealElementIds,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      initialCameraPosition={initialCameraPosition}
      putInView={putInView}
      autoRevealElementIds={autoRevealElementIds}
    >
      <AnatomyContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        onElementHoverStart={onElementHoverStart}
        onElementHoverEnd={onElementHoverEnd}
        targetElementId={targetElementId}
        uniqueGroups={uniqueGroups}
        toggles={toggles}
        elementToggles={elementToggles}
      />
      {svgOverlay}
    </ZoomPanContainer>
  );
}

interface AnatomyContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly targetElementId?: string;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles: VisualizationRendererProps['elementToggles'];
}

function AnatomyContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  targetElementId,
  uniqueGroups,
  toggles,
  elementToggles,
}: AnatomyContentProps) {
  const { scale, basePixelsPerViewBoxUnit } = useZoomPan();

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

  const showGroupColors = toggles['showGroupColors'] ?? false;
  const labelSize = 5 / (scale * basePixelsPerViewBoxUnit) * 6;

  return (
    <g onClick={handleBackgroundClick}>
      {onPositionClick && (
        <rect
          x={-1e4} y={-1e4} width={2e4} height={2e4}
          fill="transparent"
        />
      )}

      {/* Bone shapes: layered by state for proper z-ordering */}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, undefined, showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'default', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'missed', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'incorrect', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'correct', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'correct-second', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'correct-third', showGroupColors, onElementHoverStart, onElementHoverEnd)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'highlighted', showGroupColors, onElementHoverStart, onElementHoverEnd)}

      {/* Bone name labels with leader lines */}
      {elements.map((element) => {
        const state = elementStates[element.id];
        if (!shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showLabels'))) return null;
        if (!isAnatomyElement(element)) return null;
        const lp = element.labelPosition;
        if (!lp) return null;
        const isLeft = lp.labelX < lp.anchorX;
        const leaderLabelSize = labelSize * 0.4;
        const dotRadius = leaderLabelSize * 0.18;
        const lineWidth = leaderLabelSize * 0.06;
        return (
          <g key={`label-${element.id}`} style={{ pointerEvents: 'none' }}>
            {/* Leader line */}
            <line
              x1={lp.anchorX}
              y1={lp.anchorY}
              x2={lp.labelX}
              y2={lp.labelY}
              style={{
                stroke: 'var(--color-text-secondary)',
                strokeWidth: lineWidth,
                strokeOpacity: 0.7,
              }}
            />
            {/* Dot on bone */}
            <circle
              cx={lp.anchorX}
              cy={lp.anchorY}
              r={dotRadius}
              style={{ fill: 'var(--color-text-secondary)' }}
            />
            {/* Dot at label end */}
            <circle
              cx={lp.labelX}
              cy={lp.labelY}
              r={dotRadius}
              style={{ fill: 'var(--color-text-secondary)' }}
            />
            {/* Label text */}
            <text
              x={lp.labelX + (isLeft ? -leaderLabelSize * 0.2 : leaderLabelSize * 0.2)}
              y={lp.labelY}
              textAnchor={isLeft ? 'end' : 'start'}
              dominantBaseline="central"
              style={{
                fontSize: `${leaderLabelSize}px`,
                fill: 'var(--color-text-primary)',
                paintOrder: 'stroke',
                stroke: 'var(--color-bg-primary)',
                strokeWidth: leaderLabelSize * 0.2,
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              {element.label}
            </text>
          </g>
        );
      })}

      {/* Highlight ring on target element */}
      {targetElementId && elements.map((element) => {
        if (element.id !== targetElementId) return null;
        if (!isAnatomyElement(element) || !element.svgPathData) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        return (
          <path
            key={`target-${element.id}`}
            d={element.svgPathData}
            style={{
              fill: 'none',
              stroke: 'var(--color-highlight)',
              strokeWidth: 1.5,
              pointerEvents: 'none',
            }}
          />
        );
      })}
    </g>
  );
}
