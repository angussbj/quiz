# Feature List (Round 2)

Polish, bug fixes, and new quiz content. Features 1–16 are done (docs for their architecture live in `docs/quiz-integration.md`, `docs/toggle-resolution.md`, `docs/zoom-pan-container.md`, and `CLAUDE.md`). Feature 17 and items 18+ are listed below. Features within the same group can be worked on in parallel.

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

### 20. Toggle Features & Identify Mode Fixes
**Branch:** `feat/toggle-fixes`
**Scope:**
- **City dots not appearing in identify mode (bug):** Even when the city dots toggle is on, dots don't render in identify mode — making it impossible to click anything. This completely breaks identify mode. Investigate whether the toggle value isn't being passed to the renderer, or if element building is filtering them out.
- **Country names on map:** When the "show country names" toggle is active (or resolved via on-reveal), render country names on the map next to/over the relevant country shape. Applies to free recall mode where the map is the primary visual.
- **Flags on map in free recall:** When the "show flags" toggle is active (or resolved via on-reveal/hintAfter), render flags on the map near the relevant city/country.
- **Flag next to prompt in identify mode:** In identify mode, when the flags toggle is enabled, show the flag next to the country/city name in the prompt bar — not on the map.
- **Per-mode toggle constraints:** Some toggle combinations don't make sense for certain modes. The setup panel should enforce constraints. E.g. identify mode: city dots must be on; at least one of country names or flags must be on. Constrained toggles should be visually disabled with a tooltip. Quiz definitions should declare these constraints per mode.

### 21. Quiz Results Review Mode — DONE
**Branch:** `feat/results-review`
**Scope:** The results screen should have a way to dismiss the overlay and go back to viewing the visualization in a read-only state (no more answers accepted). Lets users review what they got right/wrong on the map/grid/timeline.

### 22. Multi-Region Support — DONE
**Branch:** `feat/multi-region`
**Scope:** Some countries/cities belong to multiple regions (e.g. Türkiye and Russia are in both Europe and Asia). Data CSVs should support multiple regions per row (e.g. pipe-separated: `Europe|Asia`). Filtering by region should return any row that has at least one matching region. Affects quiz definitions, data loading, and any region-based filtering logic.
**Notes:** `applyDataFilter` splits cell values on `|` before matching. Turkey and Russia are now `Europe|Asia` in both world-capitals.csv and world-borders.csv. To add more multi-region countries, just update the `region` column — no code changes needed.

## Group F: Quiz Data & Definitions (depend on #19 for map fixes, #22 for multi-region)

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

### 23. Capital & Border Data for All Continents
**Branch:** `feat/all-capitals`
**Scope:** Extend capital city data beyond Europe. Check that the data for Asia, Africa, North America, South America, and Oceania is already in the existing csvs and if there are any edge cases we should check (e.g. Taiwan, Palestine, French Guiana, etc.). Register quiz definitions for each continent and for the world. Follow the same patterns as #17. Use Natural Earth 1:110m data, pre-converted to SVG paths.

### 24. Countries Quiz Type
**Branch:** `feat/countries-quiz`
**Scope:** Add a "countries" quiz type — name the country from its shape/location on the map. Different from capitals (which focuses on cities). Create quiz definitions per continent and for the world, registered in the quiz registry. Can reuse the same border data from #23.

### 25. Flags Quiz Type
**Branch:** `feat/flags-quiz`
**Scope:** Add a "flags" quiz type — identify the country from its flag, or pick the flag for a given country - this should be selectable on the quiz configuration screen. Create quiz definitions per continent and for the world. Can reuse the same data CSVs as capitals/countries with different column mappings.

### 26. Periodic Table Quiz — DONE
**Branch:** `worktree-periodic-table`
**Scope:** Create a complete periodic table quiz with all 118 elements. CSV data with symbol, name, atomic number, group, period, category. Register quiz definition with appropriate modes (free recall by name/symbol, identify by clicking the element, ordered recall following the order by atomic number, prompted recall (new) where element squares are highlighted in a random order and you have to name them). Sensible toggles (show/hide symbols, show/hide atomic numbers, show/hide category colours).
**What was done:**
- `periodic-table.csv`: 118 elements with atomic weight, block, standard state, density, electronegativity, year discovered, and name alternates. Data cross-checked against PubChem. Sorted by atomic number.
- **Prompted recall mode** (new, generic): inverse of identify — an element is highlighted on the visualization and the user types its name. Auto-matches as you type. On Enter with wrong answer, flashes incorrect. Skip/give-up available. Works for any quiz definition, not periodic-table-specific.
- **Ordered recall mode** (`free-recall-ordered`): sequential free recall — answers must come in CSV row order. Current element highlighted. Same input pattern as prompted recall.
- **Renderer updates**: removed `isTarget` from `PeriodicTableRenderer` (highlighting now driven by `'highlighted'` elementState per feature 28 approach). Added `showAtomicNumbers` toggle rendering (top-left of cell when zoomed). Added `showNames` toggle for independent label visibility. Made `showGroups` a proper `ToggleDefinition`.
- **Registry**: 4 modes (free recall, prompted recall, ordered recall, identify). Toggles: showSymbols (on-reveal), showAtomicNumbers (on-reveal), showNames (on-reveal), showGroups/category colours (never). Easy/Hard presets. Removed `sci-element-symbols` quiz.
- Both new modes use `renderVisualization` render prop pattern (like IdentifyMode). Both new hooks follow `useIdentifyQuiz` patterns with `matchAnswer` for answer checking.
**Note (prompted recall):** The `'prompted-recall'` QuizModeType is generic. Any quiz definition can opt into it by adding `'prompted-recall'` to `availableModes`. The mode highlights each element in random order and the user types the answer. Toggle resolution via `resolveElementToggles` handles hiding labels/symbols for unanswered elements.
**Note (ordered recall):** `'free-recall-ordered'` uses CSV row order (no shuffling). For periodic table, this means atomic number order. Other quizzes can use it too — the order depends on their CSV sorting.
**Note (feature 28):** This feature partially implements feature 28's goal — `PeriodicTableRenderer` no longer uses `targetElementId` for highlighting. The `MapRenderer` still does (feature 28 should clean that up).

### 27. WWII Timeline Quiz
**Branch:** `feat/wwii-timeline`
**Scope:** Create a WWII timeline quiz with major events and their date ranges. CSV data with event name, start date, end date, category (e.g. European theatre, Pacific theatre, diplomacy). Register quiz definition with appropriate modes. Needed to exercise the timeline renderer end-to-end.
