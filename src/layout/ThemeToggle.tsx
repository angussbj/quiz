import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import styles from './ThemeToggle.module.css';

const cycleOrder: ReadonlyArray<ThemePreference> = ['light', 'dark', 'system'];

const labels: Readonly<Record<ThemePreference, string>> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
};

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

/** True on touch-primary devices (phones/tablets), false on mouse-primary (desktops). */
const isTouchDevice =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  function handleClick() {
    const currentIndex = cycleOrder.indexOf(preference);
    const nextIndex = (currentIndex + 1) % cycleOrder.length;
    setPreference(cycleOrder[nextIndex]);
  }

  const Icon = preference === 'system'
    ? (isTouchDevice ? PhoneIcon : MonitorIcon)
    : preference === 'light' ? SunIcon : MoonIcon;

  return (
    <button
      className={styles.button}
      onClick={handleClick}
      aria-label={labels[preference]}
      title={labels[preference]}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={preference}
          className={styles.iconWrapper}
          initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <Icon />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
