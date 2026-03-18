import { useMemo } from 'react';
import type { BackgroundLabel } from './BackgroundLabel';
import { useZoomPan } from '../ZoomPanContext';
import styles from './MapCountryLabels.module.css';

/** Target label height in screen pixels. Labels scale inversely with zoom. */
const TARGET_SCREEN_PX = 11;
const MIN_VIEWBOX_FONT_SIZE = 0.25;
const MAX_VIEWBOX_FONT_SIZE = 3;

/** Max width of a label box relative to sqrt(area) of the country. */
const LABEL_WIDTH_FACTOR = 1.5;

interface MapCountryLabelsProps {
  readonly labels: ReadonlyArray<BackgroundLabel>;
}

interface VisibleLabel {
  readonly label: BackgroundLabel;
  readonly fontSize: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Renders country name labels using foreignObject for HTML text wrapping.
 * Labels are zoom-responsive: font size adjusts so labels stay readable.
 * Smaller countries' labels are hidden when they overlap larger ones.
 */
export function MapCountryLabels({ labels }: MapCountryLabelsProps) {
  const { scale } = useZoomPan();

  const visibleLabels = useMemo(() => {
    // Font size in viewBox units — scales inversely with zoom so screen size stays constant
    const fontSize = Math.min(MAX_VIEWBOX_FONT_SIZE, Math.max(MIN_VIEWBOX_FONT_SIZE, TARGET_SCREEN_PX / scale));

    // Sort labels by area descending (largest countries first = most important)
    const sorted = [...labels].sort((a, b) => b.area - a.area);

    // Compute label dimensions and filter by overlap
    const placed: Array<{ readonly x: number; readonly y: number; readonly w: number; readonly h: number }> = [];
    const visible: VisibleLabel[] = [];

    for (const label of sorted) {
      const sqrtArea = Math.sqrt(label.area);
      const width = Math.max(sqrtArea * LABEL_WIDTH_FACTOR, fontSize * 4);
      // Estimate height: single line + some wrapping headroom
      const lineCount = Math.ceil((label.name.length * fontSize * 0.6) / width);
      const height = fontSize * 1.4 * Math.max(1, Math.min(lineCount, 3));

      const x = label.center.x - width / 2;
      const y = label.center.y - height / 2;

      // Check overlap with already-placed labels
      const overlaps = placed.some((p) =>
        x < p.x + p.w && x + width > p.x && y < p.y + p.h && y + height > p.y,
      );

      if (!overlaps) {
        placed.push({ x, y, w: width, h: height });
        visible.push({ label, fontSize, width, height });
      }
    }

    return visible;
  }, [labels, scale]);

  return (
    <>
      {visibleLabels.map(({ label, fontSize, width, height }) => (
        <foreignObject
          key={`country-label-${label.id}`}
          x={label.center.x - width / 2}
          y={label.center.y - height / 2}
          width={width}
          height={height}
          className={styles.foreignObject}
        >
          <div
            className={styles.labelContainer}
            style={{ fontSize: `${fontSize}px` }}
          >
            {label.name}
          </div>
        </foreignObject>
      ))}
    </>
  );
}
