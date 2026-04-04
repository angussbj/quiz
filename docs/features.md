# Feature List (Round 2)

Polish, bug fixes, and new quiz content. Features 1–16 are done (docs for their architecture live in `docs/quiz-integration.md`, `docs/toggle-resolution.md`, `docs/zoom-pan-container.md`, and `CLAUDE.md`). Features 17–19, 21–24, 27 are also done. Feature 20 and items 25+ are listed below. Features within the same group can be worked on in parallel.

## Group E: Bug Fixes & Polish (no dependencies between items)

### 20. Toggle Features & Identify Mode Fixes
**Branch:** `feat/toggle-fixes`
**Scope:**
- **City dots not appearing in identify mode (bug):** Even when the city dots toggle is on, dots don't render in identify mode — making it impossible to click anything. This completely breaks identify mode. Investigate whether the toggle value isn't being passed to the renderer, or if element building is filtering them out.
- **Country names on map:** When the "show country names" toggle is active (or resolved via on-reveal), render country names on the map next to/over the relevant country shape. Applies to free recall mode where the map is the primary visual.
- **Flags on map in free recall:** When the "show flags" toggle is active (or resolved via on-reveal/hintAfter), render flags on the map near the relevant city/country.
- **Flag next to prompt in identify mode:** In identify mode, when the flags toggle is enabled, show the flag next to the country/city name in the prompt bar — not on the map.
- **Per-mode toggle constraints:** Some toggle combinations don't make sense for certain modes. The setup panel should enforce constraints. E.g. identify mode: city dots must be on; at least one of country names or flags must be on. Constrained toggles should be visually disabled with a tooltip. Quiz definitions should declare these constraints per mode.

## Group F: Quiz Data & Definitions

### 25. Flags Quiz Type
**Branch:** `feat/flags-quiz`
**Scope:** Add a "flags" quiz type — identify the country from its flag, or pick the flag for a given country - this should be selectable on the quiz configuration screen. Create quiz definitions per continent and for the world. Can reuse the same data CSVs as capitals/countries with different column mappings.
**Note from #24:** `DataFilter` now supports arrays (AND logic), so filtering by both region and sovereignty is straightforward. The pattern from countries quiz definitions can be reused.

### 26. Periodic Table Quiz
**Branch:** `feat/periodic-table-quiz`
**Scope:** Create a complete periodic table quiz with all 118 elements. CSV data with symbol, name, atomic number, group, period, category. Register quiz definition with appropriate modes (free recall by name/symbol, identify by clicking the element, ordered recall following the order by atomic number, prompted recall (new) where element squares are highlighted in a random order and you have to name them). Sensible toggles (show/hide symbols, show/hide atomic numbers, show/hide category colours).
**Note:** Now includes element subset filtering — users can filter by atomic number range AND by element category (chip toggles). The group filter is a generic mechanism on `QuizDefinition` (`groupFilterColumn`, `groupFilterLabel`) reusable by any quiz with categorical data. Non-selected elements render in muted 'context' state.
**Note:** Ordered recall now supports sorting by any numeric column via `orderedRecallSortColumns` on `QuizDefinition` (generic mechanism). Configured for periodic table with 8 numeric columns. Includes tie groups (elements with same value highlighted simultaneously, answerable in any order), missing value handling (exclude/first/last), and a "Highlight next" toggle. Other quizzes can opt in by adding `orderedRecallSortColumns`.
**Note:** Cost-per-kg data added for all 118 elements (`cost_usd_per_kg`, `cost_date` CSV columns). Three tiers: market prices (USGS/LME), ORNL production costs, and estimated accelerator costs for synthetic elements. Available as both a data display field and color scale option. Methodology page at `/about/element-costs`. See `docs/element-cost-data.md` for sources.


### 28. Largest Cities by Population Quiz — DONE
**Branch:** `worktree-cities-quiz`
**Scope:** Quiz for 834 largest cities worldwide by 2026 population. Data pipeline from raw CSV enriched with GeoNames coordinates. Supports free recall (unordered + ordered), prompted recall, identify, and locate modes. Range filter (top N cities), region chip filters (Asia, Africa, Americas, Europe, Oceania). Prompt toggles for country names and flags in identify/prompted-recall with `atLeastOne` constraints. Label positions computed by bidirectional collision heuristic. `hideFilteredElements` option hides non-matching cities from map. Growth rate column preserved for future color coding.
**Notes:**
- Uses same `supportingDataPaths` (world-borders.csv) as capitals quizzes
- `computeCityLabelPositions.ts` script supports `--regions` flag for selective reprocessing
- CSV columns: `rank,city,city_ascii,latitude,longitude,country,country_code,region,pop2026,growth_rate,label_position,alternates`
- Give Up button styled red across all modes; Reconfigure button enlarged with left chevron (applies globally, not just to this quiz)

### 29. Remove `targetElementId` from Renderer Props ✅
**Branch:** `refactor/remove-target-element-id`
**Done.** Removed `targetElementId` from `VisualizationRendererProps` and all renderers. Identify mode now sets `'highlighted'` state for the current prompt target via `elementStates`. All target-based styling removed from MapRenderer, FlagGridRenderer, PeriodicTableRenderer.

### 30. Rivers Quiz — DONE
**Branch:** `worktree-rivers-quiz`
**Scope:** "Largest rivers" quiz by continent and globally using the map renderer. Uses Natural Earth `ne_10m_rivers_lake_centerlines` data, converted to equirectangular SVG paths via `scripts/generateRiverPaths.ts`. Rivers render as stroked lines (not filled polygons). All four quiz modes supported: free recall, identify, locate (distance-to-closest-point-on-path via `closestPointOnPath`), prompted recall. Country borders as a toggle (default on). World quiz: scalerank <= 5 (~201 rivers). Continent quizzes: scalerank <= 6.
**Key design decisions:**
- `MapElement.pathRenderStyle` field (`'fill' | 'stroke'`) controls how map elements render — fill for countries, stroke for rivers.
- `closestPointOnPath` utility parses SVG path `d` strings and finds the closest point on the polyline, used by locate mode for distance calculation.
- Clustering is automatically disabled for stroke-style elements (centroid clustering doesn't make sense for line features).
- City dots and flag images are skipped for stroke-style elements.
- River stroke width uses fixed viewBox units (0.15 visible, 2.0 hit area), matching how country borders work.
- `renderShapeElements` renders shapes in state layers (default, incorrect, missed, context, correct, highlighted) so state-colored shapes aren't obscured by neighbours.
**Notes for other features:** The `pathRenderStyle` pattern could be reused for other line-based geographic features (e.g. mountain ranges, coastlines).

### 31. Closest-Path Click/Hover for Stroke Elements — DONE
**Scope:** Replace SVG hit-area strokes with a custom closest-path detection system for river-style (stroke) elements. Currently rivers use invisible wide strokes (2.0 viewBox units) for hover/click detection, but overlapping hit areas make nearby rivers unclickable.
**Approach:**
- **Pre-parse paths**: When map elements are built, pre-parse SVG path `d` strings into point arrays (not on every interaction). Store on the element or in a side map.
- **Closest-path on mousemove**: On each mousemove, compute distance from cursor to all stroke-style element paths using point-to-segment projection. Select the closest element within a max pixel-space distance. Update hover state.
- **Closest-path on click**: Same computation on click. Replaces SVG native pointer events for stroke elements.
- **Max distance threshold in pixel space**: Convert viewBox distance to screen pixels using the current zoom scale. Reject matches beyond the threshold (clicking far from any river shouldn't select the closest one).
- **Remove invisible hit-area strokes**: Once custom detection works, the wide invisible strokes can be removed, simplifying the SVG.
**Key files:** `src/visualizations/map/closestPointOnPath.ts` (existing utility, needs pre-parsed variant), `src/visualizations/map/renderShapeElements.tsx` (renders stroke hit areas), `src/visualizations/map/MapRenderer.tsx` (pointer event handling).
**Performance note:** ~343 rivers × ~20 segments = ~7000 distance calculations per mousemove — well under 1ms with pre-parsed paths. The bottleneck is string parsing, which pre-parsing eliminates.
