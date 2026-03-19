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

### 23. Capital & Border Data for All Continents — DONE
**Branch:** `feat/all-capitals`
**Scope:** Extend capital city data beyond Europe. Check that the data for Asia, Africa, North America, South America, and Oceania is already in the existing csvs and if there are any edge cases we should check (e.g. Taiwan, Palestine, French Guiana, etc.). Register quiz definitions for each continent and for the world. Follow the same patterns as #17. Use Natural Earth 1:110m data, pre-converted to SVG paths.
**What was done:**
- All 197 capitals and 233 border rows were already present in the shared CSVs. No new data files needed.
- Extracted `capitalsQuizBase` shared config in `quizRegistry.ts` — all capitals quizzes spread this and only override `id`, `title`, `description`, and `dataFilter`. Ensures consistent toggles (borders, city dots, country names on map, flags on map, prompt country names, prompt flags), presets (easy/medium/hard), column mappings (including `code`), modes, and mode constraints.
- Registered 4 new quiz definitions: North American Capitals, South American Capitals, Oceanian Capitals, World Capitals.
- Americas split using `subregion` column: North America = subregions `North America` + `Central America` + `Caribbean` (23 countries); South America = subregion `South America` (12 countries).
- World quiz has no `dataFilter` — loads all 197 capitals.
- Asia and Africa upgraded from simpler toggles to full Europe-style config (flags on map, prompt fields, mode constraints) via the shared base.
- Added data validation tests for all continent filters and the Americas subregion split.

### 24. Countries Quiz Type — DONE
**Branch:** `feat/countries-quiz`
**Scope:** Add a "countries" quiz type — name the country from its shape/location on the map. Different from capitals (which focuses on cities). Create quiz definitions per continent and for the world, registered in the quiz registry. Can reuse the same border data from #23.
**What was built:**
- Enriched `world-borders.csv` with `latitude`, `longitude`, `name_alternates`, and `is_sovereign` columns. Sovereign countries (197) get coordinates from `world-capitals.csv`; territories (40) get centroid coordinates computed from SVG path bounding boxes. Script: `scripts/enrichBordersWithCountryData.mjs`.
- Extended `DataFilter` to support multiple filters (array with AND logic). Countries quizzes filter by both `is_sovereign` and `region`/`group`.
- Added 8 quiz definitions: Europe, Asia, Africa, North America, South America, Oceania, and World. All use `world-borders.csv` directly with multi-filters. Modes: free recall, identify, locate. Toggles: borders, country names (on-reveal), flags (hint after 2). Easy/Medium/Hard presets.
- Extended `BackgroundPath` with optional `label` and `labelCenter`. Non-quiz territories show name labels when the `showCountryNames` toggle is on.
- North/South America split uses `group` (subregion) filter: North America includes `North America`, `Central America`, `Caribbean` subregions.
**Notes:** The `columnMappings.answer` is `'name'` so `matchAnswer` automatically checks `name_alternates` for alternate country names. The world quiz groups by `region` (continent-level colours), while continent quizzes group by `group` (subregion colours).

### 25. Flags Quiz Type
**Branch:** `feat/flags-quiz`
**Scope:** Add a "flags" quiz type — identify the country from its flag, or pick the flag for a given country - this should be selectable on the quiz configuration screen. Create quiz definitions per continent and for the world. Can reuse the same data CSVs as capitals/countries with different column mappings.
**Note from #24:** `DataFilter` now supports arrays (AND logic), so filtering by both region and sovereignty is straightforward. The pattern from countries quiz definitions can be reused.

### 26. Periodic Table Quiz
**Branch:** `feat/periodic-table-quiz`
**Scope:** Create a complete periodic table quiz with all 118 elements. CSV data with symbol, name, atomic number, group, period, category. Register quiz definition with appropriate modes (free recall by name/symbol, identify by clicking the element, ordered recall following the order by atomic number, prompted recall (new) where element squares are highlighted in a random order and you have to name them). Sensible toggles (show/hide symbols, show/hide atomic numbers, show/hide category colours).

### 27. WWII Timeline Quiz
**Branch:** `feat/wwii-timeline`
**Scope:** Create a WWII timeline quiz with major events and their date ranges. CSV data with event name, start date, end date, category (e.g. European theatre, Pacific theatre, diplomacy). Register quiz definition with appropriate modes. Needed to exercise the timeline renderer end-to-end.
