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
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints, elementNameToState }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();
  const quantizedScale = quantizeScale(scale);

  // Filter labels to those that should be visible based on element state and toggles.
  // Labels for answered elements always show; others show per toggle.
  const filteredLabels = useMemo(() => {
    if (!elementNameToState) return showNames || showFlags ? labels : [];
    return labels.filter((label) => {
      const state = elementNameToState[label.name];
      return shouldShowLabel(state, showNames || showFlags);
    });
  }, [labels, elementNameToState, showNames, showFlags]);

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
    <g className="country-labels" pointerEvents="none">
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, x, y }) => {
        const state = elementNameToState?.[label.name];
        const isAnswered = state === 'correct' || state === 'correct-second'
          || state === 'correct-third' || state === 'incorrect'
          || state === 'missed' || state === 'context';
        const labelShowName = isAnswered || showNames;
        const labelShowFlag = showFlags && !!label.code;
        const flagWidth = flagHeight * 4 / 3;
        const cx = x + width / 2;
        const textColor = isAnswered
          ? STATUS_COLORS[state].main
          : 'var(--color-text-secondary)';

        return (
          <g key={`country-label-${label.id}`}>
            {labelShowFlag && (
              <image
                href={assetPath(`/flags/${label.code}.svg`)}
                x={cx - flagWidth / 2}
                y={y}
                width={flagWidth}
                height={flagHeight}
              />
            )}
            {labelShowName && (
              <text
                x={cx}
                y={(() => {
                  let textY = y;
                  if (labelShowFlag) textY += flagHeight + gapSize;
                  return textY + fontSize * 0.85;
                })()}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={500}
                fill={textColor}
                opacity={0.8}
                style={{
                  userSelect: 'none',
                  paintOrder: 'stroke',
                  stroke: 'var(--color-label-halo)',
                  strokeWidth: fontSize * 0.5,
                  strokeLinejoin: 'round',
                }}
              >
                {label.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
