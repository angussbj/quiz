import { useCallback, useMemo, useRef, useState } from 'react';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import type { FlagGridElement } from './FlagGridElement';
import { isFlagGridElement } from './FlagGridElement';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { CursorTooltip } from '../CursorTooltip';
import type { ElementVisualState } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { flagGridElementToVisualizationElement } from './flagGridElementToVisualizationElement';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y } from './flagGridLayout';
import cellStyles from './FlagGridRenderer.module.css';

const FLAG_IMAGE_PADDING = 6;
const FLAG_IMAGE_WIDTH = FLAG_CELL_WIDTH - FLAG_IMAGE_PADDING * 2;
const FLAG_IMAGE_HEIGHT = FLAG_CELL_HEIGHT - 22;

const LABEL_PADDING = 4;
const LABEL_HEIGHT = 14;

interface FlagCellProps {
  readonly element: FlagGridElement;
  readonly state: ElementVisualState;
  readonly showCountryName: boolean;
  readonly onClick?: (elementId: string) => void;
  readonly onLabelMouseEnter: (label: string, event: React.MouseEvent) => void;
  readonly onLabelMouseMove: (event: React.MouseEvent) => void;
  readonly onLabelMouseLeave: () => void;
}


function isAnswered(state: ElementVisualState): boolean {
  return state === 'context' || state === 'correct' || state === 'correct-second'
    || state === 'correct-third' || state === 'incorrect' || state === 'missed';
}

function FlagCell({
  element,
  state,
  showCountryName,
  onClick,
  onLabelMouseEnter,
  onLabelMouseMove,
  onLabelMouseLeave,
}: FlagCellProps) {
  const x = element.column * FLAG_CELL_STEP_X;
  const y = element.row * FLAG_CELL_STEP_Y;
  const fill = state === 'hidden' ? 'transparent' : STATUS_COLORS[state].background;
  const stroke = state === 'hidden' ? 'var(--color-border)' : STATUS_COLORS[state].main;
  const nameVisible = isAnswered(state) || showCountryName;

  const handleLabelMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      const target = event.currentTarget as HTMLElement;
      if (target.scrollWidth > target.clientWidth) {
        onLabelMouseEnter(element.label, event);
      }
    },
    [element.label, onLabelMouseEnter],
  );

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
        stroke={stroke}
        strokeWidth={1}
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
        <foreignObject
          x={x + LABEL_PADDING}
          y={y + FLAG_CELL_HEIGHT - LABEL_HEIGHT - 3}
          width={FLAG_CELL_WIDTH - LABEL_PADDING * 2}
          height={LABEL_HEIGHT}
        >
          <div
            className={cellStyles.cellLabel}
            style={{ fontSize: 8 }}
            onMouseEnter={handleLabelMouseEnter}
            onMouseMove={onLabelMouseMove}
            onMouseLeave={onLabelMouseLeave}
          >
            {element.label}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

interface TooltipState {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

function FlagGrid({
  elements,
  elementStates,
  onElementClick,
  toggles,
  elementToggles,
}: VisualizationRendererProps) {
  const { clusteredElementIds } = useZoomPan();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTextRef = useRef('');

  const handleLabelMouseEnter = useCallback(
    (label: string, event: React.MouseEvent) => {
      tooltipTextRef.current = label;
      setTooltip({ x: event.clientX, y: event.clientY, text: label });
    },
    [],
  );

  const handleLabelMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip({ x: event.clientX, y: event.clientY, text: tooltipTextRef.current });
  }, []);

  const handleLabelMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <>
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
              onClick={onElementClick}
              onLabelMouseEnter={handleLabelMouseEnter}
              onLabelMouseMove={handleLabelMouseMove}
              onLabelMouseLeave={handleLabelMouseLeave}
            />
          );
        })}
      </g>
      {tooltip && <CursorTooltip x={tooltip.x} y={tooltip.y} text={tooltip.text} />}
    </>
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
      putInView={props.putInView}
    >
      <FlagGrid {...props} />
      {props.svgOverlay}
    </ZoomPanContainer>
  );
}
