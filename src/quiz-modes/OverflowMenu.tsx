import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import styles from './OverflowMenu.module.css';

interface OverflowMenuItem {
  readonly label: string;
  readonly onClick: () => void;
  readonly variant?: 'default' | 'danger';
}

interface OverflowMenuProps {
  readonly items: ReadonlyArray<OverflowMenuItem>;
  /** Extra content rendered inside the popover after the menu items. */
  readonly children?: ReactNode;
}

/**
 * A "..." button that opens a small popover with action items.
 * Used to collapse buttons on narrow screens.
 */
export function OverflowMenu({ items, children }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        className={styles.trigger}
        onClick={toggle}
        aria-label="More options"
        aria-expanded={open}
        type="button"
      >
        &middot;&middot;&middot;
      </button>
      {open && (
        <div className={styles.popover}>
          {items.map((item) => (
            <button
              key={item.label}
              className={item.variant === 'danger' ? styles.itemDanger : styles.item}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          {children}
        </div>
      )}
    </div>
  );
}
