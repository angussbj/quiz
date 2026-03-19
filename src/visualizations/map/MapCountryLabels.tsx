import { useMemo, useRef } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';

// TODO: Remove after debugging label placement
const SHOW_DEBUG_RECTS = true;

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  readonly avoidPoints?: ReadonlyArray<ViewBoxPosition>;
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();
  const positionCacheRef = useRef<Map<string, ViewBoxPosition>>(new Map());

  const { visibleItems, debugRects, debugDotAvoidRadius } = useMemo(() => {
    const result = computeLabelPlacements({
      labels,
      scale,
      showNames,
      showFlags,
      avoidPoints: avoidPoints ?? [],
      positionCache: positionCacheRef.current,
    });
    positionCacheRef.current = new Map(result.newCache);
    return {
      visibleItems: result.placements,
      debugRects: result.debugRects,
      debugDotAvoidRadius: result.debugDotAvoidRadius,
    };
  }, [labels, scale, showNames, showFlags, avoidPoints]);

  // Split debug rects into dot rects and label rects based on size
  // Dot rects are square (w === h) with size === dotAvoidRadius * 2
  const dotRectSize = debugDotAvoidRadius * 2;

  return (
    <g className="country-labels" pointerEvents="none">
      {/* Debug: collision rects */}
      {SHOW_DEBUG_RECTS && debugRects.map((rect, i) => {
        const isDotRect = Math.abs(rect.w - dotRectSize) < 0.001 && Math.abs(rect.h - dotRectSize) < 0.001;
        return (
          <rect
            key={`debug-rect-${i}`}
            x={rect.x}
            y={rect.y}
            width={rect.w}
            height={rect.h}
            fill={isDotRect ? 'rgba(255, 0, 0, 0.15)' : 'rgba(0, 100, 255, 0.15)'}
            stroke={isDotRect ? 'rgba(255, 0, 0, 0.4)' : 'rgba(0, 100, 255, 0.4)'}
            strokeWidth={0.5 / scale}
          />
        );
      })}

      {/* Actual labels */}
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
