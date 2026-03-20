import { useMemo } from 'react';
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

/** Extract unique values from a column, preserving first-seen order. */
function uniqueColumnValues(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  column: string,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  const result: Array<string> = [];
  for (const row of rows) {
    const value = row[column] ?? '';
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(value);
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

function QuizPageLoaded({ definition, rows, backgroundPaths, lakePaths }: QuizPageLoadedProps) {
  const elements = useMemo(
    () => buildElements(definition.visualizationType, rows, definition.columnMappings),
    [definition.visualizationType, rows, definition.columnMappings],
  );
  const backgroundLabels = useMemo(() => {
    if (!backgroundPaths) return undefined;
    const allLabels = computeBackgroundLabels(backgroundPaths);
    const filter = definition.dataFilter;
    const filters = filter ? (Array.isArray(filter) ? filter : [filter]) : [];
    const regionFilter = filters.find((f) => f.column === 'region' || f.column === 'subregion');
    return allLabels.filter((label) => {
      // Only sovereign countries (sovereign matches name)
      if (!label.sovereign || label.sovereign !== label.name) return false;
      // Filter to quiz region/subregion if defined
      if (regionFilter) {
        const labelField = regionFilter.column === 'subregion' ? label.group : label.region;
        if (!labelField) return false;
        const labelValues = labelField.split('|');
        return regionFilter.values.some((v: string) => labelValues.includes(v));
      }
      return true;
    });
  }, [backgroundPaths, definition.dataFilter]);
  const Renderer = resolveRenderer(definition.visualizationType);

  const availableGroups = useMemo(() => {
    if (!definition.groupFilterColumn) return undefined;
    return uniqueColumnValues(rows, definition.groupFilterColumn);
  }, [rows, definition.groupFilterColumn]);

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
        groupFilterColumn={definition.groupFilterColumn}
        groupFilterLabel={definition.groupFilterLabel}
        availableGroups={availableGroups}
        dataRows={rows}
      >
        {(config) => (
          <ActiveQuiz
            config={config}
            visualizationType={definition.visualizationType}
            elements={elements}
            dataRows={rows}
            columnMappings={definition.columnMappings}
            toggleDefinitions={definition.toggles}
            selectToggleDefinitions={definition.selectToggles}
            Renderer={Renderer}
            backgroundPaths={backgroundPaths}
            lakePaths={lakePaths}
            backgroundLabels={backgroundLabels}
            rangeColumn={definition.rangeColumn}
            groupFilterColumn={definition.groupFilterColumn}
            hideFilteredElements={definition.hideFilteredElements}
            initialCameraPosition={definition.initialCameraPosition}
          />
        )}
      </QuizShell>
    </div>
  );
}
