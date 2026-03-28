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
  /** Optional class applied to the trigger button so it can match sibling button styles. */
  readonly triggerClassName?: string;
}

/**
 * A "..." button that opens a small popover with action items.
 * Used to collapse buttons on narrow screens.
 *
 * Uses position: fixed so the popover escapes overflow: hidden containers
 * (the quiz controls area clips overflow to maintain fixed height).
 */
export function OverflowMenu({ items, children, triggerClassName }: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top;
        const popoverEstimate = 140;
        const openDown = spaceAbove < popoverEstimate;
        if (openDown) {
          setPopoverStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
          });
        } else {
          setPopoverStyle({
            position: 'fixed',
            bottom: window.innerHeight - rect.top + 4,
            right: window.innerWidth - rect.right,
          });
        }
      }
      return next;
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
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
        ref={triggerRef}
        className={triggerClassName ?? styles.trigger}
        onClick={toggle}
        aria-label="More options"
        aria-expanded={open}
        type="button"
      >
        &middot;&middot;&middot;
      </button>
      {open && (
        <div className={styles.popover} style={popoverStyle}>
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
