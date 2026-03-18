import { useMemo } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { FlagGridElement } from './FlagGridElement';
import { isFlagGridElement } from './FlagGridElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import type { ElementVisualState } from '../VisualizationElement';
import { flagGridElementToVisualizationElement } from './flagGridElementToVisualizationElement';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y } from './flagGridLayout';

const FLAG_IMAGE_PADDING = 6;
const FLAG_IMAGE_WIDTH = FLAG_CELL_WIDTH - FLAG_IMAGE_PADDING * 2;
const FLAG_IMAGE_HEIGHT = FLAG_CELL_HEIGHT - 22;

interface FlagCellProps {
  readonly element: FlagGridElement;
  readonly state: ElementVisualState;
  readonly showCountryName: boolean;
  readonly isTarget: boolean;
  readonly onClick?: (elementId: string) => void;
}

function stateToStroke(state: ElementVisualState): string {
  switch (state) {
    case 'correct':
      return 'var(--color-correct)';
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'missed':
      return 'var(--color-missed)';
    case 'highlighted':
      return 'var(--color-highlight)';
    default:
      return 'var(--color-border)';
  }
}

function stateToFill(state: ElementVisualState): string {
  switch (state) {
    case 'correct':
      return 'var(--color-correct-bg)';
    case 'incorrect':
      return 'var(--color-incorrect-bg)';
    case 'missed':
      return 'var(--color-missed-bg)';
    case 'highlighted':
      return 'var(--color-highlight-bg)';
    default:
      return 'var(--color-surface-raised)';
  }
}

function isAnswered(state: ElementVisualState): boolean {
  return state === 'revealed' || state === 'correct' || state === 'missed';
}

function FlagCell({
  element,
  state,
  showCountryName,
  isTarget,
  onClick,
}: FlagCellProps) {
  const x = element.column * FLAG_CELL_STEP_X;
  const y = element.row * FLAG_CELL_STEP_Y;
  const fill = stateToFill(state);
  const stroke = stateToStroke(state);
  const nameVisible = isAnswered(state) || showCountryName;

  return (
    <g
      data-element-id={element.id}
      onClick={element.interactive ? () => onClick?.(element.id) : undefined}
      style={{ cursor: element.interactive ? 'pointer' : 'default' }}
    >
      <rect
        x={x}
        y={y}
        width={FLAG_CELL_WIDTH}
        height={FLAG_CELL_HEIGHT}
        rx={4}
        ry={4}
        fill={fill}
        stroke={isTarget ? 'var(--color-highlight)' : stroke}
        strokeWidth={isTarget ? 2.5 : 1}
      />
      <image
        href={element.flagUrl}
        x={x + FLAG_IMAGE_PADDING}
        y={y + 4}
        width={FLAG_IMAGE_WIDTH}
        height={FLAG_IMAGE_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      />
      {nameVisible && (
        <text
          x={x + FLAG_CELL_WIDTH / 2}
          y={y + FLAG_CELL_HEIGHT - 5}
          textAnchor="middle"
          dominantBaseline="auto"
          fill="var(--color-text-primary)"
          fontSize={8}
        >
          {element.label}
        </text>
      )}
    </g>
  );
}

function FlagGrid({
  elements,
  elementStates,
  onElementClick,
  targetElementId,
  toggles,
  elementToggles,
}: VisualizationRendererProps) {
  const { clusteredElementIds } = useZoomPan();

  return (
    <g>
      {elements.map((element) => {
        if (!isFlagGridElement(element)) return null;
        if (clusteredElementIds.has(element.id)) return null;
        const state = elementStates[element.id] ?? 'hidden';
        return (
          <FlagCell
            key={element.id}
            element={element}
            state={state}
            showCountryName={elementToggle(elementToggles, toggles, element.id, 'showCountryNames')}
            isTarget={element.id === targetElementId}
            onClick={onElementClick}
          />
        );
      })}
    </g>
  );
}

export function FlagGridRenderer(props: VisualizationRendererProps) {
  const gridElements = useMemo(
    () => props.elements.filter(isFlagGridElement).map(flagGridElementToVisualizationElement),
    [props.elements],
  );

  return (
    <ZoomPanContainer
      elements={gridElements}
      elementStates={props.elementStates}
      clustering={props.clustering}
      onClusterClick={props.onClusterClick}
    >
      <FlagGrid {...props} />
      {props.svgOverlay}
    </ZoomPanContainer>
  );
}
