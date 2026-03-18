# Feature List

Features for parallel agent development. Each feature should be developed in its own worktree branch. Features are grouped by dependency — items within a group can be worked on in parallel, but later groups depend on earlier ones.

## Group A: Foundation (no dependencies beyond current scaffolding)

### 1. CSV Data Loader - DONE
**Branch:** `feat/csv-loader`
**Files:** `src/quiz-definitions/loadQuizData.ts`, tests
**Scope:** Implement CSV parsing that reads a CSV string and returns `QuizDataRow<K>[]`. Handle headers, quoted fields, commas within quotes, and empty fields. No external CSV library — keep it simple. Write thorough unit tests with edge cases.

### 2. ZoomPanContainer - DONE
**Branch:** `feat/zoom-pan-container`
**Files:** `src/visualizations/ZoomPanContainer.tsx`, `src/visualizations/ClusterBadge.tsx`, tests
**Scope:** Wrap `react-zoom-pan-pinch` with our interface. Accept children (SVG content), manage zoom/pan state, compute element clusters at each zoom level based on `ClusteringConfig`, render `ClusterBadge` components for clusters. The badge should show count of elements (e.g., "3/4 named") and zoom into the cluster on click. Smooth animations with Framer Motion. CSS module for styling.

### 3. Navigation Page - DONE
**Branch:** `feat/navigation`
**Files:** `src/navigation/NavigationTree.tsx`, `src/navigation/Search.tsx`, `src/routes/HomePage.tsx`, CSS modules, tests
**Scope:** Hierarchical tree view of quizzes from a `NavigationNode` tree. Expandable/collapsible categories. Search that filters the tree by quiz title. Links to quiz pages. Clean, quiet design using theme CSS properties. Framer Motion for expand/collapse animations.

### 3b. Navigation Page Polish — DONE
**Branch:** `feat/navigation-polish`
**Files:** `src/navigation/NavigationTree.tsx`, `src/navigation/NavigationTree.module.css`, `src/navigation/filterNavigationTree.ts`, tests
**Scope:** Small UX improvements to the navigation page:
- **Category-aware search:** When the search query matches a category label (directory/path), keep all quizzes under that category visible — not just leaf-level matches.
- **Multi-column quiz lists:** When a category contains many quizzes, lay them out in multiple columns (CSS grid/columns) so the list doesn't stretch excessively long.
- **Smaller section headers:** Reduce category heading size — still larger than quiz items, but less dominant.
- **Clickable-looking quiz links:** Style quiz items more like traditional links (accent color, underline on hover) so they feel obviously interactive.

### 4. Quiz Registry & Route Generation — DONE
**Branch:** `feat/quiz-registry`
**Files:** `src/quiz-definitions/quizRegistry.ts`, `src/routes/QuizPage.tsx`, `src/App.tsx`
**Scope:** Build the quiz registry from a static list of `QuizDefinition` objects (we'll auto-generate later). Wire up `QuizPage` to read the quiz ID from the URL, look it up in the registry, and fetch + parse its CSV data. Generate the `NavigationNode` tree from the registry's path segments. Lazy-load quiz data on navigation.

### 5. Toggle Panel & Presets — DONE
**Branch:** `feat/toggle-panel`
**Files:** `src/quiz-modes/TogglePanel.tsx`, `src/quiz-modes/QuizShell.tsx` (toggle state management part), CSS modules, tests
**Scope:** Render toggle switches from `ToggleDefinition[]` grouped by category. Preset buttons that set multiple toggles at once. Individual toggles remain immediately accessible alongside presets. Manage toggle state and expose it to child components. Quiet, compact design. Test that presets apply correctly and individual toggle changes work.

### 6. Timer Component — DONE
**Branch:** `feat/timer`
**Files:** `src/quiz-modes/Timer.tsx`, CSS module, tests
**Scope:** Optional countdown or elapsed timer. Displays formatted time (MM:SS). Start/pause/reset controls. Calls back when time expires (for countdown mode). Framer Motion for number transitions. Unit tests for time formatting and state transitions.
**Integration notes:**
- Timer starts on mount and owns its own interval state. QuizShell should not render the Timer until the quiz has actually started.
- `QuizDefinition.defaultCountdownSeconds` controls countdown duration. If undefined, timer runs in elapsed (count-up) mode.
- When countdown expires, Timer calls `onExpire` — QuizShell should use this to end the quiz.
- Timer accepts a `paused` prop for pause/resume (e.g., when quiz is paused).

### 7. Score Calculator — DONE
**Branch:** `feat/score-calculator`
**Files:** `src/scoring/calculateScore.ts`, tests
**Scope:** Implement scoring logic for all answer types: unordered recall (count correct, no penalty), ordered recall (track hints used), locate (distance-based with linear decay — full marks within 100km, diminishing linearly to zero at 500km), identify (binary), multiple choice (binary). Return `ScoreResult` with appropriate `ScoreDetails`. Thorough unit tests for each mode and edge cases.

### 8. useLocalStorage Tests & Hardening — DONE
**Branch:** `feat/local-storage`
**Files:** `src/persistence/useLocalStorage.ts`, `src/persistence/tests/useLocalStorage.test.ts`
**Scope:** Write comprehensive tests for `useLocalStorage`: initial load from storage, default value when empty, setter updates both state and storage, handles invalid JSON gracefully, handles localStorage being unavailable (e.g., private browsing), handles quota exceeded. Add a `useQuizProgress` convenience hook if useful.

## Group B: Visualization Renderers (depend on #2 ZoomPanContainer)

### 9. Map Renderer — DONE
**Branch:** `feat/map-renderer`
**Files:** `src/visualizations/map/MapRenderer.tsx`, CSS module, tests, sample country SVG data
**Scope:** Render country shapes from `MapElement.svgPathData` positioned in viewBox space. City markers as dots/circles. Color-code by group. Support `elementStates` for visual feedback (correct = green, incorrect = red, highlighted = gold). Support `toggles` for show/hide labels, show/hide country borders. Click handlers for elements and positions. Use `ZoomPanContainer` for zoom/pan. Create sample supporting data CSV with a few European country shapes for testing.
**Note:** This is the first feature that renders real content inside `ZoomPanContainer`. Use it to visually verify zoom, pan, and clustering behaviour — test that clusters form/split at different zoom levels, badges show correct counts, and cluster click zooms to fit.
**Note from #4:** Quiz IDs follow the pattern `geo-{type}-{region}` (e.g., `geo-capitals-europe`). The registry organizes paths as type-before-region (Geography > Capitals > Europe). CSV data is fetched from `public/data/` paths. Sample data CSVs can be placed there for testing.
**Note from #9:** `VisualizationRendererProps` now includes an optional `backgroundPaths: ReadonlyArray<BackgroundPath>` prop for non-interactive decorative SVG content (e.g., country borders). This was added to keep the `elements` array clean for quiz items only. Other renderers can use this for similar decorative content if needed. Flags are displayed outside the map (in the quiz mode UI), not rendered by MapRenderer.

### 10. Timeline Renderer — DONE
**Branch:** `feat/timeline-renderer`
**Files:** `src/visualizations/timeline/TimelineRenderer.tsx`, CSS module, tests
**Scope:** Render horizontal time axis with bars for date ranges. Auto-calculate tracks to minimise overlaps when `track` is undefined. Color-code bars by category. Support `elementStates` for visual feedback. Labels on or beside bars. Use `ZoomPanContainer` for horizontal scroll/zoom. Handle zoom levels gracefully — show decade markers when zoomed out, year markers when zoomed in.
**Implementation notes:**
- `TimelineTimestamp` is a variable-precision array `[year, month?, day?, hour?, minute?, second?]` — not just years. Start timestamps round to period start, end timestamps round to period end.
- `buildTimelineElements()` converts inputs to `TimelineElement` with viewBox coordinates. X axis uses `UNITS_PER_YEAR` (20) scale factor. Track height is dynamically computed to maintain a landscape viewBox aspect ratio.
- Categories map to theme `--color-group-N` colors (first 8), then generate random vibrant HSL colors for overflow.
- Inside labels are shown when bars are wide enough; otherwise labels appear beside the bar (truncated to fit gap before next bar). Tooltips show full label + date range on hover.
- **Tooltip portal pattern:** Tooltips are rendered via `createPortal(tooltip, document.body)` instead of inside the SVG, because `react-zoom-pan-pinch`'s CSS `transform` creates a new containing block that breaks `position: fixed` positioning. Other renderers adding tooltips should use the same pattern.

### 11. Periodic Table Renderer — DONE
**Branch:** `feat/periodic-table-renderer`
**Files:** `src/visualizations/periodic-table/PeriodicTableRenderer.tsx`, CSS module, tests
**Scope:** Render grid of rectangular cells at (row, column) positions. Show symbol prominently in each cell. Color-code by group. Support `elementStates` for visual feedback. Use `ZoomPanContainer` for zoom/pan. When zoomed out, show compact cells with just symbols; when zoomed in, cells could expand to show more data (prepare the slot for a custom render component but don't implement it yet).

## Toggle Resolution Design

Toggles control visual features like labels, borders, city dots, and flags. The user sees a simple on/off switch per toggle on the config screen. But "off" doesn't always mean "never show" — it can mean different things depending on the quiz definition:

- **`'never'`** — never shown during the quiz
- **`'on-reveal'`** — shown when the element is answered (correct or give-up)
- **`{ hintAfter: n }`** — shown after the nth incorrect answer for that element (e.g., show the flag as a hint after 2 wrong guesses)

### Data model

`ToggleDefinition` gains a `hiddenBehavior` field describing what happens when the toggle is off:

```ts
type HiddenBehavior = 'never' | 'on-reveal' | { readonly hintAfter: number };

interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: string;
  readonly hiddenBehavior: HiddenBehavior; // what "off" means for this toggle
}
```

Presets remain `Record<string, boolean>` — they set toggles on/off. The hidden behavior is fixed per toggle definition, not per preset.

### Resolution flow

1. **Config screen:** User sees boolean switches. "On" = always show. "Off" = hidden behavior applies.
2. **Quiz mode layer** (features 12–14): Each quiz mode resolves toggles into **per-element booleans** based on quiz state (which elements are correct, how many wrong answers per element, etc.). The resolution logic is: if toggle is ON → true for all elements. If toggle is OFF → apply `hiddenBehavior` per element.
3. **Renderer:** Receives `elementToggles: Record<elementId, Record<toggleKey, boolean>>` — fully resolved, no knowledge of hidden behaviors. Renderers stay simple.

### Props change

`VisualizationRendererProps` will gain:
```ts
readonly elementToggles?: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
```

Renderer logic per element: check `elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey]`. The global `toggles` remains the fallback (e.g., for toggles not in `elementToggles`, or before quiz modes are wired up).

### Advanced config (future)

An advanced option on the config screen lets users override the hidden behavior per toggle (e.g., change "on-reveal" to "hint after 3"). This is a nice-to-have, not needed for initial implementation.

## Group C: Quiz Modes (depend on Group B renderers existing, and #5 TogglePanel, #7 ScoreCalculator)

Note: we're still waiting on the timeline renderer, so if any work relies on it, create a new task later to do that work, and continue with what work you can do with the other renderers.

### 12. Free Recall Mode (Unordered) — DONE
**Branch:** `feat/free-recall-unordered`
**Files:** `src/quiz-modes/free-recall/FreeRecallMode.tsx`, CSS module, tests
**Scope:** Text input field. User types answers in any order. Fuzzy matching (case-insensitive, ignore accents/diacritics, accept alternate answers from data). On match: mark element as correct in the visualization with a satisfying animation, increment score, clear input. Show progress (e.g., "7/50"). On give up: reveal remaining answers. Gentle feedback — no "wrong" state for typing, only when giving up.
**Note (from #7):** When building the ordered recall variant, use `HintLevel` from `src/scoring/ScoreResult.ts` to track per-answer hint usage. Visualization should colour answers by hint level: `'none'` = green/white (counts as correct), `'partial'` = yellow (doesn't count), `'full'` = red (doesn't count). The scoring function `calculateOrderedRecallScore` already handles this.
**Note (toggle resolution):** This mode must resolve per-element toggles. For each element, for each toggle where `hiddenBehavior` applies: if `'on-reveal'` → set true when element is answered (correct or give-up). If `{ hintAfter: n }` → not applicable (no wrong answers in free recall). If `'never'` → always false. Pass resolved `elementToggles` to the renderer.
**Note (from #12):** `useFreeRecallSession` hook in `src/quiz-modes/free-recall/useFreeRecallSession.ts` manages session state — feature #15 should use it to wire up the quiz page. Answer matching (`src/quiz-modes/free-recall/matchAnswer.ts`) supports alternate spellings via `{column}_alternates` columns with pipe-separated values. `QuizModeProps` now includes `dataRows`, `columnMappings`, and `toggleDefinitions`. Matching strictness (accent-sensitivity, case-sensitivity) should be toggleable in the future — currently always fuzzy.
**Note (from #12, matching design):** `normalizeText()` strips diacritics via NFD decomposition + combining character removal, lowercases, strips punctuation, collapses whitespace. This makes é≡e, ñ≡n, ü≡u etc. A future "strict matching" toggle should bypass this normalization.

### 13. Identify Mode — DONE
**Branch:** `feat/identify-mode`
**Files:** `src/quiz-modes/identify/IdentifyMode.tsx`, CSS module, tests
**Scope:** Show a prompt ("Click on Paris"). User clicks elements in the visualization. Correct click: satisfying animation, advance to next prompt. Incorrect click: gentle incorrect animation, element briefly highlighted red. Cycle through all target elements. Support toggles (show/hide hints like flags or labels). Show progress.
**Note (toggle resolution):** This mode must resolve per-element toggles. Track incorrect answer count per element. For `{ hintAfter: n }` → set true after n wrong clicks on that element's prompt. For `'on-reveal'` → set true after correct answer or skip. Pass resolved `elementToggles` to the renderer.
**Note from #13:** `HiddenBehavior` type and optional `hiddenBehavior` field were added to `ToggleDefinition` in this feature. `elementToggles` was added to `VisualizationRendererProps`. The shared `resolveElementToggles()` utility in `src/quiz-modes/resolveElementToggles.ts` can be reused by Locate mode and Free Recall mode — it takes element quiz states (isAnswered + wrongAttempts) and returns per-element toggle overrides. IdentifyMode manages its own state via `useIdentifyQuiz` hook since QuizShell integration (feature 15) isn't wired up yet. It accepts a `renderVisualization` render prop that receives elementStates, onElementClick, targetElementId, toggles, and elementToggles. Feature 15 will need to provide this render prop when wiring modes to renderers.

### 14. Locate Mode — DONE
**Branch:** `feat/locate-mode`
**Files:** `src/quiz-modes/locate/LocateMode.tsx`, `src/quiz-modes/locate/useLocateQuiz.ts`, `src/quiz-modes/locate/LocateFeedback.tsx`, `src/quiz-modes/locate/LocateResults.tsx`, CSS module, tests
**Scope:** Show a prompt ("Click where Paris is"). User clicks anywhere on the visualization. Show distance feedback with the score calculator's non-linear curve. Visual feedback: show the correct location and draw a line from the click to it. Satisfying animation for close guesses, gentle feedback for far ones. Advance to next prompt.
**Implementation notes:**
- LocateMode is self-contained with its own state machine (`useLocateQuiz` hook). When QuizPage integration (#15) is built, it should either consume this hook or adapt the component.
- `LocateModeProps` differs from `QuizModeProps` — it takes a `Renderer` component type and renders the visualization itself. This will need reconciliation in #15.
- `svgOverlay` prop was added to `VisualizationRendererProps` to allow quiz modes to inject SVG feedback (like distance lines) into renderers. MapRenderer and PeriodicTableRenderer both support it.
- Next prompt appears instantly after a click; feedback (line + distance label) lingers for ~2s then fades via Framer Motion AnimatePresence.
- Toggle resolution was deferred — see feature #14b.
**Note (toggle resolution):** Deferred to feature #14b.

### 14b. Toggle Resolution Unification — DONE
**Branch:** `feat/toggle-resolution`
**Files:** `src/quiz-modes/resolveElementToggles.ts`, `src/quiz-modes/ToggleDefinition.ts`, tests
**Scope:** Unify toggle resolution across all quiz modes (12, 13, 14). Add `hiddenBehavior` field to `ToggleDefinition`. Create a shared `resolveElementToggles` utility that computes per-element toggle booleans from toggle definitions, global toggle values, and per-element quiz state (answered, attempt count). Wire into each quiz mode. Ensure no unnecessary duplication across modes. Also add `elementToggles` support to renderers (reading `elementToggles?.[elementId]?.[toggleKey] ?? toggles[toggleKey]`).
**Depends on:** Features 12, 13, 14 (at least one mode must exist to wire into).
**Note:** This was split out because features 12–14 may be developed in parallel, and unifying toggle resolution afterward avoids conflicting implementations.
**Note (from #14b):** `ElementQuizState` is exported from `resolveElementToggles.ts` — all modes import it rather than redeclaring the shape. `elementToggle()` defaults to `true` when a toggle key isn't in global toggles (features visible unless explicitly off). TimelineRenderer supports `showLabels` (hide/show bar labels) and `showBars` (full opacity vs dimmed) toggle keys. Quiz definitions for timeline quizzes should include these in their `ToggleDefinition[]`.


## Group D: Integration (depends on Groups A–C)

### 15. Quiz Page Integration — DONE
**Branch:** `feat/quiz-page`
**Files:** `src/routes/QuizPage.tsx`, `src/quiz-modes/QuizShell.tsx`, `src/quiz-modes/QuizSetupPanel.tsx`, `src/quiz-modes/ActiveQuiz.tsx`, `src/quiz-modes/ModeAdapter.tsx`, `src/quiz-modes/QuizResults.tsx`, `src/visualizations/buildElements.ts`, `src/visualizations/resolveRenderer.ts`, CSS modules
**Scope:** Wire everything together: QuizPage loads quiz definition and data, renders QuizShell with the correct visualization renderer and quiz mode based on URL params and toggle state. Mode selector (dropdown). Score display. Results screen at end with completion stats, progress bar animation, and confetti at 100%. "Try again" button.
**Note:** QuizShell implements a `configuring` → `active` state machine. The config screen (QuizSetupPanel, which composes TogglePanel) is shown as a full page before the quiz starts — toggles are NOT visible during the quiz. A "Reconfigure" button returns to the config screen and resets quiz state via key remount. QuizShell's `children` prop is a render function receiving `QuizConfig` with `toggleValues`, `selectedMode`, `countdownSeconds`, and `onReconfigure`.
**Architecture notes (from #15):**
- `QuizSetupPanel` replaced `TogglePanel` as the config screen, adding mode selector and timer input. `TogglePanel` was slimmed to toggle-only (presets + switches).
- `ModeAdapter` routes mode types to the correct composition pattern: FreeRecallAdapter (external hook), IdentifyAdapter (render prop), LocateAdapter (component prop). Unimplemented modes show "not yet available".
- `ActiveQuiz` manages the active phase: timer, mode adapter, elapsed time tracking, finish detection, results overlay.
- `QuizResults` shows score percentage, progress bar, elapsed time, "Try again" button, and confetti at 100%.
- Element converters (`buildMapElements`, `buildGridElements`, `buildTimelineElementsFromRows`) convert CSV rows to `VisualizationElement[]`. The `buildElements` dispatcher picks the right one by `VisualizationType`. `resolveRenderer` maps types to renderer components.
- Background path loading uses CSV format with `|`-separated SVG paths. `parseBackgroundPaths` + `useBackgroundPaths` hook.
- `QuizModeProps.dataRows` uses `Record<string, string>[]` (not `QuizDataRow`) to match `useQuizData` return type without casting.
- `IdentifyMode` and `LocateMode` gained optional `onFinish` callbacks for finish detection from outside.
- `QuizConfig` exported from `QuizShell` includes `onReconfigure` so results screen can trigger return to setup.

### 16. Theme Toggle & Global Layout — DONE
**Branch:** `feat/global-layout`
**Files:** `src/layout/Layout.tsx`, `src/layout/ThemeToggle.tsx`, `src/layout/Breadcrumbs.tsx`, `src/navigation/findSubtree.ts`, CSS modules, tests
**Scope:** App-level layout: header with site title ("Quizzical"), theme toggle (sun/moon/monitor icon cycling light/dark/system), navigation breadcrumbs on quiz pages with clickable path segments. Category URL routes (e.g. `/geography/capitals`) show filtered quiz lists. Responsive but desktop-first. Smooth theme transition animation. Clean typography.
**Note from #16:** Breadcrumbs are rendered by the global Layout, not by individual pages. Quiz path segments in breadcrumbs link to category browsing routes. The `findSubtree` utility in `src/navigation/findSubtree.ts` does case-insensitive matching of URL segments to navigation tree labels. HomePage accepts category filtering via URL path — the `/*` catch-all route handles this.

### 17. European Capitals Quiz Definition — DONE
**Branch:** `worktree-capitals-quiz`
**Files:** `public/data/capitals/world-capitals.csv`, `public/data/borders/world-borders.csv`, quiz definition in registry, `scripts/generate*.ts`
**Scope:** Create a complete, real quiz: European capital cities. Full CSV with all ~45 European capitals. Supporting data with simplified country border SVG paths (can be sourced/simplified from Natural Earth data). Wire up the quiz definition with all available modes, sensible toggles (show/hide country borders, show/hide city dots, show/hide country names, show/hide flags), and Easy/Medium/Hard presets.
**What was built:**
- `world-capitals.csv`: 197 countries (all UN members + Taiwan, Kosovo, Palestine) with coordinates, regions, subregions, and alternate city names. Sourced from mledoze/countries + dr5hn/cities databases.
- `world-borders.csv`: 233 countries with equirectangular SVG border paths (x=lng, y=-lat), generated from Natural Earth 1:110m GeoJSON via Douglas-Peucker simplification.
- `DataFilter` type added to `QuizDefinition` — allows filtering shared CSVs by column values (e.g., `{ column: 'region', values: ['Europe'] }`). Multiple values act as OR. Also added `supportingDataFilter` for border data.
- `applyDataFilter()` utility applies the filter at data load time.
- `parseBackgroundPaths()` utility parses border CSV rows (pipe-separated SVG paths) into `BackgroundPath[]` for renderers.
- Generation scripts in `scripts/` for reproducible data regeneration (source files gitignored, download URLs in script headers).
- Data validation tests for both CSVs.
**Note from #4:** A placeholder definition for this quiz already existed in `quizRegistry.ts` (ID: `geo-capitals-europe`). Updated in place. All capital quiz definitions now point to the shared `world-capitals.csv` with region filters.
**Note (toggle resolution):** Toggle definitions use: `showBorders` → `'never'`, `showCityDots` → `'on-reveal'`, `showCountryNames` → `'on-reveal'`, `showFlags` → `{ hintAfter: 2 }`. Easy/Medium/Hard presets configured.
**Note from #3b:** Geography quiz paths flattened to 2-deep (`['Geography', 'Capitals']`).
**Note (data architecture):** All capitals quizzes share one CSV filtered by region. New region quizzes just add a registry entry with `dataFilter: { column: 'region', values: ['NewRegion'] }`. Same pattern for borders via `supportingDataFilter`. Adding a new region quiz requires zero new data files.
**Note (projection):** Equirectangular projection (x=lng, y=-lat) matches `projectGeo` in `src/visualizations/map/projectGeo.ts`. Raw lat/lng are stored in source data so a different projection can be applied by modifying the generation scripts.

### 20. Toggle Features & Identify Mode Fixes — DONE
**Branch:** `worktree-toggle-fixes`
**Scope:**
- **City dots in identify mode (bug fix):** Added `'default'` to `ElementVisualState`. `useIdentifyQuiz` now sets unanswered elements to `'default'` instead of `'hidden'`, so city dots render in a neutral muted color and are clickable.
- **Country names on map:** Country name labels are rendered at the centroid of each country's border polygon from background data, controlled by the `showCountryNames` toggle. Uses `computePathCentroid` (shoelace formula) and `computeBackgroundLabels` utilities.
- **SVG flags:** Downloaded 271 4x3 SVG flags from lipis/flag-icons (MIT). Added ISO alpha-2 `code` column to both `world-capitals.csv` and `world-borders.csv`. Flag images rendered via `<image>` SVG elements.
- **Flags on map:** `showFlags` split into `showMapFlags` (flags on the map near city dots / at country centroids) and `showPromptFlags` (flags in identify mode prompt bar).
- **Identify mode prompt fields:** `ToggleDefinition` gained an optional `promptField` config (`{ type: 'text' | 'flag', column: string }`). When a toggle with a prompt field is enabled, its data renders in the identify mode prompt bar via the `IdentifyPromptFields` component.
- **Per-mode toggle constraints:** `QuizDefinition.modeConstraints` declares per-mode constraints. Two constraint types: `ForcedValueConstraint` (force a toggle on/off) and `AtLeastOneConstraint` (prevent disabling the last enabled toggle in a group). Setup panel disables constrained toggles with tooltips.
**Note (data):** `BackgroundPath` now carries `name` (country name), `code` (alpha-2), `sovereign`, and `region` fields alongside `group` (subregion). `backgroundLabels` prop threaded through QuizPage → ActiveQuiz → ModeAdapter → Renderer. Labels/flags filtered to sovereign countries in quiz region.
**Note (label placement):** `MapCountryLabels` component handles zoom-responsive labels with `foreignObject` for HTML text, dynamic overlap detection, city dot avoidance, and three-step placement (away-from-dot line → spiral → centroid fallback at max zoom). See feature 28 for planned optimizations.

### 28. Label Placement Optimization
**Branch:** `feat/label-placement`
**Scope:** Improve country name/flag label placement on the map. The current placement algorithm (`MapCountryLabels.tsx`) works but has known limitations that affect visual quality.

**Problem 1 — Centroid bias from vertex density:**
The polygon centroid (shoelace formula) is biased toward coastlines with many vertices. For example, Portugal's jagged Atlantic coast has far more points than its straight Spanish border, pulling the centroid west toward the ocean. This means labels don't appear at the visual center of the country. The bounding box center avoids this bias but doesn't account for the polygon shape (e.g., for an L-shaped country it would be outside the country).

**Solution:** Compute three candidate "center" positions per country and try all three:
1. **Polygon centroid** (shoelace formula) — good for convex shapes, biased by vertex density
2. **Bounding box center** — unbiased by vertices but ignores shape
3. **Pole of inaccessibility** — the center of the largest inscribed circle. This is the ideal label position: it's the point furthest from any edge, guaranteed to be inside the polygon, and naturally finds the "widest" part of the country. Mapbox's `polylabel` algorithm finds this efficiently via quadtree subdivision (~50 lines of code, no dependencies).

For each country, try placing the label at all three positions (starting with whichever is furthest from its closest city dot), then fall back to the three-step search (away-from-dot line → spiral → centroid fallback).

**Problem 2 — Labels disappearing on zoom:**
When the zoom level changes, label dimensions change (font size scales inversely with zoom), which changes bounding boxes, which changes overlap results. A label visible at one zoom level may disappear at the next. Labels should be stable — once visible, they shouldn't disappear when zooming in (only when zooming out and they'd overlap with a larger country's label).

**Solution:** Consider caching placed positions and only re-placing if the cached position now overlaps. Or: at each zoom level, start by trying the previously-used position before searching for a new one.

**Problem 3 — Linear search direction:**
The "away from dot" linear search moves in the direction from the closest dot toward the centroid. For countries where the capital is between the centroid and a neighboring country (e.g., Lisbon is west of Portugal's centroid, so the search goes east toward Spain), this can push the label out of the country. The linear search distance is currently capped at `dotAvoidRadius * 3` to mitigate this, but the direction is still suboptimal.

**Solution:** The pole of inaccessibility naturally solves this — it's already far from edges, so it's less likely to be near the capital dot in the first place. For the linear search, also try the perpendicular directions (90° rotations of the away-from-dot vector).

**Implementation notes:**
- `computePathCentroid.ts` — add `computePolylabel(d: string): ViewBoxPosition` using the quadtree algorithm
- `computeBackgroundLabels.ts` — compute all three center candidates per country, store in `BackgroundLabel`
- `MapCountryLabels.tsx` — try all three centers before falling back to spiral search
- The polylabel algorithm needs the polygon as an array of `[x, y]` rings. `parsePathPoints` already extracts this.
- Precompute all three centers in `computeBackgroundLabels` (runs once at data load, not per frame)
- Unit test with Portugal data (test already exists in `MapCountryLabels.test.ts`) — verify polylabel gives a more central position than the polygon centroid

**Files:**
- Modify: `src/visualizations/map/computePathCentroid.ts` — add `computePolylabel`
- Modify: `src/visualizations/map/BackgroundLabel.ts` — add `centers` array
- Modify: `src/visualizations/map/computeBackgroundLabels.ts` — compute three centers
- Modify: `src/visualizations/map/MapCountryLabels.tsx` — try multiple centers
- Test: `src/visualizations/map/tests/computePathCentroid.test.ts` — polylabel tests
- Test: `src/visualizations/map/tests/MapCountryLabels.test.ts` — placement quality tests

## Group E: Bug Fixes & Polish (no dependencies between items)

### 18. Timer & Setup Panel Polish — DONE
**Branch:** `feat/timer-polish`
**Scope:**
- **Time limit input styling:** The native number input spinner (up/down arrows) looks bad, especially in dark mode. Replace with custom styled increment/decrement buttons that match the app's design language. Pressing down at 1 minute should clear the field back to blank (no time limit), rather than going to 0.
- **Timer jumps sideways:** The in-quiz timer shifts horizontally on every other tick. Likely variable-width digits or Framer Motion layout reflow. Fix with `font-variant-numeric: tabular-nums` or a fixed-width container.
**What was done:**
- Removed `AnimatePresence`/`motion.span` from `Timer.tsx` — the timer doesn't need tick animations, and they caused layout reflow.
- Added `font-variant-numeric: tabular-nums` to the timer CSS for fixed-width digits.
- Replaced `<input type="number">` with `<input type="text" inputMode="numeric">` flanked by custom `[ − ]` / `[ + ]` stepper buttons.
- Decrementing at 1 (or from blank) clears to `undefined` (no time limit).
- Stepper buttons styled with theme CSS custom properties, work correctly in dark mode.

### 19. Map Renderer Fixes — DONE
**Branch:** `feat/map-fixes`
**Scope:**
- **Missing countries:** France and Norway don't appear on the map. Investigate whether the SVG paths are missing, malformed, or being filtered out.
- **Global background outlines:** Background country outlines should include the entire world, not just the quiz region. Zooming to the edges of Europe currently shows abrupt cut-offs. Initial viewport should still be focused on the quiz region, but panning out should reveal neighbouring countries as context.
- **City dot colours:** City dots currently use different colours from group colour-coding. They should all be a single uniform colour — grouping colours make sense for country shapes or timeline bars, not city markers.
- **City dots non-interactable in free recall:** When the quiz mode uses text input (free recall), hovering/clicking city dots shouldn't trigger hover effects, animations, or state changes. Interactive styling should only apply in click-based modes (identify, locate).
**What was done:**
- Added 5 missing countries to `world-borders.csv` (France, Norway, Kosovo, Vatican City, São Tomé and Príncipe) using Natural Earth 1:110m data via `scripts/add-missing-borders.mjs`.
- Normalized country names between borders and capitals CSVs. Added `country_alternates` column to capitals CSV.
- Removed `supportingDataFilter` from `QuizDefinition` — all map quizzes load full world borders as background. Added `supportingDataPaths` to Asia, Africa, and countries quizzes.
- City dots now use uniform `--color-city-dot` CSS variable instead of group colours.
- Map interactive styling (hover/click) gated on `onElementClick` prop, not `element.interactive` — city dots are non-interactive in free recall mode.

### 21. Quiz Results Review Mode — DONE
**Branch:** `feat/results-review`
**Scope:** The results screen should have a way to dismiss the overlay and go back to viewing the visualization in a read-only state (no more answers accepted). Lets users review what they got right/wrong on the map/grid/timeline.

### 22. Multi-Region Support
**Branch:** `feat/multi-region`
**Scope:** Some countries/cities belong to multiple regions (e.g. Türkiye and Russia are in both Europe and Asia). Data CSVs should support multiple regions per row (e.g. pipe-separated: `Europe|Asia`). Filtering by region should return any row that has at least one matching region. Affects quiz definitions, data loading, and any region-based filtering logic.

## Group F: Quiz Data & Definitions (depend on #19 for map fixes, #22 for multi-region)

### 23. Capital & Border Data for All Continents
**Branch:** `feat/all-capitals`
**Scope:** Extend capital city data beyond Europe. Check that the data for Asia, Africa, North America, South America, and Oceania is already in the existing csvs and if there are any edge cases we should check (e.g. Taiwan, Palestine, French Guiana, etc.). Register quiz definitions for each continent and for the world. Follow the same patterns as #17. Use Natural Earth 1:110m data, pre-converted to SVG paths.

### 24. Countries Quiz Type
**Branch:** `feat/countries-quiz`
**Scope:** Add a "countries" quiz type — name the country from its shape/location on the map. Different from capitals (which focuses on cities). Create quiz definitions per continent and for the world, registered in the quiz registry. Can reuse the same border data from #23.

### 25. Flags Quiz Type
**Branch:** `feat/flags-quiz`
**Scope:** Add a "flags" quiz type — identify the country from its flag, or pick the flag for a given country - this should be selectable on the quiz configuration screen. Create quiz definitions per continent and for the world. Can reuse the same data CSVs as capitals/countries with different column mappings.

### 26. Periodic Table Quiz
**Branch:** `feat/periodic-table-quiz`
**Scope:** Create a complete periodic table quiz with all 118 elements. CSV data with symbol, name, atomic number, group, period, category. Register quiz definition with appropriate modes (free recall by name/symbol, identify by clicking the element, ordered recall following the order by atomic number, prompted recall — see below). Sensible toggles (show/hide symbols, show/hide atomic numbers, show/hide category colours).
**Prompted recall mode:** A new quiz mode, the inverse of identify. In identify mode, the prompt shows a name and the user clicks the element. In prompted recall, the element is visually highlighted on the visualization and the user types its name. Element names are hidden during the quiz so the user must recall them from memory. Elements are prompted in a random order. This mode should work generically (not periodic-table-specific) — any quiz definition could opt into it.

### 27. WWII Timeline Quiz
**Branch:** `feat/wwii-timeline`
**Scope:** Create a WWII timeline quiz with major events and their date ranges. CSV data with event name, start date, end date, category (e.g. European theatre, Pacific theatre, diplomacy). Register quiz definition with appropriate modes. Needed to exercise the timeline renderer end-to-end.


### 29. Remove `targetElementId` from Renderer Props
**Branch:** `feat/remove-target-from-renderer`
**Scope:** Renderers (`MapRenderer`, `PeriodicTableRenderer`) currently receive `targetElementId` via `VisualizationRendererProps` and apply highlight styling directly (highlight stroke, thicker border). This is wrong — it means the correct answer gets a visual indicator in identify mode, defeating the purpose of the quiz. Highlighting decisions belong to quiz modes, not renderers. Renderers should only know about `elementStates`.
- Remove `targetElementId` from `VisualizationRendererProps`.
- Remove all `isTarget`-based styling from `MapRenderer` (city dot stroke/strokeWidth on lines ~215-216) and `PeriodicTableRenderer` (rect stroke/strokeWidth on line ~122-123).
- Quiz modes that need to highlight an element (e.g. the future prompted recall mode, or locate mode's feedback) should express it via `elementStates` using a `'highlighted'` state — renderers already handle that state.
- Update tests and stories that pass `targetElementId`.
- Verify identify mode no longer leaks any visual indicator for the correct answer.