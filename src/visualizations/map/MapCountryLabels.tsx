import { useMemo } from 'react';
import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import styles from './MapCountryLabels.module.css';

const BASE_FONT_SIZE = 0.8;
const MIN_VIEWBOX_FONT_SIZE = 0.3;
const MAX_VIEWBOX_FONT_SIZE = 1.2;

const LABEL_WIDTH_FACTOR = 1.5;
const FLAG_HEIGHT_FACTOR = 1.4;
const MAX_DISTANCE_FACTOR = 1.2;
const REDUCED_SIZE_FACTORS = [1, 2 / 3, 1 / 2];
const HIGH_ZOOM_THRESHOLD = 8;

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  readonly avoidPoints?: ReadonlyArray<ViewBoxPosition>;
}

interface VisibleItem {
  readonly label: BackgroundLabel;
  readonly fontSize: number;
  readonly flagHeight: number;
  readonly gapSize: number;
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Build candidate center positions in a spiral pattern around (cx, cy),
 * sorted by distance from center. Searches within maxRadius.
 */
function buildSpiralCandidates(
  cx: number,
  cy: number,
  stepX: number,
  stepY: number,
  maxRadius: number,
): ReadonlyArray<readonly [number, number]> {
  const candidates: Array<{ readonly x: number; readonly y: number; readonly dist: number }> = [];
  candidates.push({ x: cx, y: cy, dist: 0 });

  const stepsX = Math.ceil(maxRadius / stepX);
  const stepsY = Math.ceil(maxRadius / stepY);

  for (let ix = -stepsX; ix <= stepsX; ix++) {
    for (let iy = -stepsY; iy <= stepsY; iy++) {
      if (ix === 0 && iy === 0) continue;
      const x = cx + ix * stepX;
      const y = cy + iy * stepY;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= maxRadius) {
        candidates.push({ x, y, dist });
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.map((c) => [c.x, c.y]);
}

export function MapCountryLabels({ labels, showNames, showFlags, avoidPoints }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();

  const visibleItems = useMemo(() => {
    const baseFontSize = Math.min(MAX_VIEWBOX_FONT_SIZE, Math.max(MIN_VIEWBOX_FONT_SIZE, BASE_FONT_SIZE / scale));
    const isHighZoom = scale >= HIGH_ZOOM_THRESHOLD;
    const sizesToTry = isHighZoom ? REDUCED_SIZE_FACTORS : [1];

    const sorted = [...labels].sort((a, b) => b.area - a.area);

    const dotAvoidRadius = Math.max(0.1, 0.35 / scale);
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    if (avoidPoints) {
      for (const point of avoidPoints) {
        placed.push({
          x: point.x - dotAvoidRadius,
          y: point.y - dotAvoidRadius,
          w: dotAvoidRadius * 2,
          h: dotAvoidRadius * 2,
        });
      }
    }
    const visible: VisibleItem[] = [];

    for (const label of sorted) {
      const sqrtArea = Math.sqrt(label.area);
      const countryRadius = sqrtArea * 0.6;

      let didPlace = false;
      for (const sizeFactor of sizesToTry) {
        const fontSize = baseFontSize * sizeFactor;
        const flagHeight = fontSize * FLAG_HEIGHT_FACTOR;
        const flagWidth = flagHeight * 4 / 3;
        const hasFlag = showFlags && !!label.code;

        const textWidthEstimate = showNames ? label.name.length * fontSize * 0.6 : 0;
        const width = showNames
          ? Math.max(sqrtArea * LABEL_WIDTH_FACTOR * sizeFactor, textWidthEstimate, fontSize * 4)
          : hasFlag ? flagWidth : 0;
        if (width === 0) continue;

        const textHeight = showNames ? fontSize * 1.5 : 0;
        const gapSize = (hasFlag && showNames) ? fontSize * 0.3 : 0;
        const flagPartHeight = hasFlag ? flagHeight : 0;
        const height = flagPartHeight + gapSize + textHeight;

        // Use country-radius-based steps so the candidate grid is stable across zoom levels
        const step = countryRadius * 0.25;
        const stepX = Math.max(step, width * 0.3);
        const stepY = Math.max(step, height * 0.3);
        const maxDist = countryRadius * MAX_DISTANCE_FACTOR;

        const candidates = buildSpiralCandidates(
          label.center.x, label.center.y, stepX, stepY, maxDist,
        );

        for (const [cx, cy] of candidates) {
          const lx = cx - width / 2;
          const ly = cy - height / 2;

          const hasOverlap = placed.some((p) =>
            lx < p.x + p.w && lx + width > p.x && ly < p.y + p.h && ly + height > p.y,
          );

          if (!hasOverlap) {
            placed.push({ x: lx, y: ly, w: width, h: height });
            visible.push({ label, fontSize, flagHeight, gapSize, width, height, x: lx, y: ly });
            didPlace = true;
            break;
          }
        }
        if (didPlace) break;
      }
    }

    return visible;
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
