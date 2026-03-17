import { useMemo, useCallback } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { GridElement } from './GridElement';
import { isGridElement } from './GridElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import type { ElementVisualState } from '../VisualizationElement';
import { gridElementToVisualizationElement } from './gridElementToVisualizationElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

const ZOOM_DETAIL_THRESHOLD = 1.8;

/** Look up a per-element toggle, falling back to the global toggle value. */
function elementToggle(
  elementToggles: VisualizationRendererProps['elementToggles'],
  toggles: Readonly<Record<string, boolean>>,
  elementId: string,
  toggleKey: string,
): boolean {
  return elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey] ?? false;
}

interface CellProps {
  readonly element: GridElement;
  readonly state: ElementVisualState;
  readonly groupColorIndex: number | undefined;
  readonly showGroups: boolean;
  readonly showSymbol: boolean;
  readonly isClustered: boolean;
  readonly isTarget: boolean;
  readonly zoomedIn: boolean;
  readonly onClick?: (elementId: string) => void;
}

function stateToFill(state: ElementVisualState, groupColorIndex: number | undefined, showGroups: boolean): string {
  switch (state) {
    case 'correct':
      return 'var(--color-correct-bg)';
    case 'incorrect':
      return 'var(--color-incorrect-bg)';
    case 'highlighted':
      return 'var(--color-highlight-bg)';
    case 'revealed':
      if (showGroups && groupColorIndex !== undefined) {
        return `var(--color-group-${groupColorIndex + 1})`;
      }
      return 'var(--color-surface-raised)';
    case 'hidden':
    default:
      return 'var(--color-bg-tertiary)';
  }
}

function stateToStroke(state: ElementVisualState): string {
  switch (state) {
    case 'correct':
      return 'var(--color-correct)';
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'highlighted':
      return 'var(--color-highlight)';
    default:
      return 'var(--color-border)';
  }
}

function stateToTextFill(state: ElementVisualState, groupColorIndex: number | undefined, showGroups: boolean): string {
  if (state === 'revealed' && showGroups && groupColorIndex !== undefined) {
    return 'var(--color-on-accent)';
  }
  switch (state) {
    case 'correct':
      return 'var(--color-correct)';
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'highlighted':
      return 'var(--color-text-primary)';
    case 'hidden':
      return 'var(--color-text-muted)';
    case 'revealed':
    default:
      return 'var(--color-text-primary)';
  }
}

function isRevealed(state: ElementVisualState): boolean {
  return state === 'revealed' || state === 'correct' || state === 'highlighted';
}

function GridCell({
  element,
  state,
  groupColorIndex,
  showGroups,
  showSymbol,
  isClustered,
  isTarget,
  zoomedIn,
  onClick,
}: CellProps) {
  if (isClustered) return null;

  const x = element.column * CELL_STEP;
  const y = element.row * CELL_STEP;
  const fill = stateToFill(state, groupColorIndex, showGroups);
  const stroke = stateToStroke(state);
  const textFill = stateToTextFill(state, groupColorIndex, showGroups);
  const revealed = isRevealed(state) || showSymbol;
  const interactive = element.interactive;

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [onClick, element.id]);

  return (
    <g
      data-element-id={element.id}
      onClick={interactive ? handleClick : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      <rect
        x={x}
        y={y}
        width={CELL_SIZE}
        height={CELL_SIZE}
        rx={4}
        ry={4}
        fill={fill}
        stroke={isTarget ? 'var(--color-highlight)' : stroke}
        strokeWidth={isTarget ? 2.5 : 1}
      />
      {revealed && (
        <text
          x={x + CELL_SIZE / 2}
          y={zoomedIn ? y + CELL_SIZE * 0.4 : y + CELL_SIZE / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={zoomedIn ? 18 : 22}
          fontWeight="bold"
        >
          {element.symbol}
        </text>
      )}
      {revealed && zoomedIn && (
        <text
          x={x + CELL_SIZE / 2}
          y={y + CELL_SIZE * 0.72}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={8}
          opacity={0.85}
        >
          {element.label}
        </text>
      )}
    </g>
  );
}

function PeriodicTableGrid({
  elements,
  elementStates,
  onElementClick,
  targetElementId,
  toggles,
  elementToggles,
}: VisualizationRendererProps) {
  const { scale, clusteredElementIds } = useZoomPan();
  const zoomedIn = scale >= ZOOM_DETAIL_THRESHOLD;
  const showGroups = toggles['showGroups'] ?? true;

  const groupColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let index = 0;
    for (const element of elements) {
      if (element.group && !map.has(element.group)) {
        map.set(element.group, index % 8);
        index++;
      }
    }
    return map;
  }, [elements]);

  return (
    <g>
      {elements.map((element) => {
        if (!isGridElement(element)) return null;
        const state = elementStates[element.id] ?? 'hidden';
        const groupColorIndex = element.group ? groupColorMap.get(element.group) : undefined;
        return (
          <GridCell
            key={element.id}
            element={element}
            state={state}
            groupColorIndex={groupColorIndex}
            showGroups={showGroups}
            showSymbol={elementToggle(elementToggles, toggles, element.id, 'showSymbols')}
            isClustered={clusteredElementIds.has(element.id)}
            isTarget={element.id === targetElementId}
            zoomedIn={zoomedIn}
            onClick={onElementClick}
          />
        );
      })}
    </g>
  );
}

export function PeriodicTableRenderer(props: VisualizationRendererProps) {
  const gridElements = useMemo(
    () => props.elements.filter(isGridElement).map(gridElementToVisualizationElement),
    [props.elements],
  );

  return (
    <ZoomPanContainer
      elements={gridElements}
      elementStates={props.elementStates}
      clustering={props.clustering}
      onClusterClick={props.onClusterClick}
    >
      <PeriodicTableGrid {...props} />
      {props.svgOverlay}
    </ZoomPanContainer>
  );
}
