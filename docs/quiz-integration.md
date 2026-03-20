# Quiz Integration Architecture

How the quiz page, modes, renderers, and data connect.

## Quiz Page Flow

`QuizPage` → loads `QuizDefinition` + CSV data → `QuizShell` (config → active state machine) → `ActiveQuiz` → `ModeAdapter` + `Renderer`

- **QuizShell** owns the `configuring` → `active` state machine. Config screen (`QuizSetupPanel`) is shown as a full page before the quiz starts — toggles are NOT visible during the quiz.
- **QuizSetupPanel** composes `TogglePanel` (toggle-only: presets + switches) with mode selector and timer input.
- **ActiveQuiz** manages the active phase: timer, mode adapter, elapsed time tracking, finish detection, results overlay.
- **QuizResults** shows score percentage, progress bar, elapsed time, "Try again" button, and confetti at 100%.
- `QuizConfig` (exported from `QuizShell`) includes `toggleValues`, `selectedMode`, `countdownSeconds`, and `onReconfigure`.

## Mode Composition Patterns

Each mode has a different composition pattern. `ModeAdapter` routes mode types to per-mode adapter sub-components:

- **FreeRecallAdapter** — External hook pattern. Calls `useFreeRecallSession()` for session state, renders `<Renderer>` and `<FreeRecallMode>` separately.
- **IdentifyAdapter** — Render prop pattern. Passes `renderVisualization` callback to `IdentifyMode`, which manages its own state via `useIdentifyQuiz`.
- **LocateAdapter** — Component prop pattern. Passes `Renderer` as a component type prop. `LocateMode` has its own `LocateModeProps` (not extending `QuizModeProps`), manages state via `useLocateQuiz`.
- **Unimplemented modes** (`free-recall-ordered`, `multiple-choice`): Show "not yet available" placeholder.

## Element Building

Element converters transform CSV rows into `VisualizationElement[]`:
- `buildMapElements` — lat/lng → projected viewBox coordinates
- `buildGridElements` — row/column → grid cell positions
- `buildTimelineElementsFromRows` — date columns → timeline bars

The `buildElements` dispatcher picks the right converter by `VisualizationType`. `resolveRenderer` maps types to renderer components.

## Background Paths

Background paths (e.g., country borders) use CSV format with a `paths` column. Multiple SVG path `d` strings are separated by `|` (pipe — chosen because SVG path data never contains `|`).

```csv
id,name,group,paths
france,France,Western Europe,"M -1.8,-48.5 L 2.5,-51.1 Z|M 8,-45 L 9,-44 Z"
```

`parseBackgroundPaths` + `useBackgroundPaths` hook handle loading.

## SVG Overlay

The `svgOverlay` prop on `VisualizationRendererProps` lets quiz modes inject SVG feedback (like locate mode's distance lines) into renderers. MapRenderer and PeriodicTableRenderer both support it.

## Timer Expiry & Force Give-Up

When a countdown timer expires: Timer `onExpire` → ActiveQuiz sets `forceGiveUp=true` → ModeAdapter passes it through → each mode calls its own `handleGiveUp()`. This ensures the results screen shows the real score, not a hardcoded zero. `IdentifyMode` and `LocateMode` both accept optional `onFinish` and `forceGiveUp` props.

## Answer Matching (Free Recall)

- `matchAnswer.ts` supports alternate spellings via `{column}_alternates` CSV columns with pipe-separated values.
- `normalizeText()` strips diacritics (NFD decomposition + combining character removal), lowercases, strips punctuation, collapses whitespace. This makes é≡e, ñ≡n, ü≡u.
- A future "strict matching" toggle should bypass this normalization.
- `HintLevel` from `src/scoring/ScoreResult.ts` exists for the future ordered recall variant. Visualization should colour answers by hint level: `'none'` = green/white, `'partial'` = yellow, `'full'` = red.

## Timeline Renderer Conventions

- `TimelineTimestamp` is a variable-precision array `[year, month?, day?, hour?, minute?, second?]` — not just years. Start timestamps round to period start, end timestamps round to period end.
- The locate mode date parser accepts multiple formats: ISO (`1944-06-06`), `M/D/Y` (`6/6/1944`), and natural language (`6 Jun 1944`, `June 1944`). Scoring tolerance scales with precision level.
- `buildTimelineElements()` uses `UNITS_PER_YEAR` (20) as the X-axis scale factor. Track height is dynamically computed to maintain a landscape viewBox aspect ratio.
- Categories map to theme `--color-group-N` colors (first 8), then generate random vibrant HSL colors for overflow.
- Inside labels are shown when bars are wide enough; otherwise labels appear beside the bar (truncated to fit gap before next bar).
- TimelineRenderer supports `showLabels` (hide/show bar labels) and `showBars` (full opacity vs dimmed) toggle keys. Quiz definitions for timeline quizzes should include these in their `ToggleDefinition[]`.

## Select Toggles

`SelectToggleDefinition` supports multi-value settings (e.g. a segmented control for date precision). Defined alongside `ToggleDefinition[]` as `selectToggles` on `QuizDefinition`. Selected value stored in `QuizConfig.selectValues` (a `Record<key, string>`). Any quiz can use them — not limited to timelines.

`datePrecision` (values: `'year'` / `'month'` / `'day'`) is the existing example, and is only meaningful in locate mode. Declare it with `modes: ['locate']` on the `SelectToggleDefinition` to hide it in other modes.

## Map Interactive Styling

Renderers gate hover/click effects on the presence of the `onElementClick` prop — not on `element.interactive`. When `onElementClick` is undefined (e.g. free recall mode), city dots are non-interactive. This is the correct pattern for all map-based renderers.

## Quiz Data Conventions

- `QuizModeProps.dataRows` uses `Record<string, string>[]` (not `QuizDataRow`) to match `useQuizData` return type without casting.
- Geography quiz paths are 2-deep: `['Geography', 'Capitals']` not `['Geography', 'Capitals', 'Europe']`. The region is in the quiz title.
- Quiz IDs follow the pattern `geo-{type}-{region}` (e.g., `geo-capitals-europe`).
- CSV data is fetched from `public/data/` paths.
- **Americas subregion split:** North America quiz filters by `subregion` values `['North America', 'Central America', 'Caribbean']` (23 countries); South America filters by `['South America']` (12 countries). Uses `subregion` not `region` (which is just `'Americas'` for all).
- **World vs continent grouping:** World quizzes set `columnMappings.group = 'region'` for continent-level colour coding. Continent quizzes set `columnMappings.group = 'group'` (subregion) for finer colour coding.
- **BackgroundPath labels:** `BackgroundPath` has optional `label` and `labelCenter` fields. Non-quiz territory shapes (e.g. dependent territories in a countries quiz) use these to display name labels when the `showCountryNames` toggle is on.

## Quiz Definition Base Objects

Quiz definitions that share the same visualization type, toggles, and UI structure should extend a shared base object via spread. This prevents toggle/preset/constraint drift between related quizzes.

**Existing base objects:**
- `capitalsQuizBase` — map quizzes for city-based data (capitals, largest cities). Includes city dots, city names, country names, flags, prompt toggles, presets, and `atLeastOne` constraints.
- `countriesQuizBase` — map quizzes for country-based data (countries by continent). Simpler toggles (no city dots/names, no prompt toggles).
- `timelineQuizBase` — timeline quizzes for historical events. Minimal base; toggles/presets/columnMappings are defined per quiz.

**When adding a new city-based map quiz** (e.g. cities by GDP, Olympic host cities):
1. Spread `capitalsQuizBase` and override only what differs (id, title, description, path, dataPath, modes, camera position, filters).
2. **Do not redeclare** toggles, selectToggles, presets, columnMappings, or modeConstraints unless the new quiz genuinely needs different values.
3. If the CSV uses different column names, rename the columns to match the existing convention (`city`, `country`, `country_code`, `latitude`, `longitude`, `region`, `label_position`, `city_alternates`).
4. Add quiz-specific fields like `rangeColumn`, `groupFilterColumn`, `hideFilteredElements` as overrides.

**CSV column naming convention for city-based quizzes:**
| Column | Description |
|--------|-------------|
| `city` | Display name of the city (used as answer and label) |
| `country` | Country name (used for grouping and prompt text) |
| `country_code` | ISO 3166-1 alpha-2 code (used for flag lookup) |
| `latitude`, `longitude` | Coordinates |
| `region`, `subregion` | Geographic region for filtering |
| `city_alternates` | Pipe-separated alternate spellings |
| `label_position` | Label placement: `left`, `right`, `above`, `below` |
