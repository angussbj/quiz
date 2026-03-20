import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath, LakePath, VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ReviewResult } from './QuizModeProps';
import type { ToggleDefinition, SelectToggleDefinition } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { computeGroupCameraPosition } from './computeGroupCameraPosition';
import { Timer } from './Timer';
import { resolveMode } from './resolveMode';
import styles from './ActiveQuiz.module.css';

export interface ActiveQuizProps {
  readonly config: QuizConfig;
  readonly visualizationType?: VisualizationType;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly selectToggleDefinitions?: ReadonlyArray<SelectToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly lakePaths?: ReadonlyArray<LakePath>;
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  readonly rangeColumn?: string;
  readonly groupFilterColumn?: string;
  readonly hideFilteredElements?: boolean;
  readonly initialCameraPosition?: VisualizationRendererProps['initialCameraPosition'];
  readonly groupFilterCameraPositions?: Readonly<Record<string, {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>>;
}

/**
 * Active quiz phase: renders Timer and the resolved mode component.
 * Manages elapsed time and detects quiz completion.
 */
export function ActiveQuiz({
  config,
  visualizationType,
  elements,
  dataRows,
  columnMappings,
  toggleDefinitions,
  selectToggleDefinitions,
  Renderer,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  rangeColumn,
  groupFilterColumn,
  hideFilteredElements,
  initialCameraPosition,
  groupFilterCameraPositions,
}: ActiveQuizProps) {
  const { activeElements, activeDataRows, backgroundElementIds } = useMemo(() => {
    const hasRangeFilter = rangeColumn && config.elementRange;
    const hasGroupFilter = groupFilterColumn && config.selectedGroups;
    if (!hasRangeFilter && !hasGroupFilter) {
      return { activeElements: elements, activeDataRows: dataRows, backgroundElementIds: new Set<string>() };
    }
    const activeIds = new Set<string>();
    const bgIds = new Set<string>();
    for (const row of dataRows) {
      const id = row['id'] ?? '';
      let passes = true;
      if (hasRangeFilter) {
        const value = parseInt(row[rangeColumn] ?? '0', 10);
        const { min, max } = config.elementRange;
        if (value < min || value > max) passes = false;
      }
      if (passes && hasGroupFilter) {
        const group = row[groupFilterColumn] ?? '';
        if (!config.selectedGroups.has(group)) passes = false;
      }
      if (passes) {
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
  }, [elements, dataRows, rangeColumn, config.elementRange, groupFilterColumn, config.selectedGroups]);

  const FilterAwareRenderer = useMemo(() => {
    if (backgroundElementIds.size === 0) return Renderer;
    if (hideFilteredElements) return Renderer;

    function WrappedRenderer(props: VisualizationRendererProps) {
      const mergedStates = useMemo(() => {
        const states: Record<string, ElementVisualState> = { ...props.elementStates };
        for (const id of backgroundElementIds) {
          states[id] = 'context';
        }
        return states;
      }, [props.elementStates]);

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
    WrappedRenderer.displayName = 'FilterAwareRenderer';
    return WrappedRenderer;
  }, [Renderer, elements, backgroundElementIds, hideFilteredElements]);

  const effectiveCameraPosition = useMemo(() => {
    const groupCamera = computeGroupCameraPosition(
      groupFilterCameraPositions,
      config.selectedGroups,
    );
    return groupCamera ?? initialCameraPosition;
  }, [groupFilterCameraPositions, config.selectedGroups, initialCameraPosition]);

  const filteredBackgroundLabels = useMemo(() => {
    if (!backgroundLabels || !groupFilterColumn || !config.selectedGroups) return backgroundLabels;
    const selectedGroups = config.selectedGroups;
    return backgroundLabels.filter((label) => {
      const labelRegion = label.region;
      if (!labelRegion) return false;
      const labelRegions = labelRegion.split('|');
      return labelRegions.some((r) => selectedGroups.has(r));
    });
  }, [backgroundLabels, groupFilterColumn, config.selectedGroups]);

  const [finishState, setFinishState] = useState<ScoreResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [forceGiveUp, setForceGiveUp] = useState(false);
  const isFinished = finishState !== null;

  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished]);

  const handleFinish = useCallback((score: ScoreResult) => {
    setFinishState(score);
  }, []);

  const handleTimerExpire = useCallback(() => {
    if (!isFinished) {
      setForceGiveUp(true);
    }
  }, [isFinished]);

  const reviewResult: ReviewResult | undefined = useMemo(() => {
    if (!finishState) return undefined;
    return {
      correct: finishState.correct,
      total: finishState.total,
      percentage: finishState.percentage,
      elapsedSeconds,
      onRetry: config.onReconfigure,
    };
  }, [finishState, elapsedSeconds, config.onReconfigure]);

  const Mode = resolveMode(config.selectedMode, visualizationType);

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
        <Mode
          elements={activeElements}
          dataRows={activeDataRows}
          columnMappings={columnMappings}
          toggleDefinitions={toggleDefinitions}
          selectToggleDefinitions={selectToggleDefinitions}
          toggleValues={config.toggleValues}
          selectValues={config.selectValues}
          Renderer={FilterAwareRenderer}
          backgroundPaths={backgroundPaths}
          lakePaths={lakePaths}
          backgroundLabels={filteredBackgroundLabels}
          onFinish={handleFinish}
          forceGiveUp={forceGiveUp}
          reviewing={isFinished}
          reviewResult={reviewResult}
          initialCameraPosition={effectiveCameraPosition}
        />
      </div>
    </div>
  );
}
