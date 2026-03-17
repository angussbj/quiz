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

### 15. Quiz Page Integration
**Branch:** `feat/quiz-page`
**Files:** `src/routes/QuizPage.tsx`, `src/quiz-modes/QuizShell.tsx`, CSS modules
**Scope:** Wire everything together: QuizPage loads quiz definition and data, renders QuizShell with the correct visualization renderer and quiz mode based on URL params and toggle state. Mode selector (dropdown or tabs). Score display. Results screen at end with completion stats and Framer Motion celebration animation (subtle, not confetti — maybe a gentle glow or progress bar fill). "Try again" button.
**Note:** QuizShell already implements a `configuring` → `active` state machine (from feature #5). The config screen (TogglePanel) is shown as a full page before the quiz starts — toggles are NOT visible during the quiz. A "Reconfigure" button returns to the config screen and resets quiz state via key remount. QuizShell's `children` prop is a render function receiving toggle values: `(toggleValues: Record<string, boolean>) => ReactNode`.
**Integration notes:**
- Wire up `Timer` component: pass `QuizDefinition.defaultCountdownSeconds` as `countdownSeconds` prop, handle `onExpire` to end the quiz. Don't render Timer until quiz has started.
- Wire up countdown duration UI: quiz setup screen should allow overriding `defaultCountdownSeconds` before starting.
**Note (toggle resolution):** QuizShell needs to pass `elementToggles` from the quiz mode through to the renderer. The quiz mode computes `elementToggles` from the toggle definitions' `hiddenBehavior` + quiz state, and QuizShell passes them as a prop alongside the global `toggles`. See "Toggle Resolution Design" section above. Also update `ToggleDefinition` to include `hiddenBehavior` — the type change should happen in whichever feature is implemented first (12, 13, 14, or 15).

### 16. Theme Toggle & Global Layout
**Branch:** `feat/global-layout`
**Files:** `src/App.tsx`, CSS modules, potentially a `Layout.tsx` component
**Scope:** App-level layout: header with site title, theme toggle (sun/moon icon), navigation breadcrumbs on quiz pages. Responsive but desktop-first. Smooth theme transition animation. Clean typography. The overall "quiet, satisfying crossword app" aesthetic should come together here.

### 17. European Capitals Quiz Definition
**Branch:** `feat/capitals-quiz`
**Files:** `data/geography/europe/capitals.csv`, supporting country shapes data, quiz definition in registry
**Scope:** Create a complete, real quiz: European capital cities. Full CSV with all ~45 European capitals. Supporting data with simplified country border SVG paths (can be sourced/simplified from Natural Earth data). Wire up the quiz definition with all available modes, sensible toggles (show/hide country borders, show/hide city dots, show/hide country names, show/hide flags), and Easy/Medium/Hard presets.
**Note from #4:** A placeholder definition for this quiz already exists in `quizRegistry.ts` (ID: `geo-capitals-europe`). Update it in place rather than adding a duplicate. The CSV data path is `/data/geography/capitals/europe.csv` (served from `public/`). The `sampleNavigationTree.ts` is now unused — the navigation tree is generated from the registry.
**Note (toggle resolution):** Each toggle definition needs a `hiddenBehavior`. Sensible defaults for a capitals quiz: `showBorders` → `'never'` (borders are either always on or always off), `showCityDots` → `'on-reveal'` (dots appear as cities are answered), `showCountryNames` → `'on-reveal'`, `showFlags` → `{ hintAfter: 2 }` (flag shown as a hint after 2 wrong answers). Easy preset sets them all to true (always show); Hard sets them all to false (hidden behaviors apply).
**Note from #3b:** Geography quiz paths were flattened from 3-deep to 2-deep (e.g., `['Geography', 'Capitals']` not `['Geography', 'Capitals', 'Europe']`). The region is already in the quiz title, so the extra nesting was redundant. New geography quizzes should follow this pattern.
**Country borders data:** Use Natural Earth 1:110m scale country boundaries (public domain, no attribution required). Pre-convert GeoJSON coordinates to SVG path `d` strings at build time using a projection script — store the paths in integer viewBox coordinates, not raw lat/lng. This avoids shipping projection math at runtime and is ~2x more compact than GeoJSON. Source: https://github.com/martynafford/natural-earth-geojson or https://github.com/datasets/geo-countries
