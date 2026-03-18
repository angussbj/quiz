import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
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
  readonly rangeColumn?: string;
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
  rangeColumn,
}: ActiveQuizProps) {
  // Split elements into active (quizzed) and background (context) based on range
  const { activeElements, activeDataRows, backgroundElementIds } = useMemo(() => {
    if (!rangeColumn || !config.elementRange) {
      return { activeElements: elements, activeDataRows: dataRows, backgroundElementIds: new Set<string>() };
    }
    const { min, max } = config.elementRange;
    const activeIds = new Set<string>();
    const bgIds = new Set<string>();
    for (const row of dataRows) {
      const value = parseInt(row[rangeColumn] ?? '0', 10);
      const id = row['id'] ?? '';
      if (value >= min && value <= max) {
        activeIds.add(id);
      } else {
        bgIds.add(id);
      }
    }
    return {
      activeElements: elements.filter((el) => activeIds.has(el.id)),
      activeDataRows: dataRows.filter((row) => activeIds.has(row['id'] ?? '')),
      backgroundElementIds: bgIds,
    };
  }, [elements, dataRows, rangeColumn, config.elementRange]);

  // Wrap the renderer to inject background element states and show all elements
  const RangeAwareRenderer = useMemo(() => {
    if (backgroundElementIds.size === 0) return Renderer;

    function WrappedRenderer(props: VisualizationRendererProps) {
      const mergedStates = useMemo(() => {
        const states: Record<string, ElementVisualState> = { ...props.elementStates };
        for (const id of backgroundElementIds) {
          states[id] = 'revealed';
        }
        return states;
      }, [props.elementStates]);

      // Force all toggles on for background elements so symbols are visible
      const mergedToggles = useMemo(() => {
        const toggles: Record<string, Record<string, boolean>> = {};
        if (props.elementToggles) {
          for (const [id, t] of Object.entries(props.elementToggles)) {
            toggles[id] = { ...t };
          }
        }
        for (const id of backgroundElementIds) {
          toggles[id] = {
            showSymbols: true,
            showAtomicNumbers: true,
            showNames: false,
            showGroups: true,
          };
        }
        return toggles;
      }, [props.elementToggles]);

      return (
        <Renderer
          {...props}
          elements={elements}
          elementStates={mergedStates}
          elementToggles={mergedToggles}
        />
      );
    }
    WrappedRenderer.displayName = 'RangeAwareRenderer';
    return WrappedRenderer;
  }, [Renderer, elements, backgroundElementIds]);

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
          elements={activeElements}
          dataRows={activeDataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          toggleValues={config.toggleValues}
          Renderer={RangeAwareRenderer}
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
