import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset, SelectToggleDefinition } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import { QuizSetupPanel } from './QuizSetupPanel';
import { useToggleState } from './useToggleState';
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
  children,
}: QuizShellProps) {
  const [phase, setPhase] = useState<ShellPhase>('configuring');
  const [quizKey, setQuizKey] = useState(0);
  const [selectedMode, setSelectedMode] = useState<QuizModeType>(defaultMode);
  const [countdownMinutes, setCountdownMinutes] = useState<number | undefined>(
    defaultCountdownSeconds !== undefined ? Math.ceil(defaultCountdownSeconds / 60) : undefined,
  );
  const [rangeMin, setRangeMin] = useState<number | undefined>(undefined);
  const [rangeMaxValue, setRangeMaxValue] = useState<number | undefined>(undefined);
  const toggleState = useToggleState(toggles, presets, selectToggles);

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

  const handleStart = useCallback(() => {
    setPhase('active');
  }, []);

  const handleReconfigure = useCallback(() => {
    setPhase('configuring');
    setQuizKey((prev) => prev + 1);
  }, []);

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
    toggleValues: toggleState.values,
    selectValues: toggleState.selectValues,
    selectedMode,
    countdownSeconds: countdownMinutes !== undefined ? countdownMinutes * 60 : undefined,
    elementRange,
    onReconfigure: handleReconfigure,
  };

  return (
    <div className={styles.quizContainer}>
      <button
        className={styles.reconfigureButton}
        onClick={handleReconfigure}
      >
        Reconfigure
      </button>
      <div key={quizKey} className={styles.quizContent}>
        {children(config)}
      </div>
    </div>
  );
}
