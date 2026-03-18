import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Tooltip.module.css';

const SHOW_DELAY_MS = 50;

interface TooltipProps {
  readonly text: string;
  readonly children: React.ReactNode;
}

/**
 * Tooltip that appears after 50ms hover or on press/long-press.
 * Positioned above the target element.
 */
export function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
  }, []);

  const hide = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    showTimeoutRef.current = null;
    setVisible(false);
  }, []);

  return (
    <div
      className={styles.wrapper}
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
