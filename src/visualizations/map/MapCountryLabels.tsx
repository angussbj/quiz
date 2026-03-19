import { useMemo, useRef } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  readonly avoidPoints?: ReadonlyArray<ViewBoxPosition>;
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();
  const positionCacheRef = useRef<Map<string, ViewBoxPosition>>(new Map());

  const visibleItems = useMemo(() => {
    const result = computeLabelPlacements({
      labels,
      scale,
      showNames,
      showFlags,
      avoidPoints: avoidPoints ?? [],
      positionCache: positionCacheRef.current,
    });
    positionCacheRef.current = new Map(result.newCache);
    return result.placements;
  }, [labels, scale, showNames, showFlags, avoidPoints]);

  return (
    <g className="country-labels" pointerEvents="none">
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, x, y }) => {
        const flagWidth = flagHeight * 4 / 3;
        const hasFlag = showFlags && !!label.code;
        // Center of the label box
        const cx = x + width / 2;
        // Layout: flag on top, gap, then text — both centered horizontally
        let curY = y;

        return (
          <g key={`country-label-${label.id}`}>
            {hasFlag && (
              <image
                href={`/flags/${label.code}.svg`}
                x={cx - flagWidth / 2}
                y={curY}
                width={flagWidth}
                height={flagHeight}
              />
            )}
            {/* Advance past flag + gap for text positioning */}
            {showNames && (
              <text
                x={cx}
                y={(() => {
                  let textY = y;
                  if (hasFlag) textY += flagHeight + gapSize;
                  // SVG text y is the baseline; offset by ~0.8em for top-aligned positioning
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
