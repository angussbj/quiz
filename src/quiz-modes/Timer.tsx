import { useEffect, useRef, useState } from 'react';
import styles from './Timer.module.css';

export interface TimerProps {
  /** If provided, counts down from this value. Otherwise counts up. */
  readonly countdownSeconds?: number;
  /** Called when countdown reaches zero. Not called in elapsed mode. */
  readonly onExpire?: () => void;
  /** When true, pauses the timer without resetting it. */
  readonly paused?: boolean;
}

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function Timer({ countdownSeconds, onExpire, paused = false }: TimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [expired, setExpired] = useState(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (paused || expired) return;

    const interval = setInterval(() => {
      setElapsedSeconds((previous) => {
        const next = previous + 1;
        if (countdownSeconds !== undefined && next >= countdownSeconds) {
          return countdownSeconds;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, expired, countdownSeconds]);

  useEffect(() => {
    if (
      countdownSeconds !== undefined &&
      elapsedSeconds >= countdownSeconds &&
      !expired
    ) {
      setExpired(true);
      onExpireRef.current?.();
    }
  }, [elapsedSeconds, countdownSeconds, expired]);

  const displaySeconds =
    countdownSeconds !== undefined
      ? Math.max(0, countdownSeconds - elapsedSeconds)
      : elapsedSeconds;

  const timeString = formatTime(displaySeconds);

  return (
    <div
      className={`${styles.timer} ${expired ? styles.expired : ''}`}
      data-expired={expired || undefined}
    >
      <time>{timeString}</time>
    </div>
  );
}

