import { type ComponentType, useCallback, useEffect, useState } from 'react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath } from '@/visualizations/VisualizationRendererProps';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { Timer } from './Timer';
import { ModeAdapter } from './ModeAdapter';
import { QuizResults } from './QuizResults';
import styles from './ActiveQuiz.module.css';

export interface ActiveQuizProps {
  readonly config: QuizConfig;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
}

/**
 * Active quiz phase: renders Timer, ModeAdapter, and QuizResults overlay.
 * Manages elapsed time and detects quiz completion.
 */
export function ActiveQuiz({
  config,
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  Renderer,
  backgroundPaths,
}: ActiveQuizProps) {
  const [finishState, setFinishState] = useState<ScoreResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [forceGiveUp, setForceGiveUp] = useState(false);
  const isFinished = finishState !== null;

  // Elapsed time counter
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  const handleStatusChange = useCallback(
    (status: 'active' | 'finished', score: ScoreResult) => {
      if (status === 'finished') {
        setFinishState(score);
      }
    },
    [],
  );

  const handleTimerExpire = useCallback(() => {
    if (!isFinished) {
      setForceGiveUp(true);
    }
  }, [isFinished]);

  return (
    <div className={styles.container}>
      {config.countdownSeconds !== undefined && (
        <div className={styles.timerBar}>
          <Timer
            countdownSeconds={config.countdownSeconds}
            onExpire={handleTimerExpire}
            paused={isFinished}
          />
        </div>
      )}

      <div className={styles.quizArea}>
        <ModeAdapter
          mode={config.selectedMode}
          elements={elements}
          dataRows={dataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={config.toggleValues}
          Renderer={Renderer}
          backgroundPaths={backgroundPaths}
          onStatusChange={handleStatusChange}
          forceGiveUp={forceGiveUp}
        />
      </div>

      {isFinished && (
        <QuizResults
          correct={finishState.correct}
          total={finishState.total}
          percentage={finishState.percentage}
          elapsedSeconds={elapsedSeconds}
          onRetry={config.onReconfigure}
        />
      )}
    </div>
  );
}
