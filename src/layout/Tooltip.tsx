import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Tooltip.module.css';

const DEFAULT_SHOW_DELAY_MS = 50;

interface TooltipProps {
  readonly text: string | undefined;
  readonly children: React.ReactNode;
  /** Delay before the tooltip appears, in milliseconds. Defaults to 50ms. */
  readonly delayMs?: number;
  /** Extra className for the wrapper, for layout overrides (e.g. display). */
  readonly className?: string;
}

/**
 * Tooltip that appears after a hover delay or on press/long-press.
 * Positioned above the target element. When `text` is undefined, renders
 * children unchanged (no wrapper, no listeners) so callers can conditionally
 * add a tooltip without changing the DOM structure for the non-tooltip case.
 */
export function Tooltip({ text, children, delayMs = DEFAULT_SHOW_DELAY_MS, className }: TooltipProps) {
  if (!text) return <>{children}</>;
  return (
    <TooltipInner text={text} delayMs={delayMs} className={className}>
      {children}
    </TooltipInner>
  );
}

function TooltipInner({
  text,
  children,
  delayMs,
  className,
}: {
  readonly text: string;
  readonly children: React.ReactNode;
  readonly delayMs: number;
  readonly className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => setVisible(true), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = null;
    setVisible(false);
  }, []);

  return (
    <div
      className={className ? `${styles.wrapper} ${className}` : styles.wrapper}
      onMouseEnter={show}
      onMouseLeave={hide}
      onPointerDown={show}
      onPointerUp={hide}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={styles.tooltip}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.1 }}
            role="tooltip"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
