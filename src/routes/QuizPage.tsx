import { useMemo } from 'react';
import { useParams } from 'react-router';
import { getQuizById } from '@/quiz-definitions/getQuizById';
import { useQuizData } from '@/quiz-definitions/useQuizData';
import { buildElements } from '@/visualizations/buildElements';
import { resolveRenderer } from '@/visualizations/resolveRenderer';
import { useBackgroundPaths } from '@/visualizations/map/useBackgroundPaths';
import { useLakePaths } from '@/visualizations/map/useLakePaths';
import { extractEmbeddedLakePaths } from '@/visualizations/map/extractEmbeddedLakePaths';
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

function QuizPageLoaded({ definition, rows, backgroundPaths, lakePaths }: QuizPageLoadedProps) {
  const elements = useMemo(
    () => buildElements(definition.visualizationType, rows, definition.columnMappings, definition.timeScale),
    [definition.visualizationType, rows, definition.columnMappings, definition.timeScale],
  );

  const embeddedLakePaths = useMemo(() => {
    if (definition.columnMappings['pathRenderStyle'] !== 'stroke') return undefined;
    return extractEmbeddedLakePaths(rows);
  }, [definition.columnMappings, rows]);

  const allLakePaths = useMemo(() => {
    if (!embeddedLakePaths?.length) return lakePaths;
    if (!lakePaths) return embeddedLakePaths;
    return [...lakePaths, ...embeddedLakePaths];
  }, [lakePaths, embeddedLakePaths]);
  const backgroundLabels = useMemo(() => {
    if (!backgroundPaths) return undefined;
    const allLabels = computeBackgroundLabels(backgroundPaths);
    return allLabels.filter((label) => label.sovereign && label.sovereign === label.name);
  }, [backgroundPaths]);
  const Renderer = resolveRenderer(definition.visualizationType);

  const availableGroups = useMemo(() => {
    if (!definition.groupFilterColumn) return undefined;
    // Filter to rows that have a corresponding quiz element — e.g. territory rows that get
    // merged or removed by buildElements should not contribute chips.
    const elementIds = new Set(elements.map((el) => el.id));
    const elementRows = rows.filter((row) => elementIds.has(row['id'] ?? ''));
    return uniqueColumnValues(elementRows, definition.groupFilterColumn);
  }, [rows, elements, definition.groupFilterColumn]);

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
            lakePaths={allLakePaths}
            backgroundLabels={backgroundLabels}
            rangeColumn={definition.rangeColumn}
            groupFilterColumn={definition.groupFilterColumn}
            hideFilteredElements={definition.hideFilteredElements}
            hideUnfocusedElements={definition.hideUnfocusedElements}
            tributaryColumn={definition.tributaryColumn}
            distributaryColumn={definition.distributaryColumn}
            segmentColumn={definition.segmentColumn}
            initialCameraPosition={definition.initialCameraPosition}
            groupFilterCameraPositions={definition.groupFilterCameraPositions}
            locateDistanceMode={definition.locateDistanceMode}
            timeScale={definition.timeScale}
            elementStateColorOverrides={definition.elementStateColorOverrides}
          />
        )}
      </QuizShell>
    </div>
  );
}
