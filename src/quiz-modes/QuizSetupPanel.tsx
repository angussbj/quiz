import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import { resolveToggleConstraints } from './resolveToggleConstraints';
import { TogglePanel } from './TogglePanel';
import { formatGroupLabel } from './formatGroupLabel';
import styles from './QuizSetupPanel.module.css';

const MODE_LABELS: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Free Recall',
  'free-recall-ordered': 'Ordered Recall',
  'identify': 'Identify',
  'locate': 'Locate',
  'prompted-recall': 'Prompted Recall',
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
  readonly rangeLabel?: string;
  readonly rangeMax?: number;
  readonly rangeMinValue?: number;
  readonly rangeMaxValue?: number;
  readonly onRangeMinChange?: (value: number | undefined) => void;
  readonly onRangeMaxChange?: (value: number | undefined) => void;
  readonly groupFilterLabel?: string;
  readonly availableGroups?: ReadonlyArray<string>;
  readonly selectedGroups?: ReadonlySet<string>;
  readonly onGroupToggle?: (group: string) => void;
  readonly onGroupSelectAll?: () => void;
  readonly onGroupDeselectAll?: () => void;
  readonly filteredElementCount?: number;
  readonly onStart: () => void;
  readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
  readonly selectToggles?: ReadonlyArray<SelectToggleDefinition>;
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly onSelectChange?: (key: string, value: string) => void;
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
  rangeLabel,
  rangeMax,
  rangeMinValue,
  rangeMaxValue,
  onRangeMinChange,
  onRangeMaxChange,
  groupFilterLabel,
  availableGroups,
  selectedGroups,
  onGroupToggle,
  onGroupSelectAll,
  onGroupDeselectAll,
  filteredElementCount,
  onStart,
  modeConstraints,
  selectToggles,
  selectValues,
  onSelectChange,
}: QuizSetupPanelProps) {
  const showModeSelector = availableModes.length > 1;

  const activeConstraints = useMemo(
    () => modeConstraints?.[selectedMode] ?? [],
    [modeConstraints, selectedMode],
  );
  const constraintResult = useMemo(
    () => resolveToggleConstraints(activeConstraints, toggleValues, selectValues),
    [activeConstraints, toggleValues, selectValues],
  );

  // Merge forced values into the displayed toggle values
  const effectiveToggleValues = useMemo(() => ({
    ...toggleValues,
    ...constraintResult.forcedValues,
  }), [toggleValues, constraintResult.forcedValues]);

  const disabledKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const key of Object.keys(constraintResult.forcedValues)) {
      keys.add(key);
    }
    for (const key of constraintResult.preventDisable) {
      keys.add(key);
    }
    return keys;
  }, [constraintResult]);

  const allGroupsSelected = availableGroups && selectedGroups
    && selectedGroups.size === availableGroups.length;
  const noGroupsSelected = selectedGroups && selectedGroups.size === 0;
  const isEmptyQuiz = filteredElementCount === 0;

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

        {rangeLabel && onRangeMinChange && onRangeMaxChange && (
          <section className={styles.section}>
            <span className={styles.sectionTitle}>
              {rangeLabel} range
            </span>
            <div className={styles.rangeRow}>
              <input
                type="text"
                inputMode="numeric"
                className={styles.rangeInput}
                placeholder="1"
                value={rangeMinValue ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') {
                    onRangeMinChange(undefined);
                    return;
                  }
                  const parsed = parseInt(raw, 10);
                  if (!Number.isNaN(parsed)) {
                    onRangeMinChange(Math.max(1, parsed));
                  }
                }}
              />
              <span className={styles.rangeSeparator}>to</span>
              <input
                type="text"
                inputMode="numeric"
                className={styles.rangeInput}
                placeholder={rangeMax !== undefined ? String(rangeMax) : ''}
                value={rangeMaxValue ?? ''}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === '') {
                    onRangeMaxChange(undefined);
                    return;
                  }
                  const parsed = parseInt(raw, 10);
                  if (!Number.isNaN(parsed)) {
                    onRangeMaxChange(Math.min(parsed, rangeMax ?? parsed));
                  }
                }}
              />
            </div>
          </section>
        )}

        {groupFilterLabel && availableGroups && onGroupToggle && (
          <section className={styles.section}>
            <span className={styles.sectionTitle}>
              {groupFilterLabel}
            </span>
            <div className={styles.groupChipsBulkActions}>
              {!allGroupsSelected && onGroupSelectAll && (
                <button
                  type="button"
                  className={styles.bulkActionButton}
                  onClick={onGroupSelectAll}
                >
                  Select all
                </button>
              )}
              {!noGroupsSelected && onGroupDeselectAll && (
                <button
                  type="button"
                  className={styles.bulkActionButton}
                  onClick={onGroupDeselectAll}
                >
                  Deselect all
                </button>
              )}
            </div>
            <div className={styles.groupChips} role="group" aria-label={groupFilterLabel}>
              {availableGroups.map((group) => {
                const selected = selectedGroups?.has(group) ?? false;
                return (
                  <button
                    key={group}
                    type="button"
                    className={`${styles.groupChip} ${selected ? styles.groupChipSelected : ''}`}
                    onClick={() => onGroupToggle(group)}
                    aria-pressed={selected}
                  >
                    {formatGroupLabel(group)}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {toggles.length > 0 && (
          <TogglePanel
            toggles={toggles}
            presets={presets}
            values={effectiveToggleValues}
            activePreset={activePreset}
            onChange={onToggleChange}
            onPreset={onPreset}
            disabledKeys={disabledKeys}
            tooltips={constraintResult.reasons}
            selectedMode={selectedMode}
            selectToggles={selectToggles}
            selectValues={selectValues}
            onSelectChange={onSelectChange}
          />
        )}

        {isEmptyQuiz && (
          <p className={styles.emptyWarning}>
            No items match the current filters. Adjust your selection above.
          </p>
        )}

        <div className={styles.startButtonWrapper}>
          <motion.button
            className={styles.startButton}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
            disabled={isEmptyQuiz}
          >
            Start Quiz
          </motion.button>
        </div>
      </div>
    </div>
  );
}
