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

`QuizDefinition.dataFilter` filters rows at load time: `{ column: 'region', values: ['Europe'] }`. Multiple values act as OR. `supportingDataFilter` does the same for border data. Adding a new region quiz requires only a new registry entry — no new data files.

Border CSV format: `id,name,region,group,paths` where `paths` contains pipe-separated SVG path `d` strings. Use `parseBackgroundPaths()` to convert to `BackgroundPath[]`.

### Data Generation Scripts

Scripts in `scripts/` regenerate the data CSVs from source datasets:
- `generateWorldCapitals.ts` — from mledoze/countries + dr5hn/cities
- `generateBorderPaths.ts` — from Natural Earth GeoJSON (equirectangular projection, Douglas-Peucker simplification)

Source files are gitignored (too large). Download URLs are in each script's header comments.

## Conventions

### File Organization
- One component/interface per file. One responsibility per file.
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

### CSS
- Use CSS modules for component styles: `Component.module.css`
- All colors, spacing, typography via CSS custom properties from `src/theme/theme.css`
- Never hardcode color values. Always use `var(--color-*)`.
- Light/dark mode via `data-theme` attribute on `<html>`.

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

### Detailed docs
- `docs/zoom-pan-container.md` — ZoomPanContainer architecture, clustering algorithm, coordinate space handling

## Worktree Development

When working in a worktree, just run `npm run dev`. Vite automatically picks a free port if the default (5173) is in use. Tell the user which port is being used.
