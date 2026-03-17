import { type ReactNode, useCallback, useState } from 'react';
import type { ToggleDefinition, TogglePreset } from './ToggleDefinition';
import { TogglePanel } from './TogglePanel';
import { useToggleState } from './useToggleState';
import styles from './QuizShell.module.css';

interface QuizShellProps {
  readonly title: string;
  readonly description?: string;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly children: (toggleValues: Readonly<Record<string, boolean>>) => ReactNode;
}

type ShellPhase = 'configuring' | 'active';

/**
 * Wraps a quiz mode with toggle configuration.
 * Shows a config screen before the quiz starts.
 * Provides a "Reconfigure" button that resets quiz state.
 */
export function QuizShell({
  title,
  description,
  toggles,
  presets,
  children,
}: QuizShellProps) {
  const [phase, setPhase] = useState<ShellPhase>('configuring');
  const [quizKey, setQuizKey] = useState(0);
  const toggleState = useToggleState(toggles, presets);

  const handleStart = useCallback(() => {
    setPhase('active');
  }, []);

  const handleReconfigure = useCallback(() => {
    setPhase('configuring');
    setQuizKey((prev) => prev + 1);
  }, []);

  if (phase === 'configuring') {
    return (
      <TogglePanel
        title={title}
        description={description}
        toggles={toggles}
        presets={presets}
        values={toggleState.values}
        activePreset={toggleState.activePreset}
        onChange={toggleState.set}
        onPreset={toggleState.applyPreset}
        onStart={handleStart}
      />
    );
  }

  return (
    <div className={styles.quizContainer}>
      <button
        className={styles.reconfigureButton}
        onClick={handleReconfigure}
      >
        Reconfigure
      </button>
      <div key={quizKey}>
        {children(toggleState.values)}
      </div>
    </div>
  );
}
