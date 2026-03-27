import { useMemo } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { GridElement } from './GridElement';
import { isGridElement } from './GridElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { gridElementToVisualizationElement } from './gridElementToVisualizationElement';
import { GridFeedbackOverlay } from './GridFeedbackOverlay';
import { CELL_SIZE, CELL_STEP } from './cellLayout';
import { formatHalfLife } from './formatHalfLife';

export const ZOOM_DETAIL_THRESHOLD = 1.8;

interface CellProps {
  readonly element: GridElement;
  readonly state: ElementVisualState;
  readonly groupColorIndex: number | undefined;
  readonly showGroups: boolean;
  readonly showSymbol: boolean;
  readonly showAtomicNumber: boolean;
  readonly showName: boolean;
  readonly showAtomicWeight: boolean;
  readonly showHalfLife: boolean;
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
  showAtomicWeight,
  showHalfLife,
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
  const atomicWeightVisible = showAtomicWeight;
  const halfLifeVisible = showHalfLife;
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

  // Layout: when half-life toggle is on, shrink symbol to make room for
  // half-life text between symbol and name.
  // When half-life toggle is off, use the original layout unchanged.
  const hasAtomicNumber = atomicNumberVisible && element.atomicNumber > 0;
  let symbolY: number;
  let symbolFontSize: number;
  let halfLifeY: number;
  let nameY: number;

  if (halfLifeVisible && zoomedIn) {
    // Zoomed in + half-life: compact layout with smaller symbol
    symbolY = hasAtomicNumber ? y + CELL_SIZE * 0.36 : y + CELL_SIZE * 0.38;
    symbolFontSize = 14;
    halfLifeY = y + CELL_SIZE * 0.58;
    nameY = y + CELL_SIZE * 0.78;
  } else if (halfLifeVisible) {
    // Zoomed out + half-life: keep symbol at normal size, half-life below
    symbolY = hasAtomicNumber
      ? y + CELL_SIZE * 0.42
      : y + CELL_SIZE * 0.42;
    symbolFontSize = 22;
    halfLifeY = y + CELL_SIZE * 0.75;
    nameY = y + CELL_SIZE * 0.75; // unused at this zoom
  } else {
    // Original layout — no change from before
    symbolY = hasAtomicNumber || nameVisible
      ? y + CELL_SIZE * 0.45
      : y + CELL_SIZE / 2;
    symbolFontSize = zoomedIn ? 18 : 22;
    halfLifeY = 0; // unused
    nameY = y + CELL_SIZE * 0.75;
  }

  const halfLifeText = halfLifeVisible ? formatHalfLife(element.halfLifeSeconds) : undefined;

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
      {atomicWeightVisible && element.atomicWeight && (
        <text
          x={x + CELL_SIZE - 5}
          y={y + 11}
          textAnchor="end"
          dominantBaseline="central"
          fill={textFill}
          fontSize={9}
          opacity={0.7}
        >
          {element.atomicWeight}
        </text>
      )}
      {symbolVisible && (
        <text
          x={x + CELL_SIZE / 2}
          y={symbolY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={symbolFontSize}
          fontWeight="bold"
        >
          {element.symbol}
        </text>
      )}
      {halfLifeText !== undefined && (
        <text
          x={x + CELL_SIZE / 2}
          y={halfLifeY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={9}
          opacity={0.7}
        >
          {halfLifeText}
        </text>
      )}
      {nameVisible && (
        <text
          x={x + CELL_SIZE / 2}
          y={nameY}
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
  const showAtomicWeight = elementToggle(elementToggles, toggles, '', 'showAtomicWeight');
  const showHalfLife = elementToggle(elementToggles, toggles, '', 'showHalfLife');

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
            showAtomicWeight={showAtomicWeight}
            showHalfLife={showHalfLife}
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
    </ZoomPanContainer>
  );
}
