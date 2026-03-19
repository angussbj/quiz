import { createPortal } from 'react-dom';
import styles from './CursorTooltip.module.css';

interface CursorTooltipProps {
  readonly x: number;
  readonly y: number;
  readonly text: string;
}

/**
 * A tooltip that renders at a fixed screen position (typically near the cursor).
 * Portals to document.body so it works from any context, including SVG.
 */
export function CursorTooltip({ x, y, text }: CursorTooltipProps) {
  return createPortal(
    <div
      className={styles.tooltip}
      style={{ left: x + 12, top: y - 28 }}
      role="tooltip"
    >
      {text}
    </div>,
    document.body,
  );
}
