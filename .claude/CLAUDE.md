# Quiz Website

Interactive quiz website with rich SVG visualizations. Static SPA built with Vite + React + TypeScript.

## Quick Start

```bash
npm install
npm run dev          # Vite dev server (default: port 5173)
npm test             # Jest tests
npm run typecheck    # tsc --noEmit
npm run build        # Production build
```

## Architecture

Three-tier architecture with TypeScript interfaces as contracts between tiers.

1. **Visualization Renderers** (`src/visualizations/`) — SVG rendering, zoom/pan, element layout
2. **Quiz Modes** (`src/quiz-modes/`) — Answer input, scoring, quiz flow
3. **Quiz Definitions** (`src/quiz-definitions/`) — Data loading, quiz registry

### Key contracts
- `src/visualizations/VisualizationRendererProps.ts` — what renderers receive from quiz modes
- `src/quiz-modes/QuizModeProps.ts` — what mode components receive from the quiz shell
- `src/quiz-definitions/QuizDefinition.ts` — how quiz data and config are structured

### Three coordinate spaces
1. **Data coordinates** (lat/lng, years) — raw data, visualization-specific
2. **SVG viewBox coordinates** — stable "world" space, computed once by renderers, does NOT change with zoom/pan
3. **Screen pixel coordinates** — computed on-the-fly from viewBox + zoom state, not stored on elements

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

### Git
- Conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- One logical change per commit

## Worktree Development

When working in a worktree, use a unique dev server port:
```bash
npm run dev -- --port <PORT>
```

Port assignments:
- 5173: main branch (default)
- 5174–5180: worktree dev servers
