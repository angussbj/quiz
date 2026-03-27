import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { IdentifyPromptFields, type PromptField } from './identify/IdentifyPromptFields';
import styles from './QuizPromptBar.module.css';

interface QuizPromptBarProps {
  /** Changes when the prompt changes — triggers the highlight colour animation. */
  readonly promptKey: string;
  /** The prompt content, e.g. <>Click on <strong>Paris</strong></> */
  readonly prompt: ReactNode;
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
  const progressPercent = progressTotal > 0 ? (progressCurrent / progressTotal) * 100 : 0;

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
                <span key={promptKey} className={styles.promptText}>
                  {prompt}
                  {promptSubtitle && <span className={styles.promptSubtitle}>{promptSubtitle}</span>}
                </span>
              </div>
            </div>
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
