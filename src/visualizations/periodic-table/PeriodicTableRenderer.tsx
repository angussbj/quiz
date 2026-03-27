import { useMemo } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { GridElement } from './GridElement';
import { isGridElement } from './GridElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { RevealPulseOverlay } from '../RevealPulse';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { gridElementToVisualizationElement } from './gridElementToVisualizationElement';
import { GridFeedbackOverlay } from './GridFeedbackOverlay';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

export const ZOOM_DETAIL_THRESHOLD = 1.8;

interface CellProps {
  readonly element: GridElement;
  readonly state: ElementVisualState;
  readonly groupColorIndex: number | undefined;
  readonly showGroups: boolean;
  readonly showSymbol: boolean;
  readonly showAtomicNumber: boolean;
  readonly showName: boolean;
  readonly isClustered: boolean;
  readonly zoomedIn: boolean;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
}

function stateToFill(state: ElementVisualState, groupColorIndex: number | undefined, showGroups: boolean): string {
  const groupColor = showGroups && groupColorIndex !== undefined
    ? `var(--color-group-${groupColorIndex + 1})`
    : undefined;
  if (state === 'hidden') return groupColor ?? STATUS_COLORS['default'].background;
  if (groupColor !== undefined && (state === 'correct' || state === 'correct-second' || state === 'correct-third' || state === 'default')) {
    return groupColor;
  }
  return STATUS_COLORS[state].background;
}

function stateToStroke(state: ElementVisualState): string {
  if (state === 'hidden') return STATUS_COLORS['default'].main;
  return STATUS_COLORS[state].main;
}

function stateToTextFill(state: ElementVisualState, groupColorIndex: number | undefined, showGroups: boolean): string {
  const hasGroupColor = showGroups && groupColorIndex !== undefined;
  if (state === 'hidden') return hasGroupColor ? 'var(--color-on-accent)' : STATUS_COLORS['default'].text;
  if (hasGroupColor && (state === 'correct' || state === 'correct-second' || state === 'correct-third')) {
    return 'var(--color-on-accent)';
  }
  return STATUS_COLORS[state].text;
}

function isThickStroke(state: ElementVisualState): boolean {
  return state === 'highlighted' || state === 'correct' || state === 'correct-second'
    || state === 'correct-third' || state === 'missed';
}

/** Whether the element has been answered — text should always show regardless of toggles. */
function isAnswered(state: ElementVisualState): boolean {
  return state === 'context' || state === 'correct' || state === 'correct-second'
    || state === 'correct-third' || state === 'incorrect' || state === 'missed';
}

function GridCell({
  element,
  state,
  groupColorIndex,
  showGroups,
  showSymbol,
  showAtomicNumber,
  showName,
  isClustered,
  zoomedIn,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
}: CellProps) {
  if (isClustered) return null;

  const x = element.column * CELL_STEP;
  const y = element.row * CELL_STEP;
  const baseState = state;
  const fill = stateToFill(baseState, groupColorIndex, showGroups);
  const stroke = stateToStroke(baseState);
  const textFill = stateToTextFill(baseState, groupColorIndex, showGroups);
  const answered = isAnswered(baseState);
  const symbolVisible = answered || showSymbol;
  const atomicNumberVisible = answered || showAtomicNumber;
  const nameVisible = (answered || showName) && zoomedIn;
  const interactive = element.interactive;

  const cellCenterX = x + CELL_SIZE / 2;
  const cellCenterY = y + CELL_SIZE / 2;

  const handleClick = interactive
    ? () => {
        if (onPositionClick) {
          onPositionClick({ x: cellCenterX, y: cellCenterY });
        } else if (onElementClick) {
          onElementClick(element.id);
        }
      }
    : undefined;

  const hasAtomicNumber = atomicNumberVisible && element.atomicNumber > 0;
  const symbolY = hasAtomicNumber || nameVisible
    ? y + CELL_SIZE * 0.45
    : y + CELL_SIZE / 2;

  return (
    <g
      data-element-id={element.id}
      onClick={handleClick}
      onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
      onMouseLeave={onElementHoverEnd}
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
        stroke={stroke}
        strokeWidth={isThickStroke(baseState) ? 2.5 : 1}
      />
      {hasAtomicNumber && (
        <text
          x={x + 5}
          y={y + 11}
          textAnchor="start"
          dominantBaseline="central"
          fill={textFill}
          fontSize={9}
          opacity={0.7}
        >
          {element.atomicNumber}
        </text>
      )}
      {symbolVisible && (
        <text
          x={x + CELL_SIZE / 2}
          y={symbolY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={zoomedIn ? 18 : 22}
          fontWeight="bold"
        >
          {element.symbol}
        </text>
      )}
      {nameVisible && (
        <text
          x={x + CELL_SIZE / 2}
          y={y + CELL_SIZE * 0.75}
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
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  toggles,
  elementToggles,
  distanceFeedbackLines,
}: VisualizationRendererProps) {
  const { scale, clusteredElementIds } = useZoomPan();
  const zoomedIn = scale >= ZOOM_DETAIL_THRESHOLD;
  const showGroups = elementToggle(elementToggles, toggles, '', 'showGroups');

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
            showAtomicNumber={elementToggle(elementToggles, toggles, element.id, 'showAtomicNumbers')}
            showName={elementToggle(elementToggles, toggles, element.id, 'showNames')}
            isClustered={clusteredElementIds.has(element.id)}
            zoomedIn={zoomedIn}
            onElementClick={onElementClick}
            onPositionClick={onPositionClick}
            onElementHoverStart={onElementHoverStart}
            onElementHoverEnd={onElementHoverEnd}
          />
        );
      })}
      {distanceFeedbackLines && distanceFeedbackLines.length > 0 && (
        <GridFeedbackOverlay lines={distanceFeedbackLines} elements={elements} />
      )}
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
      putInView={props.putInView}
    >
      {props.svgUnderlay}
      <PeriodicTableGrid {...props} />
      {props.svgOverlay}
      <RevealPulseOverlay elements={gridElements} elementStates={props.elementStates} autoRevealElementIds={props.autoRevealElementIds} />
    </ZoomPanContainer>
  );
}
