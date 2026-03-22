import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisualizationElement, ElementVisualState } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps, BackgroundPath, LakePath, VisualizationType } from '@/visualizations/VisualizationRendererProps';
import { isMapElement } from '@/visualizations/map/MapElement';
import type { TimeScale } from '@/visualizations/timeline/buildTimelineElements';
import type { BackgroundLabel } from '@/visualizations/map/BackgroundLabel';
import type { ScoreResult } from '@/scoring/ScoreResult';
import type { ReviewResult } from './QuizModeProps';
import type { ToggleDefinition, SelectToggleDefinition } from './ToggleDefinition';
import type { QuizConfig } from './QuizShell';
import { computeGroupCameraPosition } from './computeGroupCameraPosition';
import { normalizeText, type NormalizeOptions } from './free-recall/matchAnswer';
import { Timer } from './Timer';
import { resolveMode } from './resolveMode';
import styles from './ActiveQuiz.module.css';

/** Values read by the stable FilterAwareRenderer wrapper via ref. */
interface FilterOverrides {
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly showFilteredBg: boolean;
  readonly extendedElements: ReadonlyArray<VisualizationElement> | undefined;
  readonly filteredBgElementIds: ReadonlySet<string>;
  readonly timeScale: TimeScale | undefined;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
}

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
  readonly timeScale?: TimeScale;
  readonly elementStateColorOverrides?: VisualizationRendererProps['elementStateColorOverrides'];
  readonly normalizeOptions?: NormalizeOptions;
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
  timeScale,
  elementStateColorOverrides,
  normalizeOptions,
}: ActiveQuizProps) {
  const { activeElements, activeDataRows, filteredBgElementIds } = useMemo(() => {
    const hasRangeFilter = rangeColumn && config.elementRange;
    const hasGroupFilter = groupFilterColumn && config.selectedGroups;
    const mergeTributaries  = tributaryColumn   && config.toggleValues['mergeTributaries']   === true;
    const mergeDistributaries = distributaryColumn && config.toggleValues['mergeDistributaries'] === true;
    // mergeSegmentNames defaults to true — segments are always merged unless explicitly set false
    const mergeSegments = segmentColumn && config.toggleValues['mergeSegmentNames'] !== false;

    const hasAnyFilter = hasRangeFilter || hasGroupFilter || tributaryColumn || distributaryColumn || segmentColumn;

    let mergedActiveElements: ReadonlyArray<VisualizationElement>;
    let activeElementsFiltered: ReadonlyArray<VisualizationElement>;
    let activeRowIds: ReadonlySet<string>;
    const filteredBgIds = new Set<string>();
    // Maps canonical answer value → extra alternate names collected from segment rows
    const segmentAltsByCanonical: Record<string, Array<string>> = {};

    if (!hasAnyFilter) {
      activeElementsFiltered = elements;
      mergedActiveElements = elements;
      activeRowIds = new Set(dataRows.map((row) => row['id'] ?? ''));
    } else {
      const activeIds = new Set<string>();
      // mergeSourceIds: elements whose paths will be merged into their parent/canonical element
      const mergeSourceIds = new Set<string>();

      for (const row of dataRows) {
        const id = row['id'] ?? '';

        // Classify tributary/distributary/segment rows before range/group filters.
        // Merge-sources bypass range/group so that all related paths are included visually
        // regardless of whether they individually meet the range threshold.
        if (tributaryColumn && row[tributaryColumn]) {
          if (mergeTributaries) {
            mergeSourceIds.add(id);
            continue;
          }
          // Not merging: tributary is a regular quiz element — fall through to range/group filters
        }
        if (distributaryColumn && row[distributaryColumn]) {
          if (mergeDistributaries) {
            mergeSourceIds.add(id);
            continue;
          }
          // Not merging: distributary is a regular quiz element — fall through to range/group filters
        }
        if (segmentColumn && row[segmentColumn]) {
          if (mergeSegments) {
            mergeSourceIds.add(id);
            // Collect this segment's name and alternates for the canonical row
            const answerColumn = columnMappings['answer'] ?? 'name';
            const canonical = row[segmentColumn];
            const segmentName = row[answerColumn] ?? '';
            if (segmentName) {
              segmentAltsByCanonical[canonical] ??= [];
              segmentAltsByCanonical[canonical].push(segmentName);
            }
            const altsColumn = `${answerColumn}_alternates`;
            const alts = row[altsColumn];
            if (alts) {
              for (const alt of alts.split('|').map((s) => s.trim()).filter(Boolean)) {
                segmentAltsByCanonical[canonical] ??= [];
                segmentAltsByCanonical[canonical].push(alt);
              }
            }
          } else {
            // Segments not merged: they're separate quiz items, fall through to range/group filters
          }
          if (mergeSegments) continue;
        }

        // Apply range and group filters to non-tributary/distributary/segment rows
        let passes = true;
        if (hasRangeFilter) {
          const value = parseInt(row[rangeColumn] ?? '0', 10);
          const { min, max } = config.elementRange;
          if (value < min || value > max) passes = false;
        }
        if (passes && hasGroupFilter && config.selectedGroups) {
          const group = row[groupFilterColumn] ?? '';
          const selectedGroups = config.selectedGroups;
          if (!group.split('|').some((seg) => selectedGroups.has(seg.trim()))) passes = false;
        }

        if (passes) {
          activeIds.add(id);
        } else {
          filteredBgIds.add(id);
        }
      }

      activeElementsFiltered = elements.filter((el) => activeIds.has(el.id));
      activeRowIds = activeIds;

      // Build merge step: fold merge-source paths into their parent/canonical active element.
      // Also compute promptSubtitle for elements that had anything merged in.
      const mergeSourceElements = elements.filter((el) => mergeSourceIds.has(el.id));
      const extraPathsByActiveId = new Map<string, Array<string>>();
      const mergedKindsByActiveId = new Map<string, Set<'tributary' | 'distributary' | 'segment'>>();

      const activeElementByLabel = new Map(activeElementsFiltered.map((el) => [el.label, el]));
      // Also index merge sources by label so we can follow multi-level chains
      // (e.g. Weir → Barwon → Darling → Murray, where only Murray is active).
      const mergeSourceByLabel = new Map(mergeSourceElements
        .filter(isMapElement)
        .map((el) => [el.label, el]));

      /** Follow the tributary/segment chain up until we reach an active element. */
      function resolveActiveAncestor(label: string): VisualizationElement | undefined {
        const visited = new Set<string>();
        let current = label;
        while (!visited.has(current)) {
          visited.add(current);
          const active = activeElementByLabel.get(current);
          if (active) return active;
          const mergeEl = mergeSourceByLabel.get(current);
          if (!mergeEl || !isMapElement(mergeEl)) return undefined;
          const next = mergeEl.tributaryOf ?? mergeEl.distributaryOf ?? mergeEl.segmentOf;
          if (!next) return undefined;
          current = next;
        }
        return undefined;
      }

      for (const src of mergeSourceElements) {
        if (!isMapElement(src) || !src.svgPathData) continue;
        const parentName = src.tributaryOf ?? src.distributaryOf ?? src.segmentOf;
        if (!parentName) continue;
        const parentEl = resolveActiveAncestor(parentName);
        if (!parentEl) continue; // chain leads nowhere active — discard

        const kind: 'tributary' | 'distributary' | 'segment' =
          src.tributaryOf ? 'tributary' : src.distributaryOf ? 'distributary' : 'segment';

        if (!extraPathsByActiveId.has(parentEl.id)) extraPathsByActiveId.set(parentEl.id, []);
        extraPathsByActiveId.get(parentEl.id)!.push(src.svgPathData);

        if (!mergedKindsByActiveId.has(parentEl.id)) mergedKindsByActiveId.set(parentEl.id, new Set());
        mergedKindsByActiveId.get(parentEl.id)!.add(kind);
      }

      mergedActiveElements = activeElementsFiltered.map((el) => {
        if (!isMapElement(el)) return el;
        const extraPaths = extraPathsByActiveId.get(el.id);
        const kinds = mergedKindsByActiveId.get(el.id);
        if (!extraPaths?.length) return el;
        const mergedPaths = [el.svgPathData, ...extraPaths].filter(Boolean).join(' ');
        const promptSubtitle = kinds ? buildMergeSubtitle(kinds) : undefined;
        return { ...el, svgPathData: mergedPaths, promptSubtitle };
      });
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
      activeElements: mergedActiveElements,
      activeDataRows: activeDataRowsAugmented,
      filteredBgElementIds: filteredBgIds,
    };
  }, [elements, dataRows, columnMappings, rangeColumn, config.elementRange, groupFilterColumn, config.selectedGroups, tributaryColumn, distributaryColumn, segmentColumn, config.toggleValues]);

/** Build the prompt subtitle string from the set of merged element kinds. */
function buildMergeSubtitle(kinds: ReadonlySet<'tributary' | 'distributary' | 'segment'>): string | undefined {
  const parts: Array<string> = [];
  if (kinds.has('tributary')) parts.push('tributaries');
  if (kinds.has('distributary')) parts.push('distributaries');
  // Segments are transparent to the user — they're just alternate names, no subtitle needed
  if (parts.length === 0) return undefined;
  return `(and ${parts.join(' and ')})`;
}

  // Store dynamic override values in a ref so the stable wrapper component
  // can read them without changing React component identity. Changing component
  // identity causes React to unmount/remount the entire subtree — catastrophic
  // for 3D renderers that create WebGL contexts.
  const filterOverridesRef = useRef<FilterOverrides>(null);

  const showFilteredBg = filteredBgElementIds.size > 0 && !hideFilteredElements;

  const extendedElements = useMemo(() => {
    if (!showFilteredBg) return undefined;
    return [...activeElements, ...elements.filter((el) => filteredBgElementIds.has(el.id))];
  }, [showFilteredBg, activeElements, elements, filteredBgElementIds]);

  // Update the ref every render so the wrapper always reads current values.
  filterOverridesRef.current = {
    Renderer,
    showFilteredBg,
    extendedElements,
    filteredBgElementIds,
    timeScale,
    elementStateColorOverrides,
  };

  // Create the wrapper component exactly once per Renderer identity.
  // All other dynamic values are read from the ref inside the render function.
  const FilterAwareRenderer = useMemo(() => {
    function StableFilterRenderer(props: VisualizationRendererProps) {
      // The ref is always assigned before this component renders, so current is never null.
      // Read values from the ref to avoid changing component identity on every render.
      const { Renderer: Inner, showFilteredBg: showBg, extendedElements: extEls, filteredBgElementIds: bgIds, timeScale: ts, elementStateColorOverrides: colorOverrides } = filterOverridesRef.current ?? {} as FilterOverrides;

      const mergedStates = useMemo(() => {
        if (!showBg) return props.elementStates;
        const states: Record<string, ElementVisualState> = { ...props.elementStates };
        for (const id of bgIds) {
          states[id] = 'context';
        }
        return states;
      }, [props.elementStates, showBg, bgIds]);

      const mergedToggles = useMemo(() => {
        if (!showBg) return props.elementToggles;
        const toggles: Record<string, Record<string, boolean>> = {};
        if (props.elementToggles) {
          for (const [id, t] of Object.entries(props.elementToggles)) {
            toggles[id] = { ...t };
          }
        }
        for (const id of bgIds) {
          toggles[id] = {
            showSymbols: true,
            showAtomicNumbers: true,
            showNames: false,
            showGroups: true,
          };
        }
        return toggles;
      }, [props.elementToggles, showBg, bgIds]);

      if (!Inner) return null;

      return (
        <Inner
          {...props}
          elements={extEls ?? props.elements}
          elementStates={mergedStates}
          elementToggles={mergedToggles}
          timeScale={ts}
          elementStateColorOverrides={colorOverrides}
        />
      );
    }
    StableFilterRenderer.displayName = 'FilterAwareRenderer';
    return StableFilterRenderer;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Renderer controls component identity
  }, [Renderer]);

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
          timeScale={timeScale}
          normalizeOptions={normalizeOptions}
        />
      </div>
    </div>
  );
}
