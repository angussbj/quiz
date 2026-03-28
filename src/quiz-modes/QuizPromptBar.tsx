import { type ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { IdentifyPromptFields, type PromptField } from './identify/IdentifyPromptFields';
import { OverflowMenu } from './OverflowMenu';
import { useWindowSize } from '@/utilities/useWindowSize';
import { NARROW_WIDTH } from '@/utilities/breakpoints';
import styles from './QuizPromptBar.module.css';

interface QuizPromptBarProps {
  /** Changes when the prompt changes — triggers the highlight colour animation. */
  readonly promptKey: string;
  /** The prompt content, e.g. <>Click on <strong>Paris</strong></> */
  readonly prompt: ReactNode;
  /** Shorter version shown when the full prompt would wrap, e.g. <strong>Paris</strong>. */
  readonly shortPrompt?: ReactNode;
  /** Optional subtitle shown below the prompt in smaller text, e.g. "(and tributaries)". */
  readonly promptSubtitle?: string;
  /** Optional extra hint fields shown above the prompt (e.g. flag images). */
  readonly promptFields?: ReadonlyArray<PromptField>;
  /** Position counter shown to the left of the prompt, e.g. "3/10". */
  readonly counter?: string;
  readonly progressCurrent: number;
  readonly progressTotal: number;
  /** Score shown between the prompt and the buttons, e.g. "3/5 correct". */
  readonly scoreLabel?: string;
  readonly onSkip: () => void;
  readonly onGiveUp: () => void;
  readonly onReconfigure: () => void;
  readonly isFinished: boolean;
  /** Replaces the prompt + controls when the quiz is finished. */
  readonly finishedContent?: ReactNode;
}

export function QuizPromptBar({
  promptKey,
  prompt,
  shortPrompt,
  promptSubtitle,
  promptFields,
  counter,
  progressCurrent,
  progressTotal,
  scoreLabel,
  onSkip,
  onGiveUp,
  onReconfigure,
  isFinished,
  finishedContent,
}: QuizPromptBarProps) {
  const { width } = useWindowSize();
  const isNarrow = width < NARROW_WIDTH;
  const overflowItems = useMemo(() => [
    { label: 'Skip', onClick: onSkip },
    { label: 'Reconfigure', onClick: onReconfigure },
    { label: 'Give up', onClick: onGiveUp, variant: 'danger' as const },
  ], [onSkip, onReconfigure, onGiveUp]);
  const progressPercent = progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;

  // When the full prompt text overflows its container (white-space: nowrap + overflow: hidden),
  // switch to the shorter version. On each new prompt we reset to full text, measure on the
  // next layout, and switch to short if it overflows. The full text is never visually visible
  // in the overflow state because the CSS clips it.
  const promptRef = useRef<HTMLSpanElement>(null);
  const [useShort, setUseShort] = useState(false);
  const prevKeyRef = useRef(promptKey);

  // Reset to full text whenever the prompt changes so we can re-measure.
  if (prevKeyRef.current !== promptKey) {
    prevKeyRef.current = promptKey;
    setUseShort(false);
  }

  const checkOverflow = useCallback(() => {
    const el = promptRef.current;
    if (!el || !shortPrompt) return;
    // Only switch to short if we're currently showing the full text.
    // scrollWidth > clientWidth means the text overflows its container.
    if (!useShort && el.scrollWidth > el.clientWidth + 1) {
      setUseShort(true);
    }
  }, [shortPrompt, useShort]);

  useLayoutEffect(() => {
    checkOverflow();
  }, [checkOverflow]);

  useLayoutEffect(() => {
    const el = promptRef.current?.closest(`.${styles.bar}`);
    if (!el || !shortPrompt) return;
    const observer = new ResizeObserver(() => {
      const promptEl = promptRef.current;
      if (!promptEl) return;
      // When the container grows, we might be able to fit the full text again.
      // When it shrinks, we might need to switch to short.
      // We can only check overflow when showing the full text, so if currently
      // showing short and the container grows, we can't easily know if full would fit.
      // For simplicity: only shrink → short transitions happen automatically.
      // Growing back requires a new prompt (promptKey change).
      if (promptEl.scrollWidth > promptEl.clientWidth + 1) {
        setUseShort(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [shortPrompt]);

  return (
    <>
      <div className={styles.bar}>
        {isFinished ? (
          <div className={styles.finishedWrapper}>{finishedContent}</div>
        ) : (
          <>
            <div className={styles.promptArea}>
              {promptFields && promptFields.length > 0 && (
                <IdentifyPromptFields fields={promptFields} />
              )}
              <div className={styles.prompt}>
                <span ref={promptRef} key={promptKey} className={styles.promptText}>
                  {useShort ? shortPrompt : prompt}
                  {promptSubtitle && <span className={styles.promptSubtitle}>{promptSubtitle}</span>}
                </span>
              </div>
            </div>
            {isNarrow ? (
              <OverflowMenu items={overflowItems} />
            ) : (
              <div className={styles.trailing}>
                {scoreLabel && <span className={styles.scoreLabel}>{scoreLabel}</span>}
                <button className={styles.reconfigureButton} onClick={onReconfigure} type="button">
                  <span aria-hidden="true">‹</span> Reconfigure
                </button>
                <button className={styles.skipButton} onClick={onSkip} type="button">
                  Skip
                </button>
                <button className={styles.giveUpButton} onClick={onGiveUp} type="button">
                  Give up
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className={styles.progressRow}>
        {counter && <span className={styles.counter}>{counter}</span>}
        <div className={styles.progressStrip}>
          <motion.div
            className={styles.progressFill}
            initial={{ width: '0%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </>
  );
}
