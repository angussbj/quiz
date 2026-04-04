import { useMemo } from 'react';
import type { ViewBoxPosition, ElementVisualState } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';
import { shouldShowLabel } from '../shouldShowLabel';
import { STATUS_COLORS } from '../elementStateColors';
import { assetPath } from '../../utilities/assetPath';

/**
 * Base for exponential zoom thresholds at which label positions are recomputed
 * from scratch. Labels stay fixed between thresholds for visual stability.
 * Thresholds: 1, base, base^2, base^3, ... (e.g., 1, 2, 4, 8, 16, 32)
 */
const ZOOM_THRESHOLD_BASE = 2;
const ZOOM_THRESHOLD_COUNT = 8;

const ZOOM_THRESHOLDS: ReadonlyArray<number> = Array.from(
  { length: ZOOM_THRESHOLD_COUNT },
  (_, i) => ZOOM_THRESHOLD_BASE ** i,
);

/** Find which zoom band the current scale falls in, returning the threshold value. */
function quantizeScale(scale: number): number {
  for (let i = ZOOM_THRESHOLDS.length - 1; i >= 0; i--) {
    if (scale >= ZOOM_THRESHOLDS[i]) return ZOOM_THRESHOLDS[i];
  }
  return ZOOM_THRESHOLDS[0];
}

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  readonly avoidPoints?: ReadonlyArray<ViewBoxPosition>;
  readonly elementNameToState?: Readonly<Record<string, ElementVisualState | undefined>>;
  readonly nameToElementId?: Readonly<Record<string, string>>;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  /** Formatted data values keyed by element name (e.g. "Australia" → "25.7M"). */
  readonly dataValues?: Readonly<Record<string, string>>;
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints, elementNameToState, nameToElementId, onElementHoverStart, onElementHoverEnd, dataValues }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();
  const quantizedScale = quantizeScale(scale);

  const hasDataValues = !!dataValues && Object.keys(dataValues).length > 0;

  // Filter labels to those that should be visible based on element state, toggles, and data display.
  // Labels for answered elements always show; others show per toggle or if data values are active.
  const filteredLabels = useMemo(() => {
    if (!elementNameToState) return showNames || showFlags || hasDataValues ? labels : [];
    return labels.filter((label) => {
      const state = elementNameToState[label.name];
      const hasData = hasDataValues && dataValues[label.name] !== undefined;
      return shouldShowLabel(state, showNames || showFlags || hasData);
    });
  }, [labels, elementNameToState, showNames, showFlags, hasDataValues, dataValues]);

  const visibleItems = useMemo(() => {
    if (filteredLabels.length === 0) return [];
    const result = computeLabelPlacements({
      labels: filteredLabels,
      scale: quantizedScale,
      showNames: true,
      showFlags,
      avoidPoints: avoidPoints ?? [],
    });
    return result.placements;
  }, [filteredLabels, quantizedScale, showFlags, avoidPoints]);

  return (
    <g className="country-labels">
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, x, y, lines }) => {
        const state = elementNameToState?.[label.name];
        const isAnswered = state === 'correct' || state === 'correct-second'
          || state === 'correct-third' || state === 'incorrect'
          || state === 'missed' || state === 'context';
        const labelShowName = isAnswered || showNames;
        const labelShowFlag = showFlags && !!label.code;
        const dataValue = dataValues?.[label.name];
        const flagWidth = flagHeight * 4 / 3;
        const cx = x + width / 2;
        const textColor = isAnswered
          ? STATUS_COLORS[state].main
          : 'var(--color-text-secondary)';
        const lineHeight = fontSize * 1.3;
        const elementId = nameToElementId?.[label.name];
        const canHover = !!elementId && !!onElementHoverStart;

        let textBaseY = y;
        if (labelShowFlag) textBaseY += flagHeight + gapSize;

        // Data value position: below the name if name is visible, otherwise at the name position
        const nameLineCount = labelShowName ? Math.max(lines.length, 1) : 0;
        const dataFontSize = fontSize * 0.75;
        const dataY = textBaseY + fontSize * 0.85 + nameLineCount * lineHeight + dataFontSize * 0.3;

        return (
          <g
            key={`country-label-${label.id}`}
            onMouseEnter={canHover ? () => onElementHoverStart(elementId) : undefined}
            onMouseLeave={canHover ? onElementHoverEnd : undefined}
          >
            {labelShowFlag && (
              <image
                href={assetPath(`/flags/${label.code}.svg`)}
                x={cx - flagWidth / 2}
                y={y}
                width={flagWidth}
                height={flagHeight}
                pointerEvents={canHover ? 'auto' : 'none'}
              />
            )}
            {labelShowName && (
              <text
                x={cx}
                y={textBaseY + fontSize * 0.85}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={500}
                fill={textColor}
                opacity={0.8}
                pointerEvents={canHover ? 'auto' : 'none'}
                style={{
                  userSelect: 'none',
                  paintOrder: 'stroke',
                  stroke: 'var(--color-label-halo)',
                  strokeWidth: fontSize * 0.5,
                  strokeLinejoin: 'round',
                }}
              >
                {lines.length <= 1 ? label.name : lines.map((line, i) => (
                  <tspan key={i} x={cx} dy={i === 0 ? 0 : lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            )}
            {dataValue !== undefined && (
              <text
                x={cx}
                y={labelShowName ? dataY : textBaseY + fontSize * 0.85}
                textAnchor="middle"
                fontSize={dataFontSize}
                fill={textColor}
                opacity={0.7}
                pointerEvents={canHover ? 'auto' : 'none'}
                style={{
                  userSelect: 'none',
                  paintOrder: 'stroke',
                  stroke: 'var(--color-label-halo)',
                  strokeWidth: dataFontSize * 0.5,
                  strokeLinejoin: 'round',
                }}
              >
                {dataValue}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
