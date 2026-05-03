import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import * as fs from 'fs';
import * as path from 'path';
import QuizPage from '../QuizPage';
import { quizRegistry } from '@/quiz-definitions/quizRegistry';
import { parseCsv } from '@/quiz-definitions/parseCsv';
import { applyDataFilter } from '@/quiz-definitions/applyDataFilter';
import { elementToggle } from '@/visualizations/elementToggle';
import type { VisualizationRendererProps } from '@/visualizations/VisualizationRendererProps';
import type { QuizModeType } from '@/quiz-definitions/QuizDefinition';

/**
 * Answer leakage tests.
 *
 * For every quiz x text-input mode combination, starts the quiz with default
 * settings, then inspects the renderer props and DOM to verify that no
 * unanswered quiz answer is visible.
 *
 * Checks two leakage vectors:
 * 1. Element labels: per-element toggle resolution would show the label for
 *    an unanswered element (via elementToggle + elementStates).
 * 2. Background labels: background country/region names passed to the
 *    renderer match a quiz answer.
 */

const MIN_ANSWER_LENGTH = 4;

const TEXT_INPUT_MODES: ReadonlyArray<QuizModeType> = [
  'free-recall-unordered',
  'free-recall-ordered',
  'prompted-recall',
];

const MODE_LABELS: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Name in any order',
  'free-recall-ordered': 'Name in order',
  'identify': 'Point and click',
  'locate': 'Place it',
  'prompted-recall': 'Name on sight',
  'multiple-choice': 'Multiple choice',
};

/**
 * Toggle keys that control answer label visibility, per visualization type.
 * If ANY of these toggles is true for an element, the answer label is visible.
 *
 * Only toggles that the quiz actually defines are checked — the elementToggle
 * helper defaults to true for undefined keys, which would cause false positives
 * for irrelevant toggle names.
 */
const LABEL_TOGGLE_KEYS: Readonly<Record<string, ReadonlyArray<string>>> = {
  map: ['showCityNames', 'showCountryNames', 'showRiverNames'],
  'flag-grid': ['showCountryNames'],
  timeline: ['showLabels'],
  anatomy: ['showLabels'],
  grid: ['showNames'],
};

const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

const csvCache = new Map<string, string>();

function readCsvFile(dataPath: string): string {
  const cached = csvCache.get(dataPath);
  if (cached !== undefined) return cached;
  const filePath = path.join(PUBLIC_DIR, dataPath);
  const content = fs.readFileSync(filePath, 'utf-8');
  csvCache.set(dataPath, content);
  return content;
}

function mockFetchForQuiz(quiz: typeof quizRegistry[number]): void {
  const csvFiles = new Map<string, string>();
  csvFiles.set(quiz.dataPath, readCsvFile(quiz.dataPath));
  for (const supportingPath of quiz.supportingDataPaths) {
    try {
      csvFiles.set(supportingPath, readCsvFile(supportingPath));
    } catch {
      // Supporting file may not exist on disk; fetch will 404
    }
  }

  globalThis.fetch = jest.fn().mockImplementation((url: string) => {
    for (const [dataPath, csv] of csvFiles) {
      if (url === dataPath || url.endsWith(dataPath)) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ 'content-type': 'text/csv' }),
          text: () => Promise.resolve(csv),
        });
      }
    }
    return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
  });
}

function getAnswerSet(quiz: typeof quizRegistry[number]): ReadonlySet<string> {
  const csvText = readCsvFile(quiz.dataPath);
  let rows = parseCsv(csvText);
  if (quiz.dataFilter) {
    rows = applyDataFilter(rows, quiz.dataFilter);
  }
  const answerColumn = quiz.columnMappings['answer'];
  const answers = new Set<string>();
  for (const row of rows) {
    const answer = row[answerColumn];
    if (answer && answer.length >= MIN_ANSWER_LENGTH) {
      answers.add(answer.toLowerCase());
    }
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Spy renderer — captures props passed by quiz modes
// ---------------------------------------------------------------------------

let lastRendererProps: VisualizationRendererProps | undefined;

/**
 * Replaces the real visualization renderer via module mock.
 * Captures every set of props the quiz mode passes, so we can inspect
 * element states, toggle values, and background labels.
 */
jest.mock('@/visualizations/resolveRenderer', () => ({
  resolveRenderer: () => function SpyRenderer(props: VisualizationRendererProps) {
    lastRendererProps = props;
    return null;
  },
}));

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderQuizPage(quizId: string) {
  return render(
    <MemoryRouter initialEntries={[`/${quizId}`]}>
      <Routes>
        <Route path="/*" element={<QuizPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestCase {
  readonly quizId: string;
  readonly quizTitle: string;
  readonly mode: QuizModeType;
}

const testCases: ReadonlyArray<TestCase> = quizRegistry.flatMap((quiz) =>
  quiz.availableModes
    .filter((mode): mode is QuizModeType => TEXT_INPUT_MODES.includes(mode))
    .map((mode) => ({
      quizId: quiz.id,
      quizTitle: quiz.title,
      mode,
    })),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('No answers leaked in active quiz DOM', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    lastRendererProps = undefined;
    // Set panel level to 'full' so mode selector and all toggles are visible
    localStorage.setItem('quizzical:panelLevel', '"full"');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test.each(
    testCases.map((tc) => [
      `${tc.quizTitle} — ${MODE_LABELS[tc.mode]}`,
      tc,
    ] as const),
  )('%s', async (_label, testCase) => {
    const { quizId, mode } = testCase;
    const quiz = quizRegistry.find((q) => q.id === quizId);
    if (!quiz) throw new Error(`Quiz not found: ${quizId}`);

    const user = userEvent.setup();
    mockFetchForQuiz(quiz);
    renderQuizPage(quizId);

    // Wait for data to load and setup panel to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Quiz' })).toBeInTheDocument();
    });

    // Select mode if different from default (or preset default)
    const presetMode = quiz.difficultyPresets?.slots[0]?.mode ?? quiz.defaultMode;
    if (mode !== presetMode) {
      // Wait for mode selector to appear (panel level loads async from localStorage)
      const modeSelect = await waitFor(() => screen.getByLabelText('Mode'));
      await user.selectOptions(modeSelect, mode);
    }

    // Start the quiz
    await user.click(screen.getByRole('button', { name: 'Start Quiz' }));

    // Verify we transitioned to the active quiz phase
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reconfigure' })).toBeInTheDocument();
    });

    // The spy renderer should have been called with props
    expect(lastRendererProps).toBeDefined();
    if (!lastRendererProps) return;

    const props = lastRendererProps;
    const answerSet = getAnswerSet(quiz);

    // Only check toggle keys that the quiz actually defines — the elementToggle
    // helper defaults to true for undefined keys, which would cause false positives.
    const quizToggleKeys = new Set(quiz.toggles.map((t) => t.key));
    const labelToggleKeys = (LABEL_TOGGLE_KEYS[quiz.visualizationType] ?? [])
      .filter((key) => quizToggleKeys.has(key));
    const leaks: Array<string> = [];

    // -----------------------------------------------------------------------
    // Check 1: Element labels — no unanswered element should have a label
    // toggle resolved to true
    // -----------------------------------------------------------------------
    for (const element of props.elements) {
      const state = props.elementStates[element.id];
      // Hidden elements never render — safe
      if (state === 'hidden') continue;
      // Answered elements are allowed to show labels
      if (state === 'correct' || state === 'correct-second' || state === 'correct-third'
        || state === 'incorrect' || state === 'missed') continue;

      // This element is unanswered but visible (e.g. highlighted, default, context).
      // Check if any label toggle would show the answer.
      if (!answerSet.has(element.label.toLowerCase())) continue;
      if (element.label.length < MIN_ANSWER_LENGTH) continue;

      for (const toggleKey of labelToggleKeys) {
        if (elementToggle(props.elementToggles, props.toggles, element.id, toggleKey)) {
          leaks.push(`Element "${element.label}" (${element.id}): toggle "${toggleKey}" is ON in state "${state}"`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Check 2: Background labels — country/region names that match answers
    // -----------------------------------------------------------------------
    if (props.backgroundLabels) {
      for (const label of props.backgroundLabels) {
        if (!label.name || label.name.length < MIN_ANSWER_LENGTH) continue;
        if (!answerSet.has(label.name.toLowerCase())) continue;

        // Background label matches an answer — check if it's visible
        if (props.toggles['showCountryNames']) {
          leaks.push(`Background label "${label.name}": showCountryNames is ON`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // Check 3: DOM text content — catch anything else (prompt fields, UI text)
    // -----------------------------------------------------------------------
    const domText = document.body.textContent ?? '';

    // Strip the quiz title and description — these are allowed exceptions
    let textToCheck = domText;
    for (const allowed of [quiz.title, quiz.description]) {
      if (allowed) {
        textToCheck = textToCheck.replace(new RegExp(escapeRegExp(allowed), 'gi'), '');
      }
    }
    const textToCheckLower = textToCheck.toLowerCase();

    for (const answer of answerSet) {
      if (textToCheckLower.includes(answer)) {
        leaks.push(`Answer "${answer}" found in DOM text`);
      }
    }

    expect(leaks).toEqual([]);
  }, 30_000);
});
