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
import { formatElementData, ELEMENT_DATA_COLUMNS } from './formatElementData';
import { computeElementColors, toElementColorField } from '../elementColorScale';
import type { ElementColorMap } from '../elementColorScale';
import { useTheme } from '@/theme/ThemeProvider';

export const ZOOM_DETAIL_THRESHOLD = 1.8;

interface CellProps {
  readonly element: GridElement;
  readonly state: ElementVisualState;
  readonly showSymbol: boolean;
  readonly showAtomicNumber: boolean;
  readonly showName: boolean;
  readonly showAtomicWeight: boolean;
  readonly elementDataField: string | undefined;
  readonly colorFill: string | undefined;
  readonly isClustered: boolean;
  readonly zoomedIn: boolean;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: { readonly x: number; readonly y: number }) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
}

function stateToFill(state: ElementVisualState): string {
  if (state === 'hidden') return STATUS_COLORS['default'].background;
  return STATUS_COLORS[state].background;
}

function stateToStroke(state: ElementVisualState): string {
  if (state === 'hidden') return STATUS_COLORS['default'].main;
  return STATUS_COLORS[state].main;
}

function stateToTextFill(state: ElementVisualState): string {
  if (state === 'hidden') return STATUS_COLORS['default'].text;
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

/** Text color for cells with a custom color fill — always dark for contrast. */
const COLOR_FILL_TEXT = 'var(--color-on-color-fill)';

function GridCell({
  element,
  state,
  showSymbol,
  showAtomicNumber,
  showName,
  showAtomicWeight,
  elementDataField,
  colorFill,
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
  const defaultFill = stateToFill(baseState);
  // Color fill applies to hidden/default/context states (not answered elements with feedback colors)
  const useColorFill = colorFill !== undefined
    && (baseState === 'hidden' || baseState === 'default' || baseState === 'context');
  const fill = useColorFill ? colorFill : defaultFill;
  const stroke = stateToStroke(baseState);
  const defaultTextFill = stateToTextFill(baseState);
  const textFill = useColorFill ? COLOR_FILL_TEXT : defaultTextFill;
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
  let dataFieldY: number;
  let nameY: number;

  if (hasDataField && zoomedIn) {
    // Zoomed in + data field: compact layout with smaller symbol
    symbolY = y + CELL_SIZE * 0.4;
    dataFieldY = y + CELL_SIZE * 0.66;
    nameY = y + CELL_SIZE * 0.8;
  } else if (hasDataField) {
    // Zoomed out + data field: keep symbol at normal size, data below
    symbolY = y + CELL_SIZE * 0.42;
    dataFieldY = y + CELL_SIZE * 0.75;
    nameY = y + CELL_SIZE * 0.75; // unused at this zoom
  } else if (zoomedIn) {
    // Zoomed in, no data field: symbol centered between atomic number and name
    symbolY = hasAtomicNumber || nameVisible
      ? y + CELL_SIZE * 0.42
      : y + CELL_SIZE / 2;
    dataFieldY = 0; // unused
    nameY = y + CELL_SIZE * 0.75;
  } else {
    // Zoomed out, no data field: symbol centered in cell
    symbolY = hasAtomicNumber
      ? y + CELL_SIZE * 0.52
      : y + CELL_SIZE / 2;
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
          opacity={0.8}
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
          opacity={0.8}
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
          fontSize={24}
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
          fontSize={8}
          opacity={0.8}
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
        >
          {element.label}
        </text>
      )}
    </g>
  );
}

function toElementDataColumn(value: string): string | undefined {
  return ELEMENT_DATA_COLUMNS.find((c) => c === value);
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
  selectValues,
  distanceFeedbackLines,
}: VisualizationRendererProps) {
  const { scale, clusteredElementIds } = useZoomPan();
  const { resolved: theme } = useTheme();
  const darkMode = theme === 'dark';
  const zoomedIn = scale >= ZOOM_DETAIL_THRESHOLD;
  const showAtomicWeight = elementToggle(elementToggles, toggles, '', 'showAtomicWeight');
  const elementDataValue = selectValues?.['elementData'] ?? 'none';
  const elementDataField = toElementDataColumn(elementDataValue);
  const elementColorValue = selectValues?.['elementColors'] ?? 'none';
  const elementColorField = toElementColorField(elementColorValue);

  const elementColorMap: ElementColorMap | undefined = useMemo(() => {
    if (elementColorField === undefined) return undefined;
    return computeElementColors(elements, elementColorField, darkMode);
  }, [elements, elementColorField, darkMode]);

  return (
    <g>
      {elements.map((element) => {
        if (!isGridElement(element)) return null;
        const state = elementStates[element.id] ?? 'hidden';
        return (
          <GridCell
            key={element.id}
            element={element}
            state={state}
            showSymbol={elementToggle(elementToggles, toggles, element.id, 'showSymbols')}
            showAtomicNumber={elementToggle(elementToggles, toggles, element.id, 'showAtomicNumbers')}
            showName={elementToggle(elementToggles, toggles, element.id, 'showNames')}
            showAtomicWeight={showAtomicWeight}
            elementDataField={elementDataField}
            colorFill={elementColorMap?.get(element.id)}
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
