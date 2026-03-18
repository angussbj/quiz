import { useMemo, useRef } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import { computeLabelPlacements } from './computeLabelPlacements';
import styles from './MapCountryLabels.module.css';

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
      {visibleItems.map(({ label, fontSize, flagHeight, gapSize, width, height, x, y }) => (
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
            style={{ fontSize: `${fontSize}px`, gap: `${gapSize}px` }}
          >
            {showFlags && label.code && (
              <img
                src={`/flags/${label.code}.svg`}
                alt=""
                className={styles.flagImage}
                style={{ height: `${flagHeight}px` }}
              />
            )}
            {showNames && <span className={styles.labelText}>{label.name}</span>}
          </div>
        </foreignObject>
      ))}
    </>
  );
}
