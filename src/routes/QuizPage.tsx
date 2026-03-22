import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { getQuizById } from '@/quiz-definitions/getQuizById';
import { useQuizData } from '@/quiz-definitions/useQuizData';
import { buildElements } from '@/visualizations/buildElements';
import { resolveRenderer } from '@/visualizations/resolveRenderer';
import { useBackgroundPaths } from '@/visualizations/map/useBackgroundPaths';
import { useLakePaths } from '@/visualizations/map/useLakePaths';
import { computeBackgroundLabels } from '@/visualizations/map/computeBackgroundLabels';
import { QuizShell } from '@/quiz-modes/QuizShell';
import { ActiveQuiz } from '@/quiz-modes/ActiveQuiz';
import styles from './QuizPage.module.css';

/**
 * Extract unique values from a column, preserving first-seen order.
 * Cells with pipe-separated values (e.g. "Europe|Asia") contribute each segment as a separate value.
 */
function uniqueColumnValues(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  column: string,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  const result: Array<string> = [];
  for (const row of rows) {
    const cell = row[column] ?? '';
    for (const segment of cell.split('|')) {
      const value = segment.trim();
      if (value && !seen.has(value)) {
        seen.add(value);
        result.push(value);
      }
    }
  }
  return result;
}

export default function QuizPage() {
  const { '*': quizId } = useParams();
  const definition = quizId ? getQuizById(quizId) : undefined;
  const dataState = useQuizData(definition?.dataPath, definition?.dataFilter);
  const backgroundPaths = useBackgroundPaths(definition?.supportingDataPaths[0]);
  const lakePaths = useLakePaths(definition?.supportingDataPaths[1]);

  if (!quizId) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>No quiz specified.</p>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>Quiz not found: {quizId}</p>
      </div>
    );
  }

  if (dataState.status === 'loading') {
    return (
      <div className={styles.page}>
        <p className={styles.message}>Loading...</p>
      </div>
    );
  }

  if (dataState.status === 'error') {
    return (
      <div className={styles.page}>
        <p className={styles.errorMessage}>{dataState.error}</p>
      </div>
    );
  }

  if (dataState.status === 'idle' || dataState.rows.length === 0) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>No quiz data available.</p>
      </div>
    );
  }

  return (
    <QuizPageLoaded
      definition={definition}
      rows={dataState.rows}
      backgroundPaths={backgroundPaths}
      lakePaths={lakePaths}
    />
  );
}

interface QuizPageLoadedProps {
  readonly definition: NonNullable<ReturnType<typeof getQuizById>>;
  readonly rows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly backgroundPaths: ReturnType<typeof useBackgroundPaths>;
  readonly lakePaths: ReturnType<typeof useLakePaths>;
}

function getInitialGroupByValue(definition: NonNullable<ReturnType<typeof getQuizById>>): string | undefined {
  const dg = definition.dynamicGrouping;
  if (!dg) return undefined;
  const selectToggle = definition.selectToggles?.find((t) => t.key === dg.selectToggleKey);
  return selectToggle?.defaultValue;
}

function QuizPageLoaded({ definition, rows, backgroundPaths, lakePaths }: QuizPageLoadedProps) {
  const [groupByValue, setGroupByValue] = useState(() => getInitialGroupByValue(definition));

  // Resolve effective grouping column and label from dynamic grouping (if configured)
  const dg = definition.dynamicGrouping;
  const effectiveGroupConfig = useMemo(() => {
    if (!dg || groupByValue === undefined) {
      return {
        column: definition.groupFilterColumn,
        chipLabel: definition.groupFilterLabel,
      };
    }
    const option = dg.options[groupByValue];
    return option
      ? { column: option.column, chipLabel: option.chipLabel }
      : { column: undefined, chipLabel: undefined };
  }, [dg, groupByValue, definition.groupFilterColumn, definition.groupFilterLabel]);

  // Override columnMappings.group when dynamic grouping is active
  const effectiveColumnMappings = useMemo(() => {
    if (!dg) return definition.columnMappings;
    const groupColumn = effectiveGroupConfig.column;
    if (groupColumn) {
      return { ...definition.columnMappings, group: groupColumn };
    }
    // "None" — remove group mapping
    const { group: _, ...rest } = definition.columnMappings;
    return rest;
  }, [dg, definition.columnMappings, effectiveGroupConfig.column]);

  const elements = useMemo(
    () => buildElements(definition.visualizationType, rows, effectiveColumnMappings),
    [definition.visualizationType, rows, effectiveColumnMappings],
  );
  const backgroundLabels = useMemo(() => {
    if (!backgroundPaths) return undefined;
    const allLabels = computeBackgroundLabels(backgroundPaths);
    return allLabels.filter((label) => label.sovereign && label.sovereign === label.name);
  }, [backgroundPaths]);
  const Renderer = resolveRenderer(definition.visualizationType);

  const availableGroups = useMemo(() => {
    if (!effectiveGroupConfig.column) return undefined;
    const elementIds = new Set(elements.map((el) => el.id));
    const elementRows = rows.filter((row) => elementIds.has(row['id'] ?? ''));
    return uniqueColumnValues(elementRows, effectiveGroupConfig.column);
  }, [rows, elements, effectiveGroupConfig.column]);

  const handleGroupByChange = useCallback((value: string) => {
    setGroupByValue(value);
  }, []);

  return (
    <div className={styles.page}>
      <QuizShell
        title={definition.title}
        description={definition.description}
        availableModes={definition.availableModes}
        defaultMode={definition.defaultMode}
        defaultCountdownSeconds={definition.defaultCountdownSeconds}
        toggles={definition.toggles}
        selectToggles={definition.selectToggles}
        presets={definition.presets}
        modeConstraints={definition.modeConstraints}
        rangeColumn={definition.rangeColumn}
        rangeLabel={definition.rangeLabel}
        rangeMax={definition.rangeColumn ? rows.length : undefined}
        groupFilterColumn={effectiveGroupConfig.column}
        groupFilterLabel={effectiveGroupConfig.chipLabel}
        availableGroups={availableGroups}
        dataRows={rows}
        dynamicGroupingKey={dg?.selectToggleKey}
        onGroupByChange={dg ? handleGroupByChange : undefined}
      >
        {(config) => (
          <ActiveQuiz
            config={config}
            visualizationType={definition.visualizationType}
            elements={elements}
            dataRows={rows}
            columnMappings={effectiveColumnMappings}
            toggleDefinitions={definition.toggles}
            selectToggleDefinitions={definition.selectToggles}
            Renderer={Renderer}
            backgroundPaths={backgroundPaths}
            lakePaths={lakePaths}
            backgroundLabels={backgroundLabels}
            rangeColumn={definition.rangeColumn}
            groupFilterColumn={effectiveGroupConfig.column}
            hideFilteredElements={definition.hideFilteredElements}
            hideUnfocusedElements={definition.hideUnfocusedElements}
            tributaryColumn={definition.tributaryColumn}
            distributaryColumn={definition.distributaryColumn}
            segmentColumn={definition.segmentColumn}
            initialCameraPosition={definition.initialCameraPosition}
            groupFilterCameraPositions={definition.groupFilterCameraPositions}
            locateDistanceMode={definition.locateDistanceMode}
          />
        )}
      </QuizShell>
    </div>
  );
}
