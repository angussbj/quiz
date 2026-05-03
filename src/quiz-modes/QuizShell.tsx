import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizModeType, SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import type { DifficultyPresets, AdvancedPanelConfig } from './DifficultyPreset';
import { resolveToggleConstraints } from './resolveToggleConstraints';
import { QuizSetupPanel } from './QuizSetupPanel';
import { useToggleState } from './useToggleState';
import { countFilteredElements, countFilteredElementsFromElements } from './countFilteredElements';
import { useQuizActiveRegister } from './QuizActiveContext';
import { usePanelLevel } from '@/persistence/usePanelLevel';
import { useQuizSetupPersistence } from '@/persistence/useQuizSetupPersistence';
import styles from './QuizShell.module.css';

export interface ElementRange {
  readonly min: number;
  readonly max: number;
}

export interface QuizConfig {
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectValues: Readonly<Record<string, string>>;
  readonly selectedMode: QuizModeType;
  readonly countdownSeconds: number | undefined;
  readonly elementRange: ElementRange | undefined;
  readonly selectedGroups: ReadonlySet<string> | undefined;
  readonly onReconfigure: () => void;
}

interface QuizShellProps {
  readonly quizId: string;
  readonly title: string;
  readonly description?: string;
  readonly difficultyPresets?: DifficultyPresets;
  readonly advancedPanel?: AdvancedPanelConfig;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly defaultMode: QuizModeType;
  readonly defaultCountdownSeconds?: number;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly selectToggles?: ReadonlyArray<SelectToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
  readonly rangeColumn?: string;
  readonly rangeLabel?: string;
  readonly rangeMax?: number;
  /** Sort columns for range dropdown and ordered recall. When present, replaces rangeColumn. */
  readonly sortColumns?: ReadonlyArray<SortColumnDefinition>;
  readonly groupFilterColumn?: string;
  readonly groupFilterLabel?: string;
  readonly availableGroups?: ReadonlyArray<string>;
  readonly elements?: ReadonlyArray<VisualizationElement>;
  readonly dataRows?: ReadonlyArray<Readonly<Record<string, string>>>;
  /** Merge columns for accurate count preview with sort-value ranking. */
  readonly tributaryColumn?: string;
  readonly distributaryColumn?: string;
  readonly segmentColumn?: string;
  readonly toggleControlledFilter?: {
    readonly toggleKey: string;
    readonly column: string;
    readonly values: ReadonlyArray<string>;
  };
  /** Key of the select toggle that drives dynamic grouping (if any). */
  readonly dynamicGroupingKey?: string;
  /** Called when the dynamic grouping select toggle changes value. */
  readonly onGroupByChange?: (value: string) => void;
  readonly children: (config: QuizConfig) => ReactNode;
}

type ShellPhase = 'configuring' | 'active';

/**
 * Wraps a quiz mode with configuration.
 * Shows a setup screen (mode, timer, toggles) before the quiz starts.
 * Provides a "Reconfigure" button that resets quiz state.
 */
export function QuizShell({
  quizId,
  title,
  description,
  difficultyPresets,
  advancedPanel,
  availableModes,
  defaultMode,
  defaultCountdownSeconds,
  toggles,
  selectToggles,
  presets,
  modeConstraints,
  rangeColumn,
  rangeLabel,
  rangeMax,
  sortColumns,
  groupFilterColumn,
  groupFilterLabel,
  availableGroups,
  elements,
  dataRows,
  tributaryColumn,
  distributaryColumn,
  segmentColumn,
  toggleControlledFilter,
  dynamicGroupingKey,
  onGroupByChange,
  children,
}: QuizShellProps) {
  const [phase, setPhase] = useState<ShellPhase>('configuring');
  const [quizKey, setQuizKey] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const [selectedMode, setSelectedMode] = useState<QuizModeType>(defaultMode);
  const [countdownMinutes, setCountdownMinutes] = useState<number | undefined>(
    defaultCountdownSeconds !== undefined ? Math.ceil(defaultCountdownSeconds / 60) : undefined,
  );
  const [rangeMin, setRangeMin] = useState<number | undefined>(undefined);
  const [rangeMaxValue, setRangeMaxValue] = useState<number | undefined>(undefined);
  const [rangeSortColumnKey, setRangeSortColumnKey] = useState<string | undefined>(
    sortColumns?.[0]?.column,
  );
  const [selectedGroups, setSelectedGroups] = useState<ReadonlySet<string>>(
    () => new Set(availableGroups ?? []),
  );
  const toggleState = useToggleState(toggles, presets, selectToggles);

  const { panelLevel, setPanelLevel } = usePanelLevel();
  const defaultSetupState = useMemo(() => ({
    difficultySlot: 0,
    mode: defaultMode,
    toggleValues: toggleState.values,
    selectValues: toggleState.selectValues,
    rangeMin: undefined,
    rangeMax: undefined,
    selectedGroups: availableGroups ? Array.from(availableGroups) : [],
  }), []); // eslint-disable-line react-hooks/exhaustive-deps -- only need initial defaults
  const { setupState: savedState, setSetupState: saveSetup } = useQuizSetupPersistence(quizId, defaultSetupState);

  const [selectedDifficultySlot, setSelectedDifficultySlot] = useState<number>(0);

  // When dynamic grouping changes the available groups, reset selected groups to include all
  const prevGroupsRef = useRef(availableGroups);
  useEffect(() => {
    if (availableGroups !== prevGroupsRef.current) {
      prevGroupsRef.current = availableGroups;
      setSelectedGroups(new Set(availableGroups ?? []));
    }
  }, [availableGroups]);

  // Wrap select toggle changes to intercept dynamic grouping key changes
  const handleSelectChange = useCallback((key: string, value: string) => {
    toggleState.setSelect(key, value);
    if (key === dynamicGroupingKey && onGroupByChange) {
      onGroupByChange(value);
    }
  }, [toggleState.setSelect, dynamicGroupingKey, onGroupByChange]);

  const handleGroupToggle = useCallback((group: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const handleGroupSelectAll = useCallback(() => {
    setSelectedGroups(new Set(availableGroups ?? []));
  }, [availableGroups]);

  const handleGroupDeselectAll = useCallback(() => {
    setSelectedGroups(new Set<string>());
  }, []);

  // Derive whether current state still matches the selected difficulty preset.
  // Returns the slot index if it matches, undefined if settings have been manually changed.
  const activeDifficultySlot = useMemo(() => {
    if (!difficultyPresets) return undefined;
    const preset = difficultyPresets.slots[selectedDifficultySlot];
    if (!preset) return undefined;
    // Mode must match
    if (selectedMode !== preset.mode) return undefined;
    // All toggle overrides must match
    if (preset.toggleOverrides) {
      for (const [key, value] of Object.entries(preset.toggleOverrides)) {
        if (toggleState.values[key] !== value) return undefined;
      }
    }
    // All select toggle overrides must match
    if (preset.selectToggleOverrides) {
      for (const [key, value] of Object.entries(preset.selectToggleOverrides)) {
        if (toggleState.selectValues[key] !== value) return undefined;
      }
    }
    // Range max must match (if specified)
    if (preset.rangeMaxOverride !== undefined && rangeMaxValue !== preset.rangeMaxOverride) {
      return undefined;
    }
    return selectedDifficultySlot;
  }, [difficultyPresets, selectedDifficultySlot, selectedMode, toggleState.values, toggleState.selectValues, rangeMaxValue]);

  const handleSimpleGroupFilterChange = useCallback((group: string | undefined) => {
    if (group) {
      setSelectedGroups(new Set([group]));
    } else {
      setSelectedGroups(new Set(availableGroups ?? []));
    }
  }, [availableGroups]);

  const activeSortColumn = useMemo(() => {
    if (!sortColumns?.length) return undefined;
    return sortColumns.find((c) => c.column === rangeSortColumnKey) ?? sortColumns[0];
  }, [sortColumns, rangeSortColumnKey]);

  // Dynamic range max: number of rankable elements with current sort column, merge state, and group filter.
  // Used as the placeholder in the range max input when sort columns are active.
  const dynamicRangeMax = useMemo(() => {
    if (!activeSortColumn || !elements || !dataRows) return undefined;
    return countFilteredElementsFromElements(
      elements, dataRows, toggleState.values, activeSortColumn,
      undefined, undefined, // no range limits — count all rankable elements
      groupFilterColumn, groupFilterColumn ? selectedGroups : undefined,
      tributaryColumn, distributaryColumn, segmentColumn,
      activeSortColumn.rankDescending ?? false,
      toggleControlledFilter,
    );
  }, [elements, dataRows, activeSortColumn, toggleState.values, groupFilterColumn, selectedGroups, tributaryColumn, distributaryColumn, segmentColumn, toggleControlledFilter]);

  const effectiveRangeMax = dynamicRangeMax ?? rangeMax;

  const filteredCount = useMemo(() => {
    if (!dataRows) return undefined;
    // Use element-based counting when sort columns are available (accurate with merge state)
    if (activeSortColumn && elements) {
      return countFilteredElementsFromElements(
        elements, dataRows, toggleState.values, activeSortColumn,
        rangeMin, rangeMaxValue,
        groupFilterColumn, groupFilterColumn ? selectedGroups : undefined,
        tributaryColumn, distributaryColumn, segmentColumn,
        activeSortColumn.rankDescending ?? false,
        toggleControlledFilter,
      );
    }
    return countFilteredElements(
      dataRows, rangeColumn, rangeMin, rangeMaxValue, effectiveRangeMax,
      groupFilterColumn, groupFilterColumn ? selectedGroups : undefined,
    );
  }, [dataRows, elements, activeSortColumn, toggleState.values, rangeColumn, rangeMin, rangeMaxValue, effectiveRangeMax, groupFilterColumn, selectedGroups, tributaryColumn, distributaryColumn, segmentColumn]);

  const applyModeConstraints = useCallback((mode: QuizModeType) => {
    const constraints = modeConstraints?.[mode] ?? [];
    for (const constraint of constraints) {
      if (constraint.type === 'forced') {
        toggleState.set(constraint.key, constraint.forcedValue);
      }
    }
  }, [modeConstraints, toggleState]);

  const handleDifficultySlotChange = useCallback((slot: number) => {
    setSelectedDifficultySlot(slot);
    if (!difficultyPresets) return;
    const preset = difficultyPresets.slots[slot];
    setSelectedMode(preset.mode);
    applyModeConstraints(preset.mode);
    toggleState.applyDifficulty(preset);
    if (preset.rangeMaxOverride !== undefined) {
      setRangeMaxValue(preset.rangeMaxOverride);
    }
  }, [difficultyPresets, applyModeConstraints, toggleState]);

  // Apply initial state on first render: restore saved difficulty slot or apply defaults
  const hasAppliedInitial = useRef(false);
  useEffect(() => {
    if (hasAppliedInitial.current) return;
    hasAppliedInitial.current = true;

    const initialSlot = savedState.difficultySlot ?? 0;
    setSelectedDifficultySlot(initialSlot);

    if (difficultyPresets) {
      const preset = difficultyPresets.slots[initialSlot];
      setSelectedMode(preset.mode);
      applyModeConstraints(preset.mode);
      toggleState.applyDifficulty(preset);
      if (preset.rangeMaxOverride !== undefined) {
        setRangeMaxValue(preset.rangeMaxOverride);
      }
    } else {
      applyModeConstraints(defaultMode);
    }
  }, [savedState, difficultyPresets, defaultMode, applyModeConstraints, toggleState]);

  const handleModeChange = useCallback((newMode: QuizModeType) => {
    setSelectedMode(newMode);
    applyModeConstraints(newMode);
  }, [applyModeConstraints]);

  const isSortMode = selectedMode === 'free-recall-ordered';

  const linkedDropdownLabel = useMemo(() => {
    if (!advancedPanel?.linkedSelectToggleKeys) return undefined;
    return isSortMode ? 'Sort order' : 'Display data';
  }, [advancedPanel, isSortMode]);

  // In "Sort order" mode, use the sort toggle's options (includes atomic_number etc.).
  // In "Display data" mode, use the primary linked select toggle's options.
  // Filter out values that only exist in secondary toggles (e.g., 'region' in countryColors).
  const linkedDropdownOptions = useMemo(() => {
    if (!advancedPanel?.linkedSelectToggleKeys?.length || !selectToggles) return undefined;

    if (isSortMode && advancedPanel.linkedSortToggleKey) {
      const sortToggle = selectToggles.find((t) => t.key === advancedPanel.linkedSortToggleKey);
      if (sortToggle) return sortToggle.options;
    }

    const primaryKey = advancedPanel.linkedSelectToggleKeys[0];
    const toggle = selectToggles.find((t) => t.key === primaryKey);
    if (!toggle) return undefined;
    return toggle.options;
  }, [advancedPanel, selectToggles, isSortMode]);

  // The linked dropdown value. In sort mode, read from the sort toggle;
  // in display mode, read from the primary linked toggle.
  const linkedDropdownValue = useMemo(() => {
    if (!advancedPanel?.linkedSelectToggleKeys?.length) return undefined;

    if (isSortMode && advancedPanel.linkedSortToggleKey) {
      return toggleState.selectValues[advancedPanel.linkedSortToggleKey] ?? 'none';
    }

    const primaryKey = advancedPanel.linkedSelectToggleKeys[0];
    return toggleState.selectValues[primaryKey] ?? 'none';
  }, [advancedPanel, toggleState.selectValues, isSortMode]);

  const handleLinkedDropdownChange = useCallback((value: string) => {
    if (!advancedPanel?.linkedSelectToggleKeys) return;

    // Check for per-value overrides (e.g., atomic_number → category colors, no data)
    const overrides = advancedPanel.linkedValueOverrides?.[value];

    for (const key of advancedPanel.linkedSelectToggleKeys) {
      const overrideValue = overrides?.[key];
      toggleState.setSelect(key, overrideValue ?? value);
    }

    if (isSortMode && advancedPanel.linkedSortToggleKey) {
      const overrideValue = overrides?.[advancedPanel.linkedSortToggleKey];
      toggleState.setSelect(advancedPanel.linkedSortToggleKey, overrideValue ?? value);
    }
  }, [advancedPanel, toggleState, isSortMode]);

  // Push a history entry when starting so the browser back button returns to setup.
  const handleStart = useCallback(() => {
    saveSetup({
      difficultySlot: selectedDifficultySlot,
      mode: selectedMode,
      toggleValues: toggleState.values,
      selectValues: toggleState.selectValues,
      rangeMax: rangeMaxValue,
      rangeMin,
      selectedGroups: selectedGroups ? Array.from(selectedGroups) : [],
    });
    history.pushState({}, '');
    setPhase('active');
  }, [saveSetup, selectedDifficultySlot, selectedMode, toggleState.values, toggleState.selectValues, rangeMaxValue, rangeMin, selectedGroups]);

  // Reconfigure/Try Again pops the history entry pushed by handleStart.
  // The popstate listener below handles the actual state reset.
  const handleReconfigure = useCallback(() => {
    history.back();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (phaseRef.current === 'active') {
        setPhase('configuring');
        setQuizKey((prev) => prev + 1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Whether group filtering is active (not all groups selected)
  const hasGroupFilter = groupFilterColumn && availableGroups
    && selectedGroups.size < availableGroups.length;

  // Apply constraint resolution so forced values (e.g. from atLeastOne) are included in quiz config
  const effectiveToggleValues = useMemo(() => {
    const activeConstraints = modeConstraints?.[selectedMode] ?? [];
    const result = resolveToggleConstraints(activeConstraints, toggleState.values, toggleState.selectValues);
    if (Object.keys(result.forcedValues).length === 0) return toggleState.values;
    return { ...toggleState.values, ...result.forcedValues };
  }, [modeConstraints, selectedMode, toggleState.values, toggleState.selectValues]);

  // Include range sort column in select values so ActiveQuiz can read it
  const effectiveSelectValues = useMemo(() => {
    if (!rangeSortColumnKey) return toggleState.selectValues;
    return { ...toggleState.selectValues, rangeSortColumn: rangeSortColumnKey };
  }, [toggleState.selectValues, rangeSortColumnKey]);

  const { setQuizActive, clearQuizActive } = useQuizActiveRegister();
  useEffect(() => {
    if (phase === 'active') {
      setQuizActive(handleReconfigure);
    } else {
      clearQuizActive();
    }
    return () => clearQuizActive();
  }, [phase, handleReconfigure, setQuizActive, clearQuizActive]);

  if (phase === 'configuring') {
    return (
      <QuizSetupPanel
        title={title}
        description={description}
        availableModes={availableModes}
        selectedMode={selectedMode}
        onModeChange={handleModeChange}
        countdownMinutes={countdownMinutes}
        onCountdownChange={setCountdownMinutes}
        toggles={toggles}
        presets={presets}
        toggleValues={toggleState.values}
        activePreset={toggleState.activePreset}
        onToggleChange={toggleState.set}
        onPreset={toggleState.applyPreset}
        rangeLabel={(rangeColumn || sortColumns?.length) ? rangeLabel : undefined}
        rangeMax={effectiveRangeMax}
        sortColumns={sortColumns}
        rangeSortColumnKey={rangeSortColumnKey}
        onRangeSortColumnChange={setRangeSortColumnKey}
        rangeMinValue={rangeMin}
        rangeMaxValue={rangeMaxValue}
        onRangeMinChange={setRangeMin}
        onRangeMaxChange={setRangeMaxValue}
        groupFilterLabel={groupFilterColumn ? groupFilterLabel : undefined}
        availableGroups={availableGroups}
        selectedGroups={selectedGroups}
        onGroupToggle={handleGroupToggle}
        onGroupSelectAll={handleGroupSelectAll}
        onGroupDeselectAll={handleGroupDeselectAll}
        filteredElementCount={filteredCount}
        onStart={handleStart}
        modeConstraints={modeConstraints}
        selectToggles={selectToggles}
        selectValues={toggleState.selectValues}
        onSelectChange={handleSelectChange}
        dataRows={dataRows}
        panelLevel={panelLevel}
        onPanelLevelChange={setPanelLevel}
        difficultyPresets={difficultyPresets}
        activeDifficultySlot={activeDifficultySlot}
        onDifficultySlotChange={handleDifficultySlotChange}
        advancedPanel={advancedPanel}
        onSimpleGroupFilterChange={handleSimpleGroupFilterChange}
        linkedDropdownLabel={linkedDropdownLabel}
        linkedDropdownValue={linkedDropdownValue}
        linkedDropdownOptions={linkedDropdownOptions}
        onLinkedDropdownChange={handleLinkedDropdownChange}
        linkedDropdownMaxOptions={advancedPanel?.linkedDropdownMaxOptions}
      />
    );
  }

  const elementRange = rangeMin !== undefined || rangeMaxValue !== undefined
    ? { min: rangeMin ?? 1, max: rangeMaxValue ?? (effectiveRangeMax ?? 999) }
    : undefined;

  const config: QuizConfig = {
    toggleValues: effectiveToggleValues,
    selectValues: effectiveSelectValues,
    selectedMode,
    countdownSeconds: countdownMinutes !== undefined ? countdownMinutes * 60 : undefined,
    elementRange,
    selectedGroups: hasGroupFilter ? selectedGroups : undefined,
    onReconfigure: handleReconfigure,
  };

  return (
    <div className={styles.quizContainer}>
      <div key={quizKey} className={styles.quizContent}>
        {children(config)}
      </div>
    </div>
  );
}
