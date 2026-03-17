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

### 3b. Navigation Page Polish
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
**Scope:** Implement scoring logic for all answer types: unordered recall (count correct, no penalty), ordered recall (track hints used), locate (distance-based with non-linear scoring curve — e.g., full marks within 50km, diminishing to zero at 500km), identify (binary), multiple choice (binary). Return `ScoreResult` with appropriate `ScoreDetails`. Thorough unit tests for each mode and edge cases.

### 8. useLocalStorage Tests & Hardening — DONE
**Branch:** `feat/local-storage`
**Files:** `src/persistence/useLocalStorage.ts`, `src/persistence/tests/useLocalStorage.test.ts`
**Scope:** Write comprehensive tests for `useLocalStorage`: initial load from storage, default value when empty, setter updates both state and storage, handles invalid JSON gracefully, handles localStorage being unavailable (e.g., private browsing), handles quota exceeded. Add a `useQuizProgress` convenience hook if useful.

## Group B: Visualization Renderers (depend on #2 ZoomPanContainer)

### 9. Map Renderer
**Branch:** `feat/map-renderer`
**Files:** `src/visualizations/map/MapRenderer.tsx`, CSS module, tests, sample country SVG data
**Scope:** Render country shapes from `MapElement.svgPathData` positioned in viewBox space. City markers as dots/circles. Color-code by group. Support `elementStates` for visual feedback (correct = green, incorrect = red, highlighted = gold). Support `toggles` for show/hide labels, show/hide country borders. Click handlers for elements and positions. Use `ZoomPanContainer` for zoom/pan. Create sample supporting data CSV with a few European country shapes for testing.
**Note:** This is the first feature that renders real content inside `ZoomPanContainer`. Use it to visually verify zoom, pan, and clustering behaviour — test that clusters form/split at different zoom levels, badges show correct counts, and cluster click zooms to fit.
**Note from #4:** Quiz IDs follow the pattern `geo-{type}-{region}` (e.g., `geo-capitals-europe`). The registry organizes paths as type-before-region (Geography > Capitals > Europe). CSV data is fetched from `public/data/` paths. Sample data CSVs can be placed there for testing.

### 10. Timeline Renderer
**Branch:** `feat/timeline-renderer`
**Files:** `src/visualizations/timeline/TimelineRenderer.tsx`, CSS module, tests
**Scope:** Render horizontal time axis with bars for date ranges. Auto-calculate tracks to minimise overlaps when `track` is undefined. Color-code bars by category. Support `elementStates` for visual feedback. Labels on or beside bars. Use `ZoomPanContainer` for horizontal scroll/zoom. Handle zoom levels gracefully — show decade markers when zoomed out, year markers when zoomed in.

### 11. Periodic Table Renderer — DONE
**Branch:** `feat/periodic-table-renderer`
**Files:** `src/visualizations/periodic-table/PeriodicTableRenderer.tsx`, CSS module, tests
**Scope:** Render grid of rectangular cells at (row, column) positions. Show symbol prominently in each cell. Color-code by group. Support `elementStates` for visual feedback. Use `ZoomPanContainer` for zoom/pan. When zoomed out, show compact cells with just symbols; when zoomed in, cells could expand to show more data (prepare the slot for a custom render component but don't implement it yet).

## Group C: Quiz Modes (depend on Group B renderers existing, and #5 TogglePanel, #7 ScoreCalculator)

### 12. Free Recall Mode (Unordered)
**Branch:** `feat/free-recall-unordered`
**Files:** `src/quiz-modes/free-recall/FreeRecallMode.tsx`, CSS module, tests
**Scope:** Text input field. User types answers in any order. Fuzzy matching (case-insensitive, ignore accents/diacritics, accept alternate answers from data). On match: mark element as correct in the visualization with a satisfying animation, increment score, clear input. Show progress (e.g., "7/50"). On give up: reveal remaining answers. Gentle feedback — no "wrong" state for typing, only when giving up.
**Note (from #7):** When building the ordered recall variant, use `HintLevel` from `src/scoring/ScoreResult.ts` to track per-answer hint usage. Visualization should colour answers by hint level: `'none'` = green/white (counts as correct), `'partial'` = yellow (doesn't count), `'full'` = red (doesn't count). The scoring function `calculateOrderedRecallScore` already handles this.

### 13. Identify Mode
**Branch:** `feat/identify-mode`
**Files:** `src/quiz-modes/identify/IdentifyMode.tsx`, CSS module, tests
**Scope:** Show a prompt ("Click on Paris"). User clicks elements in the visualization. Correct click: satisfying animation, advance to next prompt. Incorrect click: gentle incorrect animation, element briefly highlighted red. Cycle through all target elements. Support toggles (show/hide hints like flags or labels). Show progress.

### 14. Locate Mode
**Branch:** `feat/locate-mode`
**Files:** `src/quiz-modes/locate/LocateMode.tsx`, CSS module, tests
**Scope:** Show a prompt ("Click where Paris is"). User clicks anywhere on the visualization. Show distance feedback with the score calculator's non-linear curve. Visual feedback: show the correct location and draw a line from the click to it. Satisfying animation for close guesses, gentle feedback for far ones. Advance to next prompt.

## Group D: Integration (depends on Groups A–C)

### 15. Quiz Page Integration
**Branch:** `feat/quiz-page`
**Files:** `src/routes/QuizPage.tsx`, `src/quiz-modes/QuizShell.tsx`, CSS modules
**Scope:** Wire everything together: QuizPage loads quiz definition and data, renders QuizShell with the correct visualization renderer and quiz mode based on URL params and toggle state. Mode selector (dropdown or tabs). Score display. Results screen at end with completion stats and Framer Motion celebration animation (subtle, not confetti — maybe a gentle glow or progress bar fill). "Try again" button.
**Note:** QuizShell already implements a `configuring` → `active` state machine (from feature #5). The config screen (TogglePanel) is shown as a full page before the quiz starts — toggles are NOT visible during the quiz. A "Reconfigure" button returns to the config screen and resets quiz state via key remount. QuizShell's `children` prop is a render function receiving toggle values: `(toggleValues: Record<string, boolean>) => ReactNode`.
**Integration notes:**
- Wire up `Timer` component: pass `QuizDefinition.defaultCountdownSeconds` as `countdownSeconds` prop, handle `onExpire` to end the quiz. Don't render Timer until quiz has started.
- Wire up countdown duration UI: quiz setup screen should allow overriding `defaultCountdownSeconds` before starting.

### 16. Theme Toggle & Global Layout
**Branch:** `feat/global-layout`
**Files:** `src/App.tsx`, CSS modules, potentially a `Layout.tsx` component
**Scope:** App-level layout: header with site title, theme toggle (sun/moon icon), navigation breadcrumbs on quiz pages. Responsive but desktop-first. Smooth theme transition animation. Clean typography. The overall "quiet, satisfying crossword app" aesthetic should come together here.

### 17. European Capitals Quiz Definition
**Branch:** `feat/capitals-quiz`
**Files:** `data/geography/europe/capitals.csv`, supporting country shapes data, quiz definition in registry
**Scope:** Create a complete, real quiz: European capital cities. Full CSV with all ~45 European capitals. Supporting data with simplified country border SVG paths (can be sourced/simplified from Natural Earth data). Wire up the quiz definition with all available modes, sensible toggles (show/hide country borders, show/hide city dots, show/hide country names, show/hide flags), and Easy/Medium/Hard presets.
**Note from #4:** A placeholder definition for this quiz already exists in `quizRegistry.ts` (ID: `geo-capitals-europe`). Update it in place rather than adding a duplicate. The CSV data path is `/data/geography/capitals/europe.csv` (served from `public/`). The `sampleNavigationTree.ts` is now unused — the navigation tree is generated from the registry.
