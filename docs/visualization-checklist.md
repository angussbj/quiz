# Visualization Renderer Checklist

Requirements every visualization renderer must satisfy. Use this when building a new renderer or auditing an existing one.

## Contract

Every renderer receives `VisualizationRendererProps` and must handle its fields. See `src/visualizations/VisualizationRendererProps.ts` for the full interface.

## Required Behaviors

### 1. Element rendering and states

- Render each element from `elements` with visual appearance driven by `elementStates`.
- Support all `ElementVisualState` values: `hidden`, `default`, `correct`, `correct-second`, `correct-third`, `incorrect`, `missed`, `highlighted`, `context`. See `docs/element-states.md` for the approved state table.
- Use `STATUS_COLORS` from `src/visualizations/elementStateColors.ts` for state-driven colors.

### 2. Interaction callbacks

- Call `onElementClick(elementId)` when an element is clicked (if provided).
- Call `onPositionClick({x, y})` with viewBox coordinates when the background is clicked (if provided, used by locate mode).
- Call `onElementHoverStart(elementId)` / `onElementHoverEnd()` for hover states (if provided).

### 3. Labels and toggles

- Respect `toggles` and `elementToggles` for show/hide decisions (labels, group colors, etc.).
- Use `elementToggle()` from `src/visualizations/elementToggle.ts` for per-element toggle resolution.
- Use `shouldShowLabel()` from `src/visualizations/shouldShowLabel.ts` to determine label visibility.

### 4. SVG overlay

- Render `svgOverlay` (used by locate mode for distance lines, target markers, etc.).

### 5. Zoom and pan (SVG-based renderers)

- Use `ZoomPanContainer` from `src/visualizations/ZoomPanContainer.tsx` for zoom/pan.
- Pass `initialCameraPosition` and `putInView` through to the container.
- Do NOT implement custom zoom/pan logic.

### 6. Auto-reveal pulse animation

When elements are revealed without direct user interaction (skip, give-up, wrong-answer auto-reveal), the renderer must display a brief pulse animation to draw attention.

**SVG-based renderers** (map, periodic table, flag grid, anatomy):
- Pass `autoRevealElementIds` through to `ZoomPanContainer`. The container handles pulse rendering automatically via `RevealPulseLayer` — including cluster badge pulses when elements are clustered.
- No additional work needed in the renderer itself.

**HTML-based renderers** (timeline):
- Apply a CSS animation class (e.g., `barRevealPulse`) to elements whose IDs appear in `autoRevealElementIds`.
- The animation should be a subtle expanding pulse — see `TimelineRenderer.module.css` for the reference implementation using `@keyframes revealPulse` (box-shadow expansion + brightness flash, ~1s ease-out).

**Quiz mode integration** (not the renderer's job, but documented here for completeness):
- Each quiz mode hook calls `useRevealPulse().triggerReveal(ids, totalElements)` when auto-reveals happen.
- The hook enforces a 10% threshold: bulk reveals (>10% of total elements) skip animation to avoid visual noise. Single-element reveals always animate.
- The mode passes `revealingElementIds` to the renderer via the `autoRevealElementIds` prop.

### 7. Target element

- If `targetElementId` is provided, visually distinguish the target element (e.g., highlight ring). Used by locate mode to show which element the user should find.

## Adding a New Renderer

1. Create `src/visualizations/<type>/<Type>Renderer.tsx` implementing the above.
2. Add a CSS module `<Type>Renderer.module.css` using theme custom properties for all colors.
3. Register the renderer in `resolveRenderer` (in `src/quiz-modes/ActiveQuiz.tsx` or equivalent).
4. Add element builder in `buildElements` if the data format differs from existing types.
5. Verify all checklist items above, including auto-reveal pulse support.
