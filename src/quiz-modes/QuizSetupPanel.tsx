import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeType, SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import { resolveToggleConstraints } from './resolveToggleConstraints';
import { TogglePanel, SelectToggleControl, togglePanelStyles } from './TogglePanel';
import { Tooltip } from '@/layout/Tooltip';
import { formatGroupLabel } from './formatGroupLabel';
import styles from './QuizSetupPanel.module.css';

const ORDERING_GROUP = 'ordering';

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
  readonly sortColumns?: ReadonlyArray<SortColumnDefinition>;
  readonly rangeSortColumnKey?: string;
  readonly onRangeSortColumnChange?: (column: string) => void;
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
  readonly dataRows?: ReadonlyArray<Readonly<Record<string, string>>>;
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
  sortColumns,
  rangeSortColumnKey,
  onRangeSortColumnChange,
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
  dataRows,
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

  // Sync forced values into the actual toggle state so that when constraints
  // relax, the toggle retains the value the user saw (not the stale underlying state).
  useEffect(() => {
    for (const [key, value] of Object.entries(constraintResult.forcedValues)) {
      if (toggleValues[key] !== value) {
        onToggleChange(key, value);
      }
    }
  }, [constraintResult.forcedValues, toggleValues, onToggleChange]);

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

  const orderingToggles = useMemo(() => {
    if (!selectToggles) return [];
    return selectToggles.filter(
      (t) => t.group === ORDERING_GROUP && (!t.modes || t.modes.includes(selectedMode)),
    );
  }, [selectToggles, selectedMode]);

  const nonOrderingSelectToggles = useMemo(() => {
    if (!selectToggles) return undefined;
    const filtered = selectToggles.filter((t) => t.group !== ORDERING_GROUP);
    return filtered.length > 0 ? filtered : undefined;
  }, [selectToggles]);

  // Compute which orderBy columns have no missing numeric values, and coverage per column.
  // Used to disable the "Missing values" toggle when it's irrelevant,
  // and to show coverage indicators in the ordering section.
  const { completeColumns, coverageMap } = useMemo(() => {
    const empty = { completeColumns: new Set<string>(), coverageMap: new Map<string, { readonly valid: number; readonly total: number }>() };
    if (!dataRows?.length || orderingToggles.length === 0) return empty;
    const orderByToggle = orderingToggles.find((t) => t.key === 'orderBy');
    if (!orderByToggle) return empty;
    const complete = new Set<string>();
    const coverage = new Map<string, { readonly valid: number; readonly total: number }>();
    // Count only rows that have at least one stat column populated (excludes territories)
    const quizRows = dataRows.filter((row) =>
      orderByToggle.options.some((opt) => {
        const val = row[opt.value];
        return val !== undefined && val !== '' && val !== '-' && !Number.isNaN(Number(val));
      }),
    );
    const total = quizRows.length;
    for (const option of orderByToggle.options) {
      const col = option.value;
      let valid = 0;
      for (const row of quizRows) {
        const val = row[col];
        if (val !== undefined && val !== '' && val !== '-' && !Number.isNaN(Number(val))) {
          valid++;
        }
      }
      if (valid === total) complete.add(col);
      coverage.set(col, { valid, total });
    }
    return { completeColumns: complete, coverageMap: coverage };
  }, [dataRows, orderingToggles]);

  const selectedOrderByColumn = selectValues?.['orderBy']
    ?? orderingToggles.find((t) => t.key === 'orderBy')?.defaultValue;
  const selectedColumnLabel = orderingToggles
    .find((t) => t.key === 'orderBy')?.options
    .find((o) => o.value === selectedOrderByColumn)?.label;
  const orderByHasNoMissing = selectedOrderByColumn
    ? completeColumns.has(selectedOrderByColumn)
    : false;
  const selectedCoverage = selectedOrderByColumn
    ? coverageMap.get(selectedOrderByColumn)
    : undefined;

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

        {orderingToggles.length > 0 && (
          <section className={styles.section}>
            <span className={styles.sectionTitle}>Ordering</span>
            <div className={togglePanelStyles.toggleList}>
              {orderingToggles.map((toggle) => {
                const isMissingToggle = toggle.key === 'missingValues';
                const disabled = isMissingToggle && orderByHasNoMissing;
                const tooltip = disabled && selectedColumnLabel
                  ? `No missing ${selectedColumnLabel.toLowerCase()} values`
                  : undefined;
                const row = (
                  <div
                    key={toggle.key}
                    className={`${togglePanelStyles.selectRow} ${disabled ? togglePanelStyles.toggleRowDisabled : ''}`}
                  >
                    <span className={`${togglePanelStyles.selectLabel} ${disabled ? togglePanelStyles.toggleLabelDisabled : ''}`}>
                      {toggle.label}
                    </span>
                    <SelectToggleControl
                      selectToggle={toggle}
                      value={selectValues?.[toggle.key] ?? toggle.defaultValue}
                      onChange={(value) => {
                        if (!disabled) onSelectChange?.(toggle.key, value);
                      }}
                      disabled={disabled}
                    />
                  </div>
                );
                if (tooltip) {
                  return <Tooltip key={toggle.key} text={tooltip}>{row}</Tooltip>;
                }
                return row;
              })}
            </div>
            {selectedCoverage && selectedCoverage.valid < selectedCoverage.total && (
              <p className={styles.coverageNote}>
                Data present for {selectedCoverage.valid} out of {selectedCoverage.total}
              </p>
            )}
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
              {rangeLabel}
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
              {sortColumns && sortColumns.length > 1 && onRangeSortColumnChange && (
                <>
                  <span className={styles.rangeSeparator}>by</span>
                  <select
                    className={styles.rangeSortSelect}
                    value={rangeSortColumnKey ?? sortColumns[0].column}
                    onChange={(event) => onRangeSortColumnChange(event.target.value)}
                  >
                    {sortColumns.map((col) => (
                      <option key={col.column} value={col.column}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
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
            selectToggles={nonOrderingSelectToggles}
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
