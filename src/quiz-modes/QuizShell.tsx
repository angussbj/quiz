import { type ReactNode, useCallback, useState } from 'react';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import type { ToggleConstraint } from './ToggleConstraint';
import { QuizSetupPanel } from './QuizSetupPanel';
import { useToggleState } from './useToggleState';
import styles from './QuizShell.module.css';

export interface QuizConfig {
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectedMode: QuizModeType;
  readonly countdownSeconds: number | undefined;
  readonly onReconfigure: () => void;
}

interface QuizShellProps {
  readonly title: string;
  readonly description?: string;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly defaultMode: QuizModeType;
  readonly defaultCountdownSeconds?: number;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
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
  presets,
  modeConstraints,
  children,
}: QuizShellProps) {
  const [phase, setPhase] = useState<ShellPhase>('configuring');
  const [quizKey, setQuizKey] = useState(0);
  const [selectedMode, setSelectedMode] = useState<QuizModeType>(defaultMode);
  const [countdownMinutes, setCountdownMinutes] = useState<number | undefined>(
    defaultCountdownSeconds !== undefined ? Math.ceil(defaultCountdownSeconds / 60) : undefined,
  );
  const toggleState = useToggleState(toggles, presets);

  const handleModeChange = useCallback((newMode: QuizModeType) => {
    setSelectedMode(newMode);
    // Apply forced toggle values for the new mode
    const constraints = modeConstraints?.[newMode] ?? [];
    for (const constraint of constraints) {
      if (constraint.type === 'forced') {
        toggleState.set(constraint.key, constraint.forcedValue);
      }
    }
  }, [modeConstraints, toggleState]);

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
        onStart={handleStart}
        modeConstraints={modeConstraints}
      />
    );
  }

  const config: QuizConfig = {
    toggleValues: toggleState.values,
    selectedMode,
    countdownSeconds: countdownMinutes !== undefined ? countdownMinutes * 60 : undefined,
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
