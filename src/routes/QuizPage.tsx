import { useMemo } from 'react';
import { useParams } from 'react-router';
import { getQuizById } from '@/quiz-definitions/getQuizById';
import { useQuizData } from '@/quiz-definitions/useQuizData';
import { buildElements } from '@/visualizations/buildElements';
import { resolveRenderer } from '@/visualizations/resolveRenderer';
import { useBackgroundPaths } from '@/visualizations/map/useBackgroundPaths';
import { computeBackgroundLabels } from '@/visualizations/map/computeBackgroundLabels';
import { QuizShell } from '@/quiz-modes/QuizShell';
import { ActiveQuiz } from '@/quiz-modes/ActiveQuiz';
import styles from './QuizPage.module.css';

export default function QuizPage() {
  const { '*': quizId } = useParams();
  const definition = quizId ? getQuizById(quizId) : undefined;
  const dataState = useQuizData(definition?.dataPath, definition?.dataFilter);
  const backgroundPaths = useBackgroundPaths(definition?.supportingDataPaths[0]);

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
    />
  );
}

interface QuizPageLoadedProps {
  readonly definition: NonNullable<ReturnType<typeof getQuizById>>;
  readonly rows: ReadonlyArray<Readonly<Record<string, string>>>;
  readonly backgroundPaths: ReturnType<typeof useBackgroundPaths>;
}

function QuizPageLoaded({ definition, rows, backgroundPaths }: QuizPageLoadedProps) {
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
            backgroundLabels={backgroundLabels}
            rangeColumn={definition.rangeColumn}
            initialCameraPosition={definition.initialCameraPosition}
          />
        )}
      </QuizShell>
    </div>
  );
}
