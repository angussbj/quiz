# Quiz Website

Interactive quiz website with rich SVG visualizations. Static SPA built with Vite + React + TypeScript.

## Quick Start

```bash
npm install
npm run dev          # Vite dev server (default: port 5173)
npm test             # Jest tests
npm run typecheck    # tsc --noEmit
npm run build        # Production build
npm run storybook    # Storybook dev server
```

## Architecture

Three-tier architecture with TypeScript interfaces as contracts between tiers.

1. **Visualization Renderers** (`src/visualizations/`) — SVG rendering, zoom/pan, element layout
2. **Quiz Modes** (`src/quiz-modes/`) — Answer input, scoring, quiz flow
3. **Quiz Definitions** (`src/quiz-definitions/`) — Data loading, quiz registry
4. **Layout** (`src/layout/`) — Global shell: header ("Quizzical"), theme toggle (light/dark/system), breadcrumbs. Breadcrumbs live here, not in individual pages. Category URLs (e.g. `/geography/capitals`) filter the home page via `findSubtree`.
5. **Utilities** (`src/utilities/`) — Shared pure functions (e.g., `shuffle`)

### Key contracts
- `src/visualizations/VisualizationRendererProps.ts` — what renderers receive from quiz modes
- `src/quiz-modes/QuizModeProps.ts` — what mode components receive from the quiz shell
- `src/quiz-definitions/QuizDefinition.ts` — how quiz data and config are structured

### Three coordinate spaces
1. **Data coordinates** (lat/lng, years) — raw data, visualization-specific
2. **SVG viewBox coordinates** — stable "world" space, computed once by renderers, does NOT change with zoom/pan
3. **Screen pixel coordinates** — computed on-the-fly from viewBox + zoom state, not stored on elements

Map projection: equirectangular — **x = longitude, y = −latitude** (negated so north is up in SVG). See `src/visualizations/map/projectGeo.ts`.

## Design / UX Direction

The aesthetic is **quiet and satisfying**, like a well-made crossword app. Not gamified, not flashy.

- **Completion-oriented incentives**: progress bars, "47/50 capitals", percentage badges. Users should feel good about progress no matter where they're up to.
- **In-quiz feedback**: smooth animations when you get something right. Gentle handling of wrong answers — not punishing.
- **No "warming up" phase** — users jump straight into the quiz.
- **Light and dark mode** — all colours parameterised via CSS custom properties.
- **Mobile**: not first-class, but basic touch gesture support for zoom/pan.

## Data Model

Quiz data is intentionally generic. `QuizDataRow<K>` is parameterised by column keys because different quiz modes use different columns as the "answer". For a capitals quiz, the answer might be the city name, the coordinates, the country name, or the flag — depending on the mode. `QuizDefinition<K>.columnMappings` maps role names (like "answer", "label", "coordinates") to CSV column keys, and the type parameter `K` ensures these references are checked at compile time.

Toggles (show/hide flags, show/hide borders, etc.) are approximately independent boolean options, not discrete "modes". Presets like Easy/Hard set multiple toggles at once, but individual toggles remain immediately accessible in the UI.

### Shared Data CSVs and DataFilter

Quiz data uses shared CSVs filtered by region rather than per-region files:
- `public/data/capitals/world-capitals.csv` — 197 world capitals with `region` and `subregion` columns
- `public/data/borders/world-borders.csv` — 233 countries with equirectangular SVG border paths

When multiple quiz definitions share the same structure (e.g. all capitals quizzes), extract a shared base object and spread it per definition. See `capitalsQuizBase` in `quizRegistry.ts` for the pattern.

`QuizDefinition.dataFilter` filters rows at load time: `{ column: 'region', values: ['Europe'] }`. Multiple values act as OR. Array of filters uses AND logic. Adding a new region quiz requires only a new registry entry — no new data files.

`QuizDefinition.initialCameraPosition` (`{x, y, width, height}` in equirectangular viewBox coordinates) sets the initial camera framing without clipping the SVG — users can pan beyond it. If omitted, the camera auto-fits the quiz elements. Quizzes covering a large continent/world should set this explicitly so the view starts zoomed to the relevant region rather than fully zoomed out.

Border CSV format: `id,name,region,group,paths,latitude,longitude,name_alternates,is_sovereign` where `paths` contains pipe-separated SVG path `d` strings. The `is_sovereign` column (`"true"`/`""`) controls the `sovereign` field on `BackgroundPath` — sovereign countries get `sovereign = name`, territories get `sovereign = undefined`. Use `parseBackgroundPaths()` from `src/visualizations/map/loadBackgroundPaths.ts` to convert to `BackgroundPath[]`. Pass a `wrapLongitude` to shift the antimeridian (e.g., `-169` for Oceania so Kiribati renders on the right edge instead of split).

### Data Generation Scripts

Scripts in `scripts/` regenerate the data CSVs from source datasets:
- `generateWorldCapitals.ts` — from mledoze/countries + dr5hn/cities
- `generateBorderPaths.ts` — from Natural Earth GeoJSON (equirectangular projection, Douglas-Peucker simplification)
- `enrichBordersWithCountryData.mjs` — adds `latitude`, `longitude`, `name_alternates`, `is_sovereign` columns to `world-borders.csv` (sovereign countries get coordinates from capitals CSV; territories get centroid coordinates from SVG bounding boxes)

Source files are gitignored (too large). Download URLs are in each script's header comments.

## Conventions

### File Organization
- One component/interface per file. One responsibility per file.
- Break long functions into multiple smaller functions, and large classes into multiple smaller classes. Functions and classes should each have one clear responsibility.
- File names match main export: PascalCase for components/interfaces (`MapRenderer.tsx`, `QuizDefinition.ts`), camelCase for functions/hooks (`calculateScore.ts`, `useLocalStorage.ts`).
- Tests go in a `tests/` directory next to the code: `foo/Bar.ts` → `foo/tests/Bar.test.ts`
- Keep directories small. Split when a directory exceeds ~8 files.
- No abbreviations in names.

### Types
- Types are colocated with their producers, NOT in a separate `types/` directory.
- Shared interfaces live in the producer's directory. Consumers import from there.
- Never use `as` type casting. Never use `as any`.
- Use `readonly` on all interface fields.
- Use `ReadonlyArray` for array types in interfaces.
- Use `Readonly<Record<K, V>>` for map types (not `ReadonlyMap` — records serialize to JSON).

### Public Assets
- The app is deployed at a subpath (`/quiz/`). All runtime references to files in `public/` (fetch URLs, `<img src>`, `<image href>`) must use `assetPath()` from `src/utilities/assetPath.ts`.
- Never hardcode absolute paths like `/data/...` or `/flags/...` — they will break in production.

### CSS
- Use CSS modules for component styles: `Component.module.css`
- All colors, spacing, typography via CSS custom properties from `src/theme/theme.css`
- Never hardcode color values. Always use `var(--color-*)`.
- Light/dark mode via `data-theme` attribute on `<html>`.
- `--color-overlay` for modal/dialog backdrops (light: `rgba(0,0,0,0.4)`, dark: `rgba(0,0,0,0.6)`) — don't hardcode rgba values.

### Components
- Visualization renderers receive `VisualizationRendererProps`
- Quiz modes receive `QuizModeProps`
- Animations: use Framer Motion (`motion` from `framer-motion`)
- Zoom/pan: use only through `ZoomPanContainer` wrapper (wraps `react-zoom-pan-pinch`)

### Testing
- Heavy unit tests: scoring, data parsing, toggle state, hooks
- Moderate component tests: quiz modes render correctly
- Fewer integration tests: full quiz flows
- Use `@testing-library/react`. Query by role/label, not test IDs.
- Jest uses `tsconfig.test.json` (needed for verbatimModuleSyntax compatibility)
- Tests rendering `ThemeProvider` need `window.matchMedia` mocked (jsdom doesn't provide it). See `src/layout/tests/ThemeToggle.test.tsx` for the pattern.

### Storybook
- Stories live next to their components: `Component.stories.tsx`
- Use Storybook to visually test components before they're wired to routes
- Config: `.storybook/main.ts`, `.storybook/preview.ts`
- Theme CSS is loaded globally in `preview.ts`

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One logical change per commit
- When moving files to reorganise a directory, keep the move isolated in its own commit:
  1. Stash work in progress: `git stash`
  2. Move the files
  3. Run `npm test` and `npm run typecheck` and fix any issues
  4. Commit the move with a clear description
  5. Pop the stash: `git stash pop`

### Detailed docs
- `docs/zoom-pan-container.md` — ZoomPanContainer architecture, clustering algorithm, coordinate space handling
- `docs/toggle-resolution.md` — Toggle hidden behaviors, per-element resolution flow, per-mode behavior
- `docs/quiz-integration.md` — Quiz page flow, mode composition patterns, element building, background paths, answer matching
- `docs/history-quiz-guidelines.md` — Principles for selecting/grouping historical events, CSV format for timelines, date precision
- `docs/element-states.md` — Approved element visual state table and per-mode usage contract

## Worktree Development

When working in a worktree, just run `npm run dev`. Vite automatically picks a free port if the default (5173) is in use. Tell the user which port is being used.
