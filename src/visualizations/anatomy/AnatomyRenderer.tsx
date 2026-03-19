import { useCallback } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { ElementVisualState } from '../VisualizationElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
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
    case 'revealed':
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
      return 0.6;
    case 'default':
    case 'revealed':
      return 0.7;
    default:
      return 0.55;
  }
}

/** Render bone shape elements filtered to a specific state (or undefined for default/no-state). */
function renderBoneElements(
  elements: VisualizationRendererProps['elements'],
  elementStates: VisualizationRendererProps['elementStates'],
  uniqueGroups: ReadonlyArray<string>,
  onElementClick: ((elementId: string) => void) | undefined,
  targetState: ElementVisualState | undefined,
) {
  return elements.map((element) => {
    if (!isAnatomyElement(element) || !element.svgPathData) return null;
    const state = elementStates[element.id];
    if (state === 'hidden') return null;
    if (targetState === undefined) {
      if (stateColor(state) !== undefined) return null;
    } else {
      if (state !== targetState) return null;
    }
    const color = stateColor(state) ?? groupColor(element.group, uniqueGroups);
    return (
      <path
        key={`bone-${element.id}`}
        d={element.svgPathData}
        style={{
          fill: color,
          fillOpacity: stateFillOpacity(state),
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
      />
    );
  });
}

export function AnatomyRenderer({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  targetElementId,
  toggles,
  svgOverlay,
  initialViewBox,
}: VisualizationRendererProps) {
  const uniqueGroups = Array.from(
    new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined)),
  );

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      initialViewBox={initialViewBox}
    >
      <AnatomyContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        targetElementId={targetElementId}
        uniqueGroups={uniqueGroups}
        toggles={toggles}
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
  readonly targetElementId?: string;
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly toggles: Readonly<Record<string, boolean>>;
}

function AnatomyContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  targetElementId,
  uniqueGroups,
  toggles,
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

  const showLabels = toggles['showLabels'] ?? false;
  const labelSize = 5 / (scale * basePixelsPerViewBoxUnit) * 10;

  return (
    <g onClick={handleBackgroundClick}>
      {onPositionClick && (
        <rect
          x={-1e4} y={-1e4} width={2e4} height={2e4}
          fill="transparent"
        />
      )}

      {/* Bone shapes: layered by state for proper z-ordering */}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, undefined)}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'incorrect')}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'revealed')}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'correct')}
      {renderBoneElements(elements, elementStates, uniqueGroups, onElementClick, 'highlighted')}

      {/* Bone name labels */}
      {showLabels && elements.map((element) => {
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        return (
          <text
            key={`label-${element.id}`}
            x={element.viewBoxCenter.x}
            y={element.viewBoxCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: `${labelSize}px`,
              fill: 'var(--color-text-primary)',
              paintOrder: 'stroke',
              stroke: 'var(--color-bg-primary)',
              strokeWidth: labelSize * 0.3,
              pointerEvents: 'none',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            {element.label}
          </text>
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
