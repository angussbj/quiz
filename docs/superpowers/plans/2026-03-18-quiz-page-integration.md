# Quiz Page Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire QuizPage, QuizShell, visualization renderers, and quiz modes together into a working end-to-end quiz experience.

**Architecture:** QuizPage loads a QuizDefinition and its CSV data, converts rows into VisualizationElements via per-visualization-type builders, then renders QuizShell (which owns the config→active state machine). QuizShell's render prop passes toggle values down to a mode adapter layer that instantiates the correct quiz mode component with the correct renderer. A new QuizSetupPanel replaces TogglePanel as the top-level config screen, adding mode selection and timer configuration alongside toggle controls. An ActiveQuiz component manages the active phase: timer, mode adapter, finish detection, and results overlay.

**Tech Stack:** React, TypeScript, Framer Motion, CSS Modules, Jest + Testing Library

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/quiz-modes/QuizSetupPanel.tsx` | Config screen: mode selector, timer config, toggle panel, start button |
| `src/quiz-modes/QuizSetupPanel.module.css` | Styles for QuizSetupPanel |
| `src/quiz-modes/QuizResults.tsx` | Results overlay: score, time, progress bar, confetti at 100% |
| `src/quiz-modes/QuizResults.module.css` | Styles for results |
| `src/quiz-modes/ActiveQuiz.tsx` | Active quiz phase: timer, mode adapter, finish detection, results |
| `src/quiz-modes/ActiveQuiz.module.css` | Styles for active quiz layout |
| `src/quiz-modes/ModeAdapter.tsx` | Maps (QuizModeType × Renderer) → correct mode+renderer composition |
| `src/quiz-modes/ModeAdapter.module.css` | Layout styles for mode adapter |
| `src/visualizations/buildElements.ts` | Dispatcher: calls the right builder based on VisualizationType |
| `src/visualizations/resolveRenderer.ts` | Maps VisualizationType → renderer component |
| `src/visualizations/map/buildMapElements.ts` | Converts QuizDataRow[] → MapElement[] |
| `src/visualizations/map/loadBackgroundPaths.ts` | Parses CSV rows into BackgroundPath[] |
| `src/visualizations/map/useBackgroundPaths.ts` | React hook wrapping loadBackgroundPaths |
| `src/visualizations/periodic-table/buildGridElements.ts` | Converts QuizDataRow[] → GridElement[] |
| `src/visualizations/timeline/buildTimelineElementsFromRows.ts` | Converts QuizDataRow[] → TimelineElement[] |
| `src/visualizations/map/tests/buildMapElements.test.ts` | Tests |
| `src/visualizations/map/tests/loadBackgroundPaths.test.ts` | Tests |
| `src/visualizations/periodic-table/tests/buildGridElements.test.ts` | Tests |
| `src/visualizations/timeline/tests/buildTimelineElementsFromRows.test.ts` | Tests |
| `src/visualizations/tests/buildElements.test.ts` | Tests |
| `src/quiz-modes/tests/QuizSetupPanel.test.tsx` | Tests |
| `src/quiz-modes/tests/QuizResults.test.tsx` | Tests |
| `src/quiz-modes/tests/ModeAdapter.test.tsx` | Tests |
| `src/quiz-modes/tests/ActiveQuiz.test.tsx` | Tests |
| `src/routes/tests/QuizPage.test.tsx` | Integration tests |

### Modified files

| File | Change |
|------|--------|
| `src/quiz-modes/QuizShell.tsx` | Accept mode/timer config, use QuizSetupPanel, pass QuizConfig to render prop |
| `src/quiz-modes/QuizShell.module.css` | Minor layout adjustments |
| `src/quiz-modes/TogglePanel.tsx` | Slim to toggle-only (remove title/description/start button) |
| `src/quiz-modes/TogglePanel.module.css` | Remove heading/button styles |
| `src/routes/QuizPage.tsx` | Full rewrite: load data, build elements, render QuizShell |
| `src/routes/QuizPage.module.css` | Rewrite for quiz layout |
| `src/quiz-definitions/quizRegistry.ts` | Update supportingDataPaths to use .csv |
| `docs/features.md` | Mark feature 15 as DONE |

---

## Key Design Decisions

### Background Paths CSV Format

Supporting data uses CSV with a `paths` column. Multiple SVG path `d` strings are separated by `|` (pipe). Pipe was chosen because SVG path data never contains `|`.

```csv
id,name,group,paths
france,France,Western Europe,"M -1.8,-48.5 L 2.5,-51.1 Z|M 8,-45 L 9,-44 Z"
```

### Mode Composition Patterns

Each mode has a different composition pattern. ModeAdapter handles all three:

**FreeRecallMode** — External hook pattern. ModeAdapter calls `useFreeRecallSession()` to get session state, then renders `<Renderer>` and `<FreeRecallMode>` separately. FreeRecallMode takes `QuizModeProps` — unused callbacks get no-ops.

**IdentifyMode** — Render prop pattern. ModeAdapter passes `renderVisualization` callback that renders the `<Renderer>`. IdentifyMode extends `QuizModeProps` — unused callbacks get no-ops. IdentifyMode manages its own state via `useIdentifyQuiz`.

**LocateMode** — Component prop pattern. ModeAdapter passes `Renderer` as a component type prop. LocateMode has its own `LocateModeProps` (NOT extending QuizModeProps). LocateMode manages its own state via `useLocateQuiz`.

**Unimplemented modes** (`free-recall-ordered`, `multiple-choice`): ModeAdapter renders a "Mode not yet available" placeholder.

### Quiz Completion Detection

Each mode signals completion differently — none has an `onFinish` callback:
- **FreeRecallMode**: `session.status === 'finished'` (from `useFreeRecallSession`)
- **IdentifyMode**: `quiz.isFinished` (internal to `useIdentifyQuiz`)
- **LocateMode**: `quiz.isFinished` (internal to `useLocateQuiz`)

Solution: ModeAdapter exposes finish state via a **ref callback**. ActiveQuiz polls or watches for finish. For free recall, this is straightforward (session state is external). For identify/locate, ModeAdapter wraps the internal hooks and exposes an `isFinished` boolean via an `onStatusChange` callback.

Actually, the simplest approach: ModeAdapter is split into per-mode sub-components (`FreeRecallAdapter`, `IdentifyAdapter`, `LocateAdapter`). Each sub-component calls its mode's hook and reports status changes via an `onStatusChange(status: 'active' | 'finished', score: ScoreResult)` callback. ActiveQuiz receives this and shows results.

### Timer Elapsed Time

The Timer component manages elapsed state internally. To pass elapsed time to QuizResults, ActiveQuiz manages its own elapsed seconds counter (a simple `useEffect` with `setInterval`). Timer is rendered for display but ActiveQuiz owns the authoritative time for scoring. This avoids modifying Timer's interface.

### Score Display During Active Quiz

Each mode renders its own progress display (e.g., "7/50", progress bar). No separate score widget is needed at the integration level.

---

## Task Breakdown

### Task 1: Slim down TogglePanel to a toggle-only component

TogglePanel currently renders the full config screen. Extract toggle + preset controls into a standalone component so QuizSetupPanel can compose it.

**Files:**
- Modify: `src/quiz-modes/TogglePanel.tsx`
- Modify: `src/quiz-modes/TogglePanel.module.css`

- [ ] **Step 1: Read existing TogglePanel and its CSS**

Read `src/quiz-modes/TogglePanel.tsx` and `src/quiz-modes/TogglePanel.module.css`.

- [ ] **Step 2: Modify TogglePanel to remove title/description/start/container**

New props interface:
```ts
interface TogglePanelProps {
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly values: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
}
```

Remove `title`, `description`, `onStart` props. Remove outer `.container`/`.content` wrapper, `<h1>`, `<p>`, and start button. Keep presets + toggle groups + ToggleSwitch.

- [ ] **Step 3: Update TogglePanel CSS**

Remove `.container`, `.content`, `.title`, `.description`, `.startButton`. Keep `.section`, `.sectionTitle`, `.presetRow`, `.presetButton`, `.toggleList`, `.toggleRow`, `.toggleLabel`, `.switch`, `.switchThumb`.

- [ ] **Step 4: Update TogglePanel.stories.tsx**

Remove `title`, `description`, `onStart` from story args.

- [ ] **Step 5: Run typecheck and tests, fix any breakage**

Run: `npm run typecheck`
Run: `npm test`

- [ ] **Step 6: Commit**

```
refactor: slim TogglePanel to toggle-only component
```

---

### Task 2: Create QuizSetupPanel

Config screen that wraps TogglePanel and adds mode selection + timer config.

**Files:**
- Create: `src/quiz-modes/QuizSetupPanel.tsx`
- Create: `src/quiz-modes/QuizSetupPanel.module.css`
- Create: `src/quiz-modes/tests/QuizSetupPanel.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// - renders title and description
// - renders mode selector with available modes as human-readable labels
// - default mode is pre-selected
// - changing mode calls onModeChange
// - hides mode selector when only one mode available
// - renders timer input showing minutes
// - clearing timer input calls onCountdownChange(undefined)
// - renders TogglePanel with correct props
// - clicking Start calls onStart
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern QuizSetupPanel`

- [ ] **Step 3: Implement QuizSetupPanel**

```ts
interface QuizSetupPanelProps {
  readonly title: string;
  readonly description?: string;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly selectedMode: QuizModeType;
  readonly onModeChange: (mode: QuizModeType) => void;
  readonly countdownMinutes: number | undefined;
  readonly onCountdownChange: (minutes: number | undefined) => void;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onToggleChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
  readonly onStart: () => void;
}
```

Layout: title + description → mode selector (`<select>`) → timer input (`<input type="number" min="1">` with "minutes" label) → TogglePanel → Start Quiz button.

Mode labels:
```ts
const MODE_LABELS: Readonly<Record<QuizModeType, string>> = {
  'free-recall-unordered': 'Free Recall',
  'free-recall-ordered': 'Ordered Recall',
  'identify': 'Identify',
  'locate': 'Locate',
  'multiple-choice': 'Multiple Choice',
};
```

- [ ] **Step 4: Write CSS**

Quiet layout using theme variables. Sections separated by spacing. Mode selector and timer compact.

- [ ] **Step 5: Run tests**

Run: `npm test -- --testPathPattern QuizSetupPanel`
Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```
feat: add QuizSetupPanel with mode and timer configuration
```

---

### Task 3: Update QuizShell to use QuizSetupPanel

Replace TogglePanel usage with QuizSetupPanel. Add mode and countdown state. Export `QuizConfig` type.

**Files:**
- Modify: `src/quiz-modes/QuizShell.tsx`
- Modify: `src/quiz-modes/QuizShell.module.css`

- [ ] **Step 1: Update QuizShellProps and add QuizConfig**

```ts
export interface QuizConfig {
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectedMode: QuizModeType;
  readonly countdownSeconds: number | undefined;
}

interface QuizShellProps {
  readonly title: string;
  readonly description?: string;
  readonly availableModes: ReadonlyArray<QuizModeType>;
  readonly defaultMode: QuizModeType;
  readonly defaultCountdownSeconds?: number;
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly children: (config: QuizConfig) => ReactNode;
}
```

- [ ] **Step 2: Add mode and countdown state**

```ts
const [selectedMode, setSelectedMode] = useState(defaultMode);
const [countdownMinutes, setCountdownMinutes] = useState<number | undefined>(
  defaultCountdownSeconds !== undefined ? Math.ceil(defaultCountdownSeconds / 60) : undefined,
);
```

- [ ] **Step 3: Replace TogglePanel with QuizSetupPanel in configuring phase**

Configuring phase renders `<QuizSetupPanel>`. Active phase renders `children({ toggleValues: toggleState.values, selectedMode, countdownSeconds: countdownMinutes ? countdownMinutes * 60 : undefined })`. Reconfigure button stays in active phase.

- [ ] **Step 4: Update QuizShell.stories.tsx**

Add `availableModes`, `defaultMode` to story args. Update children to use `QuizConfig`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npm run typecheck`
Run: `npm test`

- [ ] **Step 6: Commit**

```
feat: update QuizShell with mode selection and timer config
```

---

### Task 4: Build map element converter (buildMapElements)

**Files:**
- Create: `src/visualizations/map/buildMapElements.ts`
- Create: `src/visualizations/map/tests/buildMapElements.test.ts`

- [ ] **Step 1: Write tests**

```ts
// - converts rows with latitude/longitude to MapElements with projected viewBoxCenter
// - uses columnMappings to find label and group columns
// - handles rows with 'paths' column (for country quizzes)
// - handles rows without 'paths' (city-only quizzes — svgPathData is '')
// - computes viewBoxBounds as small square around viewBoxCenter
// - uses 'code' column if present, falls back to id
// - returns empty array for empty input
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement buildMapElements**

```ts
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { MapElement } from './MapElement';
import { projectGeo } from './projectGeo';

const DOT_RADIUS = 0.3;

export function buildMapElements(
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<MapElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  return rows.map((row) => {
    const lat = parseFloat(row['latitude'] ?? '0');
    const lng = parseFloat(row['longitude'] ?? '0');
    const center = projectGeo({ latitude: lat, longitude: lng });

    return {
      id: row.id,
      label: row[labelColumn] ?? row.id,
      geoCoordinates: { latitude: lat, longitude: lng },
      viewBoxCenter: center,
      viewBoxBounds: {
        minX: center.x - DOT_RADIUS,
        minY: center.y - DOT_RADIUS,
        maxX: center.x + DOT_RADIUS,
        maxY: center.y + DOT_RADIUS,
      },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
      svgPathData: row['paths'] ?? '',
      code: row['code'] ?? row.id,
    };
  });
}
```

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add buildMapElements to convert CSV rows to MapElements
```

---

### Task 5: Build grid element converter (buildGridElements)

**Files:**
- Create: `src/visualizations/periodic-table/buildGridElements.ts`
- Create: `src/visualizations/periodic-table/tests/buildGridElements.test.ts`

- [ ] **Step 1: Write tests**

```ts
// - converts rows with row/column to GridElements
// - uses columnMappings for label and group columns
// - reads 'symbol' column
// - computes viewBoxCenter/viewBoxBounds from row/column via CELL_SIZE/CELL_STEP
// - returns empty array for empty input
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement buildGridElements**

```ts
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { GridElement } from './GridElement';
import { CELL_SIZE, CELL_STEP } from './cellLayout';

export function buildGridElements(
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<GridElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  return rows.map((row) => {
    const rowIndex = parseInt(row['row'] ?? '0', 10);
    const colIndex = parseInt(row['column'] ?? '0', 10);
    const x = colIndex * CELL_STEP;
    const y = rowIndex * CELL_STEP;

    return {
      id: row.id,
      label: row[labelColumn] ?? row.id,
      row: rowIndex,
      column: colIndex,
      symbol: row['symbol'] ?? row[labelColumn]?.slice(0, 2) ?? row.id,
      viewBoxCenter: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
      viewBoxBounds: { minX: x, minY: y, maxX: x + CELL_SIZE, maxY: y + CELL_SIZE },
      interactive: true,
      group: groupColumn ? row[groupColumn] : undefined,
    };
  });
}
```

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add buildGridElements to convert CSV rows to GridElements
```

---

### Task 6: Build timeline element converter (buildTimelineElementsFromRows)

**Files:**
- Create: `src/visualizations/timeline/buildTimelineElementsFromRows.ts`
- Create: `src/visualizations/timeline/tests/buildTimelineElementsFromRows.test.ts`

- [ ] **Step 1: Write tests**

```ts
// - converts rows with start_year to TimelineElements
// - handles rows with end_year
// - handles full date columns (start_year, start_month, start_day)
// - uses columnMappings for label and group
// - reads 'category' column or falls back to group
// - returns empty array for empty input
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**

```ts
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { TimelineElement } from './TimelineElement';
import type { TimelineTimestamp } from './TimelineTimestamp';
import { buildTimelineElements, type TimelineElementInput } from './buildTimelineElements';

function parseTimestamp(row: QuizDataRow, prefix: string): TimelineTimestamp | undefined {
  const year = row[`${prefix}_year`] ?? row[prefix];
  if (!year) return undefined;
  const yearNum = parseInt(year, 10);
  const month = row[`${prefix}_month`];
  if (!month) return [yearNum];
  const monthNum = parseInt(month, 10);
  const day = row[`${prefix}_day`];
  if (!day) return [yearNum, monthNum];
  return [yearNum, monthNum, parseInt(day, 10)];
}

export function buildTimelineElementsFromRows(
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<TimelineElement> {
  const labelColumn = columnMappings['label'] ?? 'label';
  const groupColumn = columnMappings['group'];

  const inputs: TimelineElementInput[] = [];
  for (const row of rows) {
    const start = parseTimestamp(row, 'start');
    if (!start) continue;
    inputs.push({
      id: row.id,
      label: row[labelColumn] ?? row.id,
      start,
      end: parseTimestamp(row, 'end'),
      category: row['category'] ?? (groupColumn ? row[groupColumn] : '') ?? '',
      group: groupColumn ? row[groupColumn] : undefined,
    });
  }

  return buildTimelineElements(inputs);
}
```

Note: `parseTimestamp` returns proper tuple types `[number]`, `[number, number]`, or `[number, number, number]` — no `as` casting needed.

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add buildTimelineElementsFromRows to convert CSV rows to TimelineElements
```

---

### Task 7: Build element dispatcher and renderer resolver

**Files:**
- Create: `src/visualizations/buildElements.ts`
- Create: `src/visualizations/resolveRenderer.ts`
- Create: `src/visualizations/tests/buildElements.test.ts`

- [ ] **Step 1: Write tests for buildElements**

```ts
// - dispatches to buildMapElements for 'map'
// - dispatches to buildGridElements for 'grid'
// - dispatches to buildTimelineElementsFromRows for 'timeline'
```

- [ ] **Step 2: Implement buildElements**

```ts
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { VisualizationType } from './VisualizationRendererProps';
import type { VisualizationElement } from './VisualizationElement';
import { buildMapElements } from './map/buildMapElements';
import { buildGridElements } from './periodic-table/buildGridElements';
import { buildTimelineElementsFromRows } from './timeline/buildTimelineElementsFromRows';

export function buildElements(
  visualizationType: VisualizationType,
  rows: ReadonlyArray<QuizDataRow>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<VisualizationElement> {
  switch (visualizationType) {
    case 'map':
      return buildMapElements(rows, columnMappings);
    case 'grid':
      return buildGridElements(rows, columnMappings);
    case 'timeline':
      return buildTimelineElementsFromRows(rows, columnMappings);
  }
}
```

- [ ] **Step 3: Implement resolveRenderer**

```ts
import type { ComponentType } from 'react';
import type { VisualizationRendererProps, VisualizationType } from './VisualizationRendererProps';
import { MapRenderer } from './map/MapRenderer';
import { PeriodicTableRenderer } from './periodic-table/PeriodicTableRenderer';
import { TimelineRenderer } from './timeline/TimelineRenderer';

const RENDERERS: Readonly<Record<VisualizationType, ComponentType<VisualizationRendererProps>>> = {
  map: MapRenderer,
  grid: PeriodicTableRenderer,
  timeline: TimelineRenderer,
};

export function resolveRenderer(
  visualizationType: VisualizationType,
): ComponentType<VisualizationRendererProps> {
  return RENDERERS[visualizationType];
}
```

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add buildElements dispatcher and resolveRenderer
```

---

### Task 8: Background path loading

**Files:**
- Create: `src/visualizations/map/loadBackgroundPaths.ts`
- Create: `src/visualizations/map/useBackgroundPaths.ts`
- Create: `src/visualizations/map/tests/loadBackgroundPaths.test.ts`
- Modify: `src/quiz-definitions/quizRegistry.ts` (update supportingDataPaths extension)

- [ ] **Step 1: Write tests for parseBackgroundPaths**

```ts
// - parses CSV rows with id, name, group, paths into BackgroundPath[]
// - splits paths column by | into multiple entries per row
// - handles single path per row
// - handles empty paths column
// - handles empty input
```

- [ ] **Step 2: Implement parseBackgroundPaths**

```ts
import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import type { BackgroundPath } from '../VisualizationRendererProps';

export function parseBackgroundPaths(
  rows: ReadonlyArray<QuizDataRow>,
): ReadonlyArray<BackgroundPath> {
  const result: BackgroundPath[] = [];
  for (const row of rows) {
    const pathsRaw = row['paths'] ?? '';
    if (!pathsRaw.trim()) continue;
    const pathSegments = pathsRaw.split('|');
    for (let i = 0; i < pathSegments.length; i++) {
      const d = pathSegments[i].trim();
      if (!d) continue;
      result.push({
        id: pathSegments.length > 1 ? `${row.id}-${i}` : row.id,
        svgPathData: d,
        group: row['group'] ?? row['name'],
      });
    }
  }
  return result;
}
```

- [ ] **Step 3: Implement useBackgroundPaths hook**

Uses `fetchQuizData` (same CSV fetcher used by `useQuizData`) then `parseBackgroundPaths`.

- [ ] **Step 4: Update quizRegistry**

Change `europe-borders.svg` → `europe-borders.csv`.

- [ ] **Step 5: Run tests and typecheck**

- [ ] **Step 6: Commit**

```
feat: add background path loading from CSV supporting data
```

---

### Task 9: Build ModeAdapter

Maps (mode type × renderer) into the correct composition for each quiz mode. Split into per-mode sub-components for clarity.

**Files:**
- Create: `src/quiz-modes/ModeAdapter.tsx`
- Create: `src/quiz-modes/ModeAdapter.module.css`
- Create: `src/quiz-modes/tests/ModeAdapter.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// - renders FreeRecallMode + Renderer for 'free-recall-unordered'
// - renders IdentifyMode with renderVisualization for 'identify'
// - renders LocateMode with Renderer prop for 'locate'
// - renders "not yet available" for 'free-recall-ordered' and 'multiple-choice'
// - calls onStatusChange('finished', score) when mode completes
// - passes toggleValues, toggleDefinitions, backgroundPaths, clustering through
```

- [ ] **Step 2: Implement ModeAdapter**

```ts
interface ModeAdapterProps {
  readonly mode: QuizModeType;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<QuizDataRow>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly clustering?: ClusteringConfig;
  readonly onStatusChange: (status: 'active' | 'finished', score: ScoreResult) => void;
}
```

**FreeRecallAdapter** sub-component:
- Calls `useFreeRecallSession({ elements, dataRows, answerColumn: columnMappings['answer'], toggleDefinitions, toggleValues })`
- Renders `<Renderer elements={elements} elementStates={session.elementStates} toggles={toggleValues} elementToggles={elementToggles} backgroundPaths={backgroundPaths} clustering={clustering} />`
- Renders `<FreeRecallMode session={session} onTextAnswer={handleTextAnswer} onGiveUp={handleGiveUp} elements={elements} dataRows={dataRows} columnMappings={columnMappings} toggleDefinitions={toggleDefinitions} onElementSelect={noop} onPositionSelect={noop} onChoiceSelect={noop} onHintRequest={noop} onSkip={noop} />`
- Watches `session.status` and calls `onStatusChange` when it becomes `'finished'`
- CSS: visualization fills available space, FreeRecallMode controls pinned to bottom

**IdentifyAdapter** sub-component:
- Renders `<IdentifyMode elements={elements} dataRows={dataRows} columnMappings={columnMappings} toggleDefinitions={toggleDefinitions} toggleValues={toggleValues} session={stubSession} onTextAnswer={noop} onElementSelect={noop} onPositionSelect={noop} onChoiceSelect={noop} onHintRequest={noop} onSkip={noop} onGiveUp={noop} renderVisualization={renderProps => <Renderer elements={elements} {...renderProps} backgroundPaths={backgroundPaths} clustering={clustering} />} />`
- `stubSession` is a minimal `QuizSessionState` that satisfies the type (IdentifyMode doesn't actually read it — it uses its own `useIdentifyQuiz`)
- Detects finish: IdentifyMode's internal `quiz.isFinished` is not accessible from outside. Two options: (a) watch for the finished overlay that IdentifyMode renders, or (b) refactor IdentifyMode to accept an `onFinish` callback. **Chosen approach:** Add an optional `onFinish?: (score: ScoreResult) => void` prop to `IdentifyModeProps`. IdentifyMode calls it when `quiz.isFinished` becomes true. This is a minimal, non-breaking change.

**LocateAdapter** sub-component:
- Renders `<LocateMode elements={elements} toggles={toggleValues} toggleDefinitions={toggleDefinitions} Renderer={Renderer} backgroundPaths={backgroundPaths} clustering={clustering} />`
- Same finish detection approach: add optional `onFinish` prop to `LocateModeProps`.

**Unimplemented modes:** Render a centered message "This mode is not yet available."

- [ ] **Step 3: Add onFinish prop to IdentifyMode and LocateMode**

Modify `src/quiz-modes/identify/IdentifyMode.tsx`:
- Add `readonly onFinish?: (score: ScoreResult) => void` to `IdentifyModeProps`
- Add `useEffect` that calls `onFinish(quiz.score)` when `quiz.isFinished` becomes true

Modify `src/quiz-modes/locate/LocateMode.tsx`:
- Add `readonly onFinish?: (score: ScoreResult) => void` to `LocateModeProps`
- Add `useEffect` that calls `onFinish(quiz.score)` when `quiz.isFinished` becomes true

These are additive, optional changes — existing consumers are unaffected.

- [ ] **Step 4: Write CSS**

Layout: flex column. Visualization area fills available space (flex: 1). Mode controls area (input, progress, prompts) at the bottom with fixed height.

- [ ] **Step 5: Run tests and typecheck**

- [ ] **Step 6: Commit**

```
feat: add ModeAdapter to wire quiz modes with renderers
```

---

### Task 10: Build QuizResults screen

**Files:**
- Create: `src/quiz-modes/QuizResults.tsx`
- Create: `src/quiz-modes/QuizResults.module.css`
- Create: `src/quiz-modes/tests/QuizResults.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// - renders score percentage
// - renders correct/total count
// - renders elapsed time as MM:SS
// - shows "Try again" button
// - clicking "Try again" calls onRetry
// - shows confetti when percentage is 100
// - does not show confetti when percentage < 100
// - progress bar fills to correct percentage
```

- [ ] **Step 2: Implement QuizResults**

```ts
interface QuizResultsProps {
  readonly correct: number;
  readonly total: number;
  readonly percentage: number;
  readonly elapsedSeconds: number;
  readonly onRetry: () => void;
}
```

Design:
- Card overlay with subtle backdrop blur
- Large percentage with Framer Motion scale-in
- Progress bar filling to final percentage
- "X of Y correct" subtitle
- Elapsed time display
- "Try again" button (motion.button)
- At 100%: confetti — small colored circles that burst outward from the score using Framer Motion variants, then fade. Simple, not a library.

- [ ] **Step 3: Write CSS**

Card centered, backdrop blur, progress bar, clean typography using theme variables.

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add QuizResults screen with score display and confetti
```

---

### Task 11: Build ActiveQuiz component

Manages the active quiz phase: timer, mode adapter, finish detection, results overlay.

**Files:**
- Create: `src/quiz-modes/ActiveQuiz.tsx`
- Create: `src/quiz-modes/ActiveQuiz.module.css`
- Create: `src/quiz-modes/tests/ActiveQuiz.test.tsx`

- [ ] **Step 1: Write tests**

```tsx
// - renders Timer when countdownSeconds is provided
// - renders ModeAdapter with correct props
// - shows QuizResults when mode signals finished
// - tracks elapsed seconds independently
// - clicking "Try again" calls onRetry
// - timer onExpire triggers give-up
```

- [ ] **Step 2: Implement ActiveQuiz**

```ts
interface ActiveQuizProps {
  readonly config: QuizConfig;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly dataRows: ReadonlyArray<QuizDataRow>;
  readonly columnMappings: Readonly<Record<string, string>>;
  readonly toggleDefinitions: ReadonlyArray<ToggleDefinition>;
  readonly Renderer: ComponentType<VisualizationRendererProps>;
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  readonly onRetry: () => void;
}
```

Manages:
- `elapsedSeconds` counter (own `useEffect` with `setInterval`, paused when finished)
- `finishState: { score: ScoreResult } | null` — set by ModeAdapter's `onStatusChange`
- Renders Timer (if `config.countdownSeconds`), ModeAdapter, and QuizResults overlay
- Timer's `onExpire` sets a flag that ModeAdapter can use to trigger give-up

- [ ] **Step 3: Write CSS**

Flex column layout. Timer in top bar. Visualization fills space. Results overlays on top.

- [ ] **Step 4: Run tests and typecheck**

- [ ] **Step 5: Commit**

```
feat: add ActiveQuiz component for active quiz phase management
```

---

### Task 12: Rewrite QuizPage

Wire QuizShell + ActiveQuiz into the route page.

**Files:**
- Modify: `src/routes/QuizPage.tsx`
- Modify: `src/routes/QuizPage.module.css`
- Create: `src/routes/tests/QuizPage.test.tsx`

- [ ] **Step 1: Write integration tests**

```tsx
// - renders loading state while data fetches
// - renders error state on fetch failure
// - renders "Quiz not found" for invalid ID
// - renders QuizSetupPanel when data is loaded
// - after Start, renders ActiveQuiz
// - "Reconfigure" returns to setup screen
```

Mock `useQuizData` and `getQuizById`.

- [ ] **Step 2: Implement QuizPage**

```tsx
export default function QuizPage() {
  const { '*': quizId } = useParams();
  const definition = quizId ? getQuizById(quizId) : undefined;
  const dataState = useQuizData(definition?.dataPath);
  const backgroundPaths = useBackgroundPaths(definition?.supportingDataPaths[0]);

  // ... error/loading guards ...

  const elements = useMemo(
    () => buildElements(definition.visualizationType, dataState.rows, definition.columnMappings),
    [definition, dataState.rows],
  );
  const Renderer = resolveRenderer(definition.visualizationType);

  return (
    <main className={styles.page}>
      <QuizShell
        title={definition.title}
        description={definition.description}
        availableModes={definition.availableModes}
        defaultMode={definition.defaultMode}
        defaultCountdownSeconds={definition.defaultCountdownSeconds}
        toggles={definition.toggles}
        presets={definition.presets}
      >
        {(config) => (
          <ActiveQuiz
            key={/* quizKey from QuizShell for remount on reconfigure */}
            config={config}
            elements={elements}
            dataRows={dataState.rows}
            columnMappings={definition.columnMappings}
            toggleDefinitions={definition.toggles}
            Renderer={Renderer}
            backgroundPaths={backgroundPaths}
            onRetry={/* trigger QuizShell reconfigure */}
          />
        )}
      </QuizShell>
    </main>
  );
}
```

Note: QuizShell already provides remount via `quizKey`. The "Try again" button in QuizResults can trigger reconfigure by calling a handler passed from QuizShell. QuizShell needs to expose a reconfigure callback via the render prop:

```ts
export interface QuizConfig {
  readonly toggleValues: Readonly<Record<string, boolean>>;
  readonly selectedMode: QuizModeType;
  readonly countdownSeconds: number | undefined;
  readonly onReconfigure: () => void; // triggers return to setup screen
}
```

- [ ] **Step 3: Write CSS**

Full viewport height layout. Loading/error states centered.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npm run typecheck`
Run: `npm test`

- [ ] **Step 5: Commit**

```
feat: rewrite QuizPage with full quiz mode integration
```

---

### Task 13: End-to-end polish and documentation

**Files:**
- Modify: `docs/features.md`

- [ ] **Step 1: Run full verification**

Run: `npm run typecheck`
Run: `npm test`
Run: `npm run build`

- [ ] **Step 2: Visual testing in browser**

Navigate to European Capitals quiz. Verify:
- Config screen: mode selector, timer, toggles, presets, start button
- Free recall: typing answers highlights cities on map
- Identify: "Click on X" prompts work
- Locate: clicking on map gives distance feedback
- Timer works (countdown and elapsed)
- Results screen on finish
- Confetti at 100%
- "Try again" and "Reconfigure" both work

- [ ] **Step 3: Update features.md**

Mark feature 15 as DONE. Add notes for features 16/17.

- [ ] **Step 4: Commit**

```
docs: mark feature 15 as done, add integration notes
```

---

## Dependency Order

```
Independent (parallel):  Tasks 1, 4, 5, 6, 8, 10
Depends on 1:            Task 2
Depends on 2:            Task 3
Depends on 4, 5, 6:      Task 7
Depends on 3, 7:         Task 9
Depends on 9, 10:        Task 11
Depends on 3, 11:        Task 12
Depends on 12:           Task 13
```

Optimal execution: `[1, 4, 5, 6, 8, 10]` → `[2]` → `[3, 7]` → `[9]` → `[11]` → `[12]` → `[13]`
