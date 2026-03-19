import { useMemo } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';

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
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();
  const quantizedScale = quantizeScale(scale);

  const visibleItems = useMemo(() => {
    const result = computeLabelPlacements({
      labels,
      scale: quantizedScale,
      showNames,
      showFlags,
      avoidPoints: avoidPoints ?? [],
    });
    return result.placements;
  }, [labels, quantizedScale, showNames, showFlags, avoidPoints]);

  return (
    <g className="country-labels" pointerEvents="none">
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, x, y }) => {
        const flagWidth = flagHeight * 4 / 3;
        const hasFlag = showFlags && !!label.code;
        const cx = x + width / 2;

        return (
          <g key={`country-label-${label.id}`}>
            {hasFlag && (
              <image
                href={`/flags/${label.code}.svg`}
                x={cx - flagWidth / 2}
                y={y}
                width={flagWidth}
                height={flagHeight}
              />
            )}
            {showNames && (
              <text
                x={cx}
                y={(() => {
                  let textY = y;
                  if (hasFlag) textY += flagHeight + gapSize;
                  return textY + fontSize * 0.85;
                })()}
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={500}
                fill="var(--color-text-secondary)"
                opacity={0.8}
                style={{ userSelect: 'none' }}
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
