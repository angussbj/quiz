import { useMemo, useRef } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';
import styles from './MapCountryLabels.module.css';

/**
 * Minimum CSS pixel size for rendering inside foreignObject.
 * Content is rendered at a scaled-up size using CSS zoom to avoid
 * sub-pixel dimensions that browsers refuse to render.
 */
const MIN_RENDER_SIZE = 10;

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
    <>
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, height, x, y }) => {
        // When viewBox dimensions are sub-pixel, browsers won't render foreignObject content.
        // Use CSS zoom to render at readable sizes while keeping viewBox positioning correct.
        const needsZoom = fontSize < MIN_RENDER_SIZE;
        const zoomFactor = needsZoom ? MIN_RENDER_SIZE / fontSize : 1;
        const renderFontSize = fontSize * zoomFactor;
        const renderFlagHeight = flagHeight * zoomFactor;
        const renderGap = gapSize * zoomFactor;
        const cssZoom = needsZoom ? 1 / zoomFactor : undefined;

        return (
          <foreignObject
            key={`country-label-${label.id}`}
            x={x}
            y={y}
            width={width}
            height={height}
            className={styles.foreignObject}
          >
            <div
              className={styles.labelContainer}
              style={{
                fontSize: `${renderFontSize}px`,
                gap: `${renderGap}px`,
                zoom: cssZoom,
              }}
            >
              {showFlags && label.code && (
                <img
                  src={`/flags/${label.code}.svg`}
                  alt=""
                  className={styles.flagImage}
                  style={{ height: `${renderFlagHeight}px` }}
                />
              )}
              {showNames && <span className={styles.labelText}>{label.name}</span>}
            </div>
          </foreignObject>
        );
      })}
    </>
  );
}
