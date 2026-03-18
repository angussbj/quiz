import { useMemo } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import styles from './MapCountryLabels.module.css';

/**
 * Target font size in viewBox units at scale=1. The initial map view shows
 * roughly 60° of longitude, so 1 viewBox unit ≈ 10-15 screen pixels.
 */
const BASE_FONT_SIZE = 0.8;
const MIN_VIEWBOX_FONT_SIZE = 0.3;
const MAX_VIEWBOX_FONT_SIZE = 2;

/** Label box width relative to sqrt(area) of the country. */
const LABEL_WIDTH_FACTOR = 1.5;

/** Flag height relative to font size. */
const FLAG_HEIGHT_FACTOR = 1.4;

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  /** Points to avoid (e.g., city dot positions). Labels shift vertically to avoid these. */
  readonly avoidPoints?: ReadonlyArray<ViewBoxPosition>;
}

interface VisibleItem {
  readonly label: BackgroundLabel;
  readonly fontSize: number;
  readonly width: number;
  readonly height: number;
  readonly y: number;
}

/**
 * Renders country name labels and flags as a unified overlay.
 * Uses foreignObject for HTML text wrapping (no mid-word breaks).
 * Labels are zoom-responsive and dynamically hidden based on overlap.
 * Flags are rendered inline next to the country name when enabled.
 */
export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();

  const visibleItems = useMemo(() => {
    const fontSize = Math.min(MAX_VIEWBOX_FONT_SIZE, Math.max(MIN_VIEWBOX_FONT_SIZE, BASE_FONT_SIZE / scale));
    const flagHeight = fontSize * FLAG_HEIGHT_FACTOR;
    const flagWidth = flagHeight * 4 / 3;

    // Sort by area descending (largest countries first = most important)
    const sorted = [...labels].sort((a, b) => b.area - a.area);

    // Pre-populate with city dot positions so labels avoid them
    const dotAvoidRadius = Math.max(0.1, 0.35 / scale); // scales with zoom like actual dots
    const placed: Array<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number }> = [];
    if (avoidPoints) {
      for (const point of avoidPoints) {
        placed.push({ x: point.x - dotAvoidRadius, y: point.y - dotAvoidRadius, w: dotAvoidRadius * 2, h: dotAvoidRadius * 2 });
      }
    }
    const visible: VisibleItem[] = [];

    for (const label of sorted) {
      const sqrtArea = Math.sqrt(label.area);
      const hasFlag = showFlags && !!label.code;
      // Width is based on text (or flag width if no text)
      const width = showNames
        ? Math.max(sqrtArea * LABEL_WIDTH_FACTOR, fontSize * 4)
        : hasFlag ? flagWidth : 0;
      if (width === 0) continue;
      // Height: text line + optional flag below
      const textHeight = showNames ? fontSize * 1.4 : 0;
      const flagPartHeight = hasFlag ? flagHeight + fontSize * 0.2 : 0;
      const height = textHeight + flagPartHeight;

      const x = label.center.x - width / 2;

      // Try default position, then shift up/down to avoid overlaps with dots and other labels
      const offsets = [0, -height, height, -height * 2, height * 2];
      let bestY: number | null = null;
      for (const offset of offsets) {
        const candidateY = label.center.y - height / 2 + offset;
        const hasOverlap = placed.some((p) =>
          x < p.x + p.w && x + width > p.x && candidateY < p.y + p.h && candidateY + height > p.y,
        );
        if (!hasOverlap) {
          bestY = candidateY;
          break;
        }
      }

      if (bestY !== null) {
        placed.push({ x, y: bestY, w: width, h: height });
        visible.push({ label, fontSize, width, height, y: bestY });
      }
    }

    return visible;
  }, [labels, scale, showNames, showFlags, avoidPoints]);

  return (
    <>
      {visibleItems.map(({ label, fontSize, width, height, y }) => (
        <foreignObject
          key={`country-label-${label.id}`}
          x={label.center.x - width / 2}
          y={y}
          width={width}
          height={height}
          className={styles.foreignObject}
        >
          <div
            className={styles.labelContainer}
            style={{ fontSize: `${fontSize}px` }}
          >
            {showFlags && label.code && (
              <img
                src={`/flags/${label.code}.svg`}
                alt=""
                className={styles.flagImage}
                style={{ height: `${fontSize * FLAG_HEIGHT_FACTOR}px` }}
              />
            )}
            {showNames && <span className={styles.labelText}>{label.name}</span>}
          </div>
        </foreignObject>
      ))}
    </>
  );
}
