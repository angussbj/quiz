import { type ComponentType, useCallback, useEffect, useState } from 'react';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ToggleDefinition } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { Timer } from './Timer';
import { ModeAdapter } from './ModeAdapter';
import { QuizResults } from './QuizResults';
import { ReviewBar } from './ReviewBar';
import styles from './ActiveQuiz.module.css';

export interface ActiveQuizProps {
  readonly config: QuizConfig;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
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
  backgroundLabels,
}: ActiveQuizProps) {
  const [finishState, setFinishState] = useState<ScoreResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [forceGiveUp, setForceGiveUp] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
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

  const handleReview = useCallback(() => {
    setIsReviewing(true);
  }, []);

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
          backgroundLabels={backgroundLabels}
          onStatusChange={handleStatusChange}
          forceGiveUp={forceGiveUp}
          reviewing={isReviewing}
        />
      </div>

      {isFinished && !isReviewing && (
        <QuizResults
          correct={finishState.correct}
          total={finishState.total}
          percentage={finishState.percentage}
          elapsedSeconds={elapsedSeconds}
          onRetry={config.onReconfigure}
          onReview={handleReview}
        />
      )}

      {isReviewing && finishState && (
        <ReviewBar
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
