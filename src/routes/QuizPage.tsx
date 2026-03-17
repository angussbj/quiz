import { useParams } from 'react-router';
import { getQuizById } from '@/quiz-definitions/getQuizById';
import { useQuizData } from '@/quiz-definitions/useQuizData';
import styles from './QuizPage.module.css';

export default function QuizPage() {
  const { '*': quizId } = useParams();
  const definition = quizId ? getQuizById(quizId) : undefined;
  const dataState = useQuizData(definition?.dataPath);

  if (!quizId) {
    return (
      <main className={styles.page}>
        <p className={styles.message}>No quiz specified.</p>
      </main>
    );
  }

  if (!definition) {
    return (
      <main className={styles.page}>
        <p className={styles.message}>Quiz not found: {quizId}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.breadcrumbs}>
          {definition.path.map((segment, index) => (
            <span key={index}>
              {index > 0 && <span className={styles.separator}>/</span>}
              {segment}
            </span>
          ))}
        </nav>
        <h1 className={styles.title}>{definition.title}</h1>
        <p className={styles.description}>{definition.description}</p>
      </header>

      <section className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Visualization</span>
          <span className={styles.metaValue}>{definition.visualizationType}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Modes</span>
          <span className={styles.metaValue}>{definition.availableModes.join(', ')}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Default mode</span>
          <span className={styles.metaValue}>{definition.defaultMode}</span>
        </div>
        {definition.toggles.length > 0 && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Toggles</span>
            <span className={styles.metaValue}>
              {definition.toggles.map((t) => t.label).join(', ')}
            </span>
          </div>
        )}
      </section>

      <section className={styles.dataSection}>
        <h2 className={styles.sectionTitle}>Quiz Data</h2>
        <QuizDataDisplay state={dataState} />
      </section>
    </main>
  );
}

function QuizDataDisplay({ state }: { readonly state: ReturnType<typeof useQuizData> }) {
  switch (state.status) {
    case 'idle':
      return <p className={styles.message}>No data path configured.</p>;
    case 'loading':
      return <p className={styles.message}>Loading quiz data…</p>;
    case 'error':
      return <p className={styles.errorMessage}>{state.error}</p>;
    case 'loaded':
      if (state.rows.length === 0) {
        return <p className={styles.message}>No data rows found.</p>;
      }
      return (
        <div className={styles.dataPreview}>
          <p className={styles.rowCount}>{state.rows.length} rows loaded</p>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {Object.keys(state.rows[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.slice(0, 5).map((row) => (
                <tr key={row.id}>
                  {Object.values(row).map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
              ))}
              {state.rows.length > 5 && (
                <tr>
                  <td colSpan={Object.keys(state.rows[0]).length} className={styles.moreRows}>
                    …and {state.rows.length - 5} more
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      );
  }
}
