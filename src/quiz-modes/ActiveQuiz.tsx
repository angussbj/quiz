import { type ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath, LakePath, VisualizationType } from '@/visualizations/VisualizationRendererProps';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ReviewResult } from './QuizModeProps';
import type { ToggleDefinition, SelectToggleDefinition } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { computeGroupCameraPosition } from './computeGroupCameraPosition';
import { normalizeText } from './free-recall/matchAnswer';
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
  /** When false, locate mode shows all elements visible from the start. See QuizDefinition. */
  readonly hideUnfocusedElements?: boolean;
  readonly tributaryColumn?: string;
  readonly distributaryColumn?: string;
  readonly segmentColumn?: string;
  readonly initialCameraPosition?: VisualizationRendererProps['initialCameraPosition'];
  readonly groupFilterCameraPositions?: Readonly<Record<string, {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>>;
  readonly locateDistanceMode?: 'centroid' | 'polygon-boundary';
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
  hideUnfocusedElements,
  tributaryColumn,
  distributaryColumn,
  segmentColumn,
  initialCameraPosition,
  groupFilterCameraPositions,
  locateDistanceMode,
}: ActiveQuizProps) {
  const { activeElements, activeDataRows, backgroundElementIds } = useMemo(() => {
    const hasRangeFilter = rangeColumn && config.elementRange;
    const hasGroupFilter = groupFilterColumn && config.selectedGroups;
    // Exclude tributaries when 'includeTributaries' toggle is explicitly off
    const hasTributaryFilter = tributaryColumn && config.toggleValues['includeTributaries'] === false;
    // Exclude distributaries when 'includeDistributaries' toggle is explicitly off
    const hasDistributaryFilter = distributaryColumn && config.toggleValues['includeDistributaries'] === false;
    // When 'includeSegmentNames' is off, segments are excluded from the quiz and their
    // names are added as alternates for the canonical river row.
    const hasSegmentFilter = segmentColumn && config.toggleValues['includeSegmentNames'] === false;

    const hasAnyFilter = hasRangeFilter || hasGroupFilter || hasTributaryFilter || hasDistributaryFilter || hasSegmentFilter;

    let activeElementsFiltered: ReadonlyArray<VisualizationElement>;
    let activeRowIds: ReadonlySet<string>;
    const bgIds = new Set<string>();
    // Maps canonical answer value → extra alternate names collected from segment rows
    const segmentAltsByCanonical: Record<string, Array<string>> = {};

    if (!hasAnyFilter) {
      activeElementsFiltered = elements;
      activeRowIds = new Set(dataRows.map((row) => row['id'] ?? ''));
    } else {
      const activeIds = new Set<string>();

      for (const row of dataRows) {
        const id = row['id'] ?? '';
        let passes = true;
        if (hasRangeFilter) {
          const value = parseInt(row[rangeColumn] ?? '0', 10);
          const { min, max } = config.elementRange;
          if (value < min || value > max) passes = false;
        }
        if (passes && hasGroupFilter && config.selectedGroups) {
          const group = row[groupFilterColumn] ?? '';
          const selectedGroups = config.selectedGroups;
          if (!group.split('|').some((segment) => selectedGroups.has(segment.trim()))) passes = false;
        }
        if (passes && hasTributaryFilter) {
          // Rows with a non-empty tributary_of value are tributaries — exclude from quiz
          if (row[tributaryColumn]) passes = false;
        }
        if (passes && hasDistributaryFilter) {
          if (row[distributaryColumn]) passes = false;
        }
        if (passes && hasSegmentFilter) {
          const canonical = row[segmentColumn];
          if (canonical) {
            passes = false;
            // Collect this segment's name and alternates for the canonical row
            const answerColumn = columnMappings['answer'] ?? 'name';
            const segmentName = row[answerColumn] ?? '';
            if (segmentName) {
              segmentAltsByCanonical[canonical] ??= [];
              segmentAltsByCanonical[canonical].push(segmentName);
            }
            const altsColumn = `${answerColumn}_alternates`;
            const alts = row[altsColumn];
            if (alts) {
              segmentAltsByCanonical[canonical] ??= [];
              for (const alt of alts.split('|').map((s) => s.trim()).filter(Boolean)) {
                segmentAltsByCanonical[canonical].push(alt);
              }
            }
          }
        }
        if (passes) {
          activeIds.add(id);
        } else {
          bgIds.add(id);
        }
      }

      activeElementsFiltered = elements.filter((el) => activeIds.has(el.id));
      activeRowIds = activeIds;
    }

    // Augment data rows with element label alternates so grouped elements
    // (bilateral merge, numbered merge) can be matched by their merged label.
    // E.g. bilateral merge: row name "Femur (right)" → element label "Femur".
    const answerColumn = columnMappings['answer'] ?? 'name';
    const altsColumn = `${answerColumn}_alternates`;

    const elementLabelById = new Map<string, string>();
    for (const el of activeElementsFiltered) {
      elementLabelById.set(el.id, el.label);
    }

    const activeDataRowsAugmented = dataRows
      .filter((row) => activeRowIds.has(row['id'] ?? ''))
      .map((row) => {
        const rowId = row['id'] ?? '';
        const canonicalName = row[answerColumn] ?? '';
        const parts: Array<string> = [];

        // Segment alternates
        const extraAlts = segmentAltsByCanonical[canonicalName];
        if (extraAlts?.length) parts.push(...extraAlts);

        // Element label as alternate (for grouped elements whose label differs from row name)
        const elLabel = elementLabelById.get(rowId);
        if (elLabel && normalizeText(elLabel) !== normalizeText(canonicalName)) {
          parts.push(elLabel);
        }

        if (parts.length === 0) return row;
        const existing = row[altsColumn] ?? '';
        const merged = [existing, ...parts].filter(Boolean).join('|');
        return { ...row, [altsColumn]: merged };
      });

    return {
      activeElements: activeElementsFiltered,
      activeDataRows: activeDataRowsAugmented,
      backgroundElementIds: bgIds,
    };
  }, [elements, dataRows, columnMappings, rangeColumn, config.elementRange, groupFilterColumn, config.selectedGroups, tributaryColumn, distributaryColumn, segmentColumn, config.toggleValues]);

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
          locateDistanceMode={locateDistanceMode}
          hideUnfocusedElements={hideUnfocusedElements}
        />
      </div>
    </div>
  );
}
