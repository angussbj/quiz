import { type ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineResults } from './InlineResults';
import { OverflowMenu } from './OverflowMenu';
import type { ReviewResult } from './QuizModeProps';
import { IdentifyPromptFields, type PromptField } from './identify/IdentifyPromptFields';
import { useWindowSize } from '@/utilities/useWindowSize';
import { NARROW_WIDTH } from '@/utilities/breakpoints';
import styles from './RecallInputBar.module.css';

interface RecallInputBarProps {
  readonly correctCount: number;
  readonly totalCount: number;

  /** Optional hint fields shown above the input (e.g. flag images in prompted recall). */
  readonly promptFields?: ReadonlyArray<PromptField>;
  /** Inline label before the input (e.g. "4 of 50" in ordered recall). */
  readonly promptLabel?: ReactNode;

  readonly inputValue: string;
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  /** When true, input border briefly turns red to signal a wrong submission. */
  readonly flashIncorrect?: boolean;

  /** If omitted, no Skip button is shown. */
  readonly onSkip?: () => void;
  readonly onGiveUp: () => void;
  readonly onReconfigure: () => void;

  readonly lastMatchedElementId?: string | null;
  readonly lastMatchedAnswer?: string | null;
  /** When set (free recall only), replaces last-answer feedback with an ambiguity hint. */
  readonly ambiguousMessage?: string | null;

  readonly isFinished: boolean;

  readonly reviewing?: boolean;
  readonly reviewResult?: ReviewResult;
}

export function RecallInputBar({
  correctCount,
  totalCount,
  promptFields,
  promptLabel,
  inputValue,
  inputRef,
  onInputChange,
  onKeyDown,
  placeholder,
  flashIncorrect,
  onSkip,
  onGiveUp,
  onReconfigure,
  lastMatchedElementId,
  lastMatchedAnswer,
  ambiguousMessage,
  isFinished,
  reviewing,
  reviewResult,
}: RecallInputBarProps) {
  const { width } = useWindowSize();
  const isNarrow = width < NARROW_WIDTH;
  const overflowItems = useMemo(() => {
    const items: Array<{ label: string; onClick: () => void; variant?: 'default' | 'danger' }> = [];
    if (onSkip) items.push({ label: 'Skip', onClick: onSkip });
    items.push({ label: 'Reconfigure', onClick: onReconfigure });
    items.push({ label: 'Give up', onClick: onGiveUp, variant: 'danger' });
    return items;
  }, [onSkip, onReconfigure, onGiveUp]);
  const progressPercent = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
  const inputClass = flashIncorrect
    ? `${styles.answerInput} ${styles.answerInputIncorrect}`
    : styles.answerInput;

  return (
    <div className={styles.controlsArea}>
      {reviewing ? (
        reviewResult && <InlineResults result={reviewResult} />
      ) : (
        <div className={styles.content}>
          <div className={styles.progressRow}>
            <span className={styles.progressText}>{correctCount}/{totalCount}</span>
            <div className={styles.progressBarTrack}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <span className={styles.progressText}>{Math.round(progressPercent)}%</span>
          </div>

          {promptFields && promptFields.length > 0 && (
            <div className={styles.promptFieldsRow}>
              <IdentifyPromptFields fields={promptFields} />
            </div>
          )}

          {!isFinished && (
            <div className={styles.inputRow}>
              {promptLabel && <span className={styles.promptLabel}>{promptLabel}</span>}
              <input
                ref={inputRef}
                className={inputClass}
                type="text"
                value={inputValue}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {isNarrow ? (
                <OverflowMenu items={overflowItems} />
              ) : (
                <>
                  <button className={styles.reconfigureButton} onClick={onReconfigure} type="button">
                    <span aria-hidden="true">‹</span> Reconfigure
                  </button>
                  {onSkip && (
                    <button className={styles.skipButton} onClick={onSkip} type="button">
                      Skip
                    </button>
                  )}
                  <button className={styles.giveUpButton} onClick={onGiveUp} type="button">
                    Give up
                  </button>
                </>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            {ambiguousMessage ? (
              <motion.div
                key="ambiguous"
                className={styles.ambiguousMessage}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {ambiguousMessage}
              </motion.div>
            ) : (
              <motion.div
                key={lastMatchedElementId ?? 'empty'}
                className={styles.lastAnswer}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: lastMatchedAnswer ? 1 : 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                aria-hidden={!lastMatchedAnswer}
              >
                {lastMatchedAnswer ? `✓ ${lastMatchedAnswer}` : '\u00a0'}
              </motion.div>
            )}
          </AnimatePresence>

          {isFinished && (
            <div className={styles.finishedMessage}>
              <span className={styles.scoreHighlight}>{correctCount}/{totalCount}</span>
              {correctCount === totalCount ? ' — Perfect!' : ' answered'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
