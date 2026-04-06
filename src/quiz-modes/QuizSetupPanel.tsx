import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { QuizModeType, SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import type { PanelLevel, DifficultyPresets, AdvancedPanelConfig } from './DifficultyPreset';
import type { DropdownOption } from './TogglePanel';
import { resolveToggleConstraints } from './resolveToggleConstraints';
import { TogglePanel, SelectToggleControl, togglePanelStyles, renderGroupedOptions } from './TogglePanel';
import { Tooltip } from '@/layout/Tooltip';
import { formatGroupLabel } from './formatGroupLabel';
import { MODE_DISPLAY_NAMES } from './modeDisplayNames';
import { DifficultySelector } from './DifficultySelector';
import { GroupFilterDropdown } from './GroupFilterDropdown';
import { PanelLevelSwitcher } from './PanelLevelSwitcher';
import { LinkedDataDropdown } from './LinkedDataDropdown';
import styles from './QuizSetupPanel.module.css';

const ORDERING_GROUP = 'ordering';

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
  // Panel level props
  readonly panelLevel: PanelLevel;
  readonly onPanelLevelChange: (level: PanelLevel) => void;
  readonly difficultyPresets?: DifficultyPresets;
  readonly activeDifficultySlot?: number;
  readonly onDifficultySlotChange?: (slot: number) => void;
  readonly advancedPanel?: AdvancedPanelConfig;
  // Simple panel single-select group filter
  readonly simpleGroupFilter?: string | undefined;
  readonly onSimpleGroupFilterChange?: (group: string | undefined) => void;
  // Linked dropdown for Advanced panel
  readonly linkedDropdownLabel?: string;
  readonly linkedDropdownValue?: string;
  readonly linkedDropdownOptions?: ReadonlyArray<DropdownOption>;
  readonly onLinkedDropdownChange?: (value: string) => void;
  readonly linkedDropdownMaxOptions?: number;
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
  panelLevel,
  onPanelLevelChange,
  difficultyPresets,
  activeDifficultySlot,
  onDifficultySlotChange,
  advancedPanel,
  simpleGroupFilter,
  onSimpleGroupFilterChange,
  linkedDropdownLabel,
  linkedDropdownValue,
  linkedDropdownOptions,
  onLinkedDropdownChange,
  linkedDropdownMaxOptions,
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

  // Toggle key sets for Advanced filtering
  const advancedToggleKeySet = useMemo(() => {
    if (!advancedPanel) return undefined;
    const forcedKeys = new Set(Object.keys(advancedPanel.forcedToggles ?? {}));
    return new Set(advancedPanel.toggleKeys.filter((k) => !forcedKeys.has(k)));
  }, [advancedPanel]);

  const advancedSelectToggleKeySet = useMemo(() => {
    if (!advancedPanel) return undefined;
    return new Set(advancedPanel.selectToggleKeys);
  }, [advancedPanel]);

  // Advanced forced values: merge into effective toggles when in Advanced mode
  const advancedForcedValues = useMemo(() => {
    if (panelLevel !== 'advanced' || !advancedPanel?.forcedToggles) return {};
    return advancedPanel.forcedToggles;
  }, [panelLevel, advancedPanel]);

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
    ...advancedForcedValues,
  }), [toggleValues, constraintResult.forcedValues, advancedForcedValues]);

  const disabledKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const key of Object.keys(constraintResult.forcedValues)) {
      keys.add(key);
    }
    for (const key of constraintResult.preventDisable) {
      keys.add(key);
    }
    // In Advanced mode, forced toggles are hidden (not just disabled),
    // but we still mark them disabled for safety
    for (const key of Object.keys(advancedForcedValues)) {
      keys.add(key);
    }
    return keys;
  }, [constraintResult, advancedForcedValues]);

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

  // In Advanced, only show select toggles that are:
  // 1. In the advancedPanel.selectToggleKeys list
  // 2. NOT part of the linked dropdown (those are handled by LinkedDataDropdown)
  const advancedSelectToggles = useMemo(() => {
    if (!nonOrderingSelectToggles || !advancedSelectToggleKeySet) return undefined;
    const linkedKeys = new Set(advancedPanel?.linkedSelectToggleKeys ?? []);
    return nonOrderingSelectToggles.filter(
      (t) => advancedSelectToggleKeySet.has(t.key) && !linkedKeys.has(t.key),
    );
  }, [nonOrderingSelectToggles, advancedSelectToggleKeySet, advancedPanel]);

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

        {/* ALWAYS: Difficulty presets */}
        {difficultyPresets && activeDifficultySlot !== undefined && onDifficultySlotChange && (
          <DifficultySelector
            presets={difficultyPresets}
            activeSlot={activeDifficultySlot}
            onSlotChange={onDifficultySlotChange}
          />
        )}

        {/* SIMPLE ONLY: Group filter dropdown (single-select) */}
        {panelLevel === 'simple' && groupFilterLabel && availableGroups && onSimpleGroupFilterChange && (
          <GroupFilterDropdown
            label={groupFilterLabel}
            groups={availableGroups}
            selectedGroup={simpleGroupFilter}
            onGroupChange={onSimpleGroupFilterChange}
          />
        )}

        {/* ADVANCED+: Mode selector */}
        {panelLevel !== 'simple' && showModeSelector && (
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
                  {MODE_DISPLAY_NAMES[mode]}
                </option>
              ))}
            </select>
          </section>
        )}

        {/* Ordering section: Full only when linked dropdown handles it in Advanced; otherwise Advanced+ */}
        {panelLevel !== 'simple' && orderingToggles.length > 0 && (panelLevel === 'full' || !advancedPanel?.linkedSortToggleKey) && (
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

        {/* ADVANCED+: Range filter */}
        {panelLevel !== 'simple' && rangeLabel && onRangeMinChange && onRangeMaxChange && (
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
                    {sortColumns.some((col) => col.category)
                      ? renderGroupedOptions(sortColumns.map((col) => ({
                        value: col.column,
                        label: col.label,
                        category: col.category,
                      })))
                      : sortColumns.map((col) => (
                        <option key={col.column} value={col.column}>
                          {col.label}
                        </option>
                      ))
                    }
                  </select>
                </>
              )}
            </div>
          </section>
        )}

        {/* ADVANCED+: Group filter chips */}
        {panelLevel !== 'simple' && groupFilterLabel && availableGroups && onGroupToggle && (
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

        {/* ADVANCED ONLY: Linked dropdown */}
        {panelLevel === 'advanced' && linkedDropdownLabel && linkedDropdownOptions && linkedDropdownValue !== undefined && onLinkedDropdownChange && (
          <LinkedDataDropdown
            label={linkedDropdownLabel}
            options={linkedDropdownOptions}
            value={linkedDropdownValue}
            onChange={onLinkedDropdownChange}
            maxOptions={linkedDropdownMaxOptions}
          />
        )}

        {/* ADVANCED: Filtered toggles; FULL: All toggles */}
        {panelLevel !== 'simple' && toggles.length > 0 && (
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
            selectToggles={panelLevel === 'advanced' ? advancedSelectToggles : nonOrderingSelectToggles}
            selectValues={selectValues}
            onSelectChange={onSelectChange}
            visibleKeys={panelLevel === 'advanced' ? advancedToggleKeySet : undefined}
            visibleSelectKeys={panelLevel === 'advanced' ? advancedSelectToggleKeySet : undefined}
          />
        )}

        {/* ADVANCED+: Timer */}
        {panelLevel !== 'simple' && (
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
        )}

        {/* ALWAYS: Panel level switcher */}
        <PanelLevelSwitcher level={panelLevel} onLevelChange={onPanelLevelChange} />

        {/* ALWAYS: Empty quiz warning */}
        {isEmptyQuiz && (
          <p className={styles.emptyWarning}>
            No items match the current filters. Adjust your selection above.
          </p>
        )}

        {/* ALWAYS: Start button */}
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
