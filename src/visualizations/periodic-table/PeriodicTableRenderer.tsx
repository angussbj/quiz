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
import { formatElementData } from './formatElementData';
import type { ElementDataField } from './formatElementData';

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
  readonly elementDataField: ElementDataField | undefined;
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
  elementDataField,
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
  const hasDataField = elementDataField !== undefined;
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

  // Layout depends on whether a data field is shown and zoom level.
  // When no data field is selected, symbol is centered naturally.
  const hasAtomicNumber = atomicNumberVisible && element.atomicNumber > 0;
  let symbolY: number;
  let symbolFontSize: number;
  let dataFieldY: number;
  let nameY: number;

  if (hasDataField && zoomedIn) {
    // Zoomed in + data field: compact layout with smaller symbol
    symbolY = hasAtomicNumber ? y + CELL_SIZE * 0.36 : y + CELL_SIZE * 0.38;
    symbolFontSize = 14;
    dataFieldY = y + CELL_SIZE * 0.58;
    nameY = y + CELL_SIZE * 0.78;
  } else if (hasDataField) {
    // Zoomed out + data field: keep symbol at normal size, data below
    symbolY = y + CELL_SIZE * 0.42;
    symbolFontSize = 22;
    dataFieldY = y + CELL_SIZE * 0.75;
    nameY = y + CELL_SIZE * 0.75; // unused at this zoom
  } else if (zoomedIn) {
    // Zoomed in, no data field: symbol centered between atomic number and name
    symbolY = hasAtomicNumber || nameVisible
      ? y + CELL_SIZE * 0.42
      : y + CELL_SIZE / 2;
    symbolFontSize = 18;
    dataFieldY = 0; // unused
    nameY = y + CELL_SIZE * 0.75;
  } else {
    // Zoomed out, no data field: symbol centered in cell
    symbolY = hasAtomicNumber
      ? y + CELL_SIZE * 0.52
      : y + CELL_SIZE / 2;
    symbolFontSize = 22;
    dataFieldY = 0; // unused
    nameY = y + CELL_SIZE * 0.75;
  }

  const dataFieldText = elementDataField !== undefined
    ? formatElementData(element, elementDataField)
    : undefined;

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
      {dataFieldText !== undefined && (
        <text
          x={x + CELL_SIZE / 2}
          y={dataFieldY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={textFill}
          fontSize={9}
          opacity={0.7}
        >
          {dataFieldText}
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

const ELEMENT_DATA_FIELDS = new Set(['half-life', 'density', 'state', 'electronegativity', 'year-discovered']);

function PeriodicTableGrid({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  toggles,
  elementToggles,
  selectValues,
  distanceFeedbackLines,
}: VisualizationRendererProps) {
  const { scale, clusteredElementIds } = useZoomPan();
  const zoomedIn = scale >= ZOOM_DETAIL_THRESHOLD;
  const showGroups = elementToggle(elementToggles, toggles, '', 'showGroups');
  const showAtomicWeight = elementToggle(elementToggles, toggles, '', 'showAtomicWeight');
  const elementDataValue = selectValues?.['elementData'] ?? 'none';
  const elementDataField = ELEMENT_DATA_FIELDS.has(elementDataValue)
    ? elementDataValue as ElementDataField
    : undefined;

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
            elementDataField={elementDataField}
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
