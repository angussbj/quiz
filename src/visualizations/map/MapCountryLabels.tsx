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
const MAX_VIEWBOX_FONT_SIZE = 1.2;

/** Label box width relative to sqrt(area) of the country. */
const LABEL_WIDTH_FACTOR = 1.5;

/** Flag height relative to font size. */
const FLAG_HEIGHT_FACTOR = 1.4;

/** Max distance (in units of country "radius") a label can be from centroid before being hidden. */
const MAX_DISTANCE_FACTOR = 1.2;

/** At high zoom, try reduced font sizes to fit labels closer to their country. */
const REDUCED_SIZE_FACTORS = [1, 2 / 3, 1 / 2];

/** Scale threshold above which we try reduced sizes instead of hiding. */
const HIGH_ZOOM_THRESHOLD = 8;

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
 * Labels that would end up too far from their country are hidden,
 * except at high zoom where reduced sizes are tried first.
 */
export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();

  const visibleItems = useMemo(() => {
    const baseFontSize = Math.min(MAX_VIEWBOX_FONT_SIZE, Math.max(MIN_VIEWBOX_FONT_SIZE, BASE_FONT_SIZE / scale));
    const isHighZoom = scale >= HIGH_ZOOM_THRESHOLD;
    const sizesToTry = isHighZoom ? REDUCED_SIZE_FACTORS : [1];

    // Sort by area descending (largest countries first = most important)
    const sorted = [...labels].sort((a, b) => b.area - a.area);

    // Pre-populate with city dot positions so labels avoid them
    const dotAvoidRadius = Math.max(0.1, 0.35 / scale);
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    if (avoidPoints) {
      for (const point of avoidPoints) {
        placed.push({ x: point.x - dotAvoidRadius, y: point.y - dotAvoidRadius, w: dotAvoidRadius * 2, h: dotAvoidRadius * 2 });
      }
    }
    const visible: VisibleItem[] = [];

    for (const label of sorted) {
      const sqrtArea = Math.sqrt(label.area);
      // Approximate "radius" of the country for proximity checking
      const countryRadius = sqrtArea * 0.6;

      let placed_ = false;
      for (const sizeFactor of sizesToTry) {
        const fontSize = baseFontSize * sizeFactor;
        const flagHeight = fontSize * FLAG_HEIGHT_FACTOR;
        const flagWidth = flagHeight * 4 / 3;
        const hasFlag = showFlags && !!label.code;

        // Estimate text width: ~0.6em per character for typical font
        const textWidthEstimate = showNames ? label.name.length * fontSize * 0.6 : 0;
        const width = showNames
          ? Math.max(sqrtArea * LABEL_WIDTH_FACTOR * sizeFactor, textWidthEstimate, fontSize * 4)
          : hasFlag ? flagWidth : 0;
        if (width === 0) continue;

        const textHeight = showNames ? fontSize * 1.8 : 0;
        const flagPartHeight = hasFlag ? flagHeight + fontSize * 0.2 : 0;
        const height = textHeight + flagPartHeight;

        const x = label.center.x - width / 2;

        // Try positions spiraling outward from centroid
        const step = height * 0.5;
        const maxSteps = 6;
        const offsets: number[] = [0];
        for (let i = 1; i <= maxSteps; i++) {
          offsets.push(-step * i, step * i);
        }

        for (const offset of offsets) {
          const candidateY = label.center.y - height / 2 + offset;

          // Check if label center is too far from country centroid
          const labelCenterY = candidateY + height / 2;
          const distanceFromCentroid = Math.abs(labelCenterY - label.center.y);
          if (distanceFromCentroid > countryRadius * MAX_DISTANCE_FACTOR) continue;

          const hasOverlap = placed.some((p) =>
            x < p.x + p.w && x + width > p.x && candidateY < p.y + p.h && candidateY + height > p.y,
          );

          if (!hasOverlap) {
            placed.push({ x, y: candidateY, w: width, h: height });
            visible.push({ label, fontSize, width, height, y: candidateY });
            placed_ = true;
            break;
          }
        }
        if (placed_) break;
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
