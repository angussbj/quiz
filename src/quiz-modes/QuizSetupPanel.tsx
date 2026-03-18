import { motion } from 'framer-motion';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import { TogglePanel } from './TogglePanel';
import styles from './QuizSetupPanel.module.css';

const MODE_LABELS: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Free Recall',
  'free-recall-ordered': 'Ordered Recall',
  'identify': 'Identify',
  'locate': 'Locate',
  'multiple-choice': 'Multiple Choice',
};

export interface QuizSetupPanelProps {
  readonly title: string;
  readonly description?: string;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly selectedMode: QuizModeType;
  readonly onModeChange: (mode: QuizModeType) => void;
  readonly countdownMinutes: number | undefined;
  readonly onCountdownChange: (minutes: number | undefined) => void;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onToggleChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
  readonly onStart: () => void;
}

export function QuizSetupPanel({
  title,
  description,
  availableModes,
  selectedMode,
  onModeChange,
  countdownMinutes,
  onCountdownChange,
  toggles,
  presets,
  toggleValues,
  activePreset,
  onToggleChange,
  onPreset,
  onStart,
}: QuizSetupPanelProps) {
  const showModeSelector = availableModes.length > 1;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}

        {showModeSelector && (
          <section className={styles.section}>
            <label className={styles.sectionTitle} htmlFor="mode-select">
              Mode
            </label>
            <select
              id="mode-select"
              className={styles.modeSelect}
              value={selectedMode}
              onChange={(event) => {
                const mode = availableModes.find((m) => m === event.target.value);
                if (mode) onModeChange(mode);
              }}
            >
              {availableModes.map((mode) => (
                <option key={mode} value={mode}>
                  {MODE_LABELS[mode]}
                </option>
              ))}
            </select>
          </section>
        )}

        <section className={styles.section}>
          <span className={styles.sectionTitle} id="countdown-label">
            Time limit
          </span>
          <div className={styles.timerRow}>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="Decrease time limit"
              onClick={() => {
                if (countdownMinutes === undefined || countdownMinutes <= 1) {
                  onCountdownChange(undefined);
                } else {
                  onCountdownChange(countdownMinutes - 1);
                }
              }}
            >
              −
            </button>
            <input
              id="countdown-input"
              type="text"
              inputMode="numeric"
              className={styles.timerInput}
              aria-labelledby="countdown-label"
              placeholder="—"
              value={countdownMinutes ?? ''}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === '') {
                  onCountdownChange(undefined);
                  return;
                }
                const parsed = parseInt(raw, 10);
                if (!Number.isNaN(parsed)) {
                  onCountdownChange(Math.max(1, parsed));
                }
              }}
            />
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="Increase time limit"
              onClick={() => {
                onCountdownChange((countdownMinutes ?? 0) + 1);
              }}
            >
              +
            </button>
            <span className={styles.timerLabel}>minutes</span>
          </div>
        </section>

        {toggles.length > 0 && (
          <TogglePanel
            toggles={toggles}
            presets={presets}
            values={toggleValues}
            activePreset={activePreset}
            onChange={onToggleChange}
            onPreset={onPreset}
          />
        )}

        <motion.button
          className={styles.startButton}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
        >
          Start Quiz
        </motion.button>
      </div>
    </div>
  );
}
