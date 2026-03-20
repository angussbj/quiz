import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import { resolveToggleConstraints } from './resolveToggleConstraints';
import { QuizSetupPanel } from './QuizSetupPanel';
import { useToggleState } from './useToggleState';
import { countFilteredElements } from './countFilteredElements';
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
  readonly title: string;
  readonly description?: string;
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
  readonly groupFilterColumn?: string;
  readonly groupFilterLabel?: string;
  readonly availableGroups?: ReadonlyArray<string>;
  readonly dataRows?: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly children: (config: QuizConfig) => ReactNode;
}

type ShellPhase = 'configuring' | 'active';

/**
 * Wraps a quiz mode with configuration.
 * Shows a setup screen (mode, timer, toggles) before the quiz starts.
 * Provides a "Reconfigure" button that resets quiz state.
 */
export function QuizShell({
  title,
  description,
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
  groupFilterColumn,
  groupFilterLabel,
  availableGroups,
  dataRows,
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
  const [selectedGroups, setSelectedGroups] = useState<ReadonlySet<string>>(
    () => new Set(availableGroups ?? []),
  );
  const toggleState = useToggleState(toggles, presets, selectToggles);

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

  const filteredCount = useMemo(() => {
    if (!dataRows) return undefined;
    return countFilteredElements(
      dataRows, rangeColumn, rangeMin, rangeMaxValue, rangeMax,
      groupFilterColumn, groupFilterColumn ? selectedGroups : undefined,
    );
  }, [dataRows, rangeColumn, rangeMin, rangeMaxValue, rangeMax, groupFilterColumn, selectedGroups]);

  const applyModeConstraints = useCallback((mode: QuizModeType) => {
    const constraints = modeConstraints?.[mode] ?? [];
    for (const constraint of constraints) {
      if (constraint.type === 'forced') {
        toggleState.set(constraint.key, constraint.forcedValue);
      }
    }
  }, [modeConstraints, toggleState]);

  // Apply constraints for the initial default mode on first render
  const hasAppliedInitial = useRef(false);
  useEffect(() => {
    if (!hasAppliedInitial.current) {
      hasAppliedInitial.current = true;
      applyModeConstraints(defaultMode);
    }
  }, [defaultMode, applyModeConstraints]);

  const handleModeChange = useCallback((newMode: QuizModeType) => {
    setSelectedMode(newMode);
    applyModeConstraints(newMode);
  }, [applyModeConstraints]);

  // Push a history entry when starting so the browser back button returns to setup.
  const handleStart = useCallback(() => {
    history.pushState({}, '');
    setPhase('active');
  }, []);

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
        rangeLabel={rangeColumn ? rangeLabel : undefined}
        rangeMax={rangeMax}
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
        onSelectChange={toggleState.setSelect}
      />
    );
  }

  const elementRange = rangeMin !== undefined || rangeMaxValue !== undefined
    ? { min: rangeMin ?? 1, max: rangeMaxValue ?? (rangeMax ?? 999) }
    : undefined;

  const config: QuizConfig = {
    toggleValues: effectiveToggleValues,
    selectValues: toggleState.selectValues,
    selectedMode,
    countdownSeconds: countdownMinutes !== undefined ? countdownMinutes * 60 : undefined,
    elementRange,
    selectedGroups: hasGroupFilter ? selectedGroups : undefined,
    onReconfigure: handleReconfigure,
  };

  return (
    <div className={styles.quizContainer}>
      <button
        className={styles.reconfigureButton}
        onClick={handleReconfigure}
      >
        <span aria-hidden="true">‹</span> Reconfigure
      </button>
      <div key={quizKey} className={styles.quizContent}>
        {children(config)}
      </div>
    </div>
  );
}
