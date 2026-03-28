# ZoomPanContainer

Shared zoom/pan wrapper around `react-zoom-pan-pinch` for all visualization renderers.

## Components

### `ZoomPanContainer`
**File:** `src/visualizations/ZoomPanContainer.tsx`

Wraps children (SVG content from renderers) in a zoomable, pannable container. Computes a total SVG viewBox from all element bounds and manages clustering.

**Props:**
- `children` — SVG elements to render in the main (background) SVG
- `elements` — all `VisualizationElement` objects, used for viewBox calculation and clustering
- `elementStates` — current visual states, used for cluster badge numerator
- `clustering` — optional `ClusteringConfig` to enable element clustering
- `onClusterClick` — called when a cluster badge is clicked
- `elementOverlays` — optional ReactNode rendered as sibling SVG layers on top of the main SVG, used for compositing isolation (see "Layered SVG architecture" below)

### `ClusterBadge`
**File:** `src/visualizations/ClusterBadge.tsx`

SVG badge rendered at a cluster's centroid. Shows "matched/total" count. Uses inverse-scale transform to stay constant screen size at all zoom levels. Animates in/out with Framer Motion.

### `ZoomPanContext`
**File:** `src/visualizations/ZoomPanContext.ts`

React context provided by ZoomPanContainer. Use the `useZoomPan()` hook to access:
- `scale` — current zoom scale (quantised to 0.1 steps to limit re-renders)
- `clusteredElementIds` — `ReadonlySet<string>` of element IDs currently hidden in clusters
- `viewBoxString` — the SVG viewBox string, for creating additional SVGs with matching coordinates (used by element overlays)

Renderers should check `clusteredElementIds` and hide those elements, since the container renders ClusterBadge overlays for them.

## Clustering algorithm

**File:** `src/visualizations/computeClusters.ts`

Greedy centroid-based clustering. For each seed element:
1. Start a cluster with the seed
2. Scan remaining elements — add any whose center is within `minScreenPixelDistance` of the cluster's **centroid** (not any member)
3. Recalculate centroid after each addition, rescan
4. Repeat until no more elements can be added

Because distance is measured from the centroid, a chain of closely-spaced elements splits into multiple clusters rather than merging into one giant cluster.

Clustering is disabled when `scale >= disableAboveScale`.

## Layered SVG architecture

The container uses a stacked-SVG layout inside a `div.svgStack` wrapper to isolate compositing layers and prevent hover-induced repaints from propagating across elements. The stacking order (bottom to top):

1. **Main SVG** (`children`) — background content: borders, lakes, ocean, labels, dots, flags
2. **Element overlay SVGs** (`elementOverlays`) — one `<svg>` per interactive quiz element (country polygon, river path), each with `contain: strict` and `will-change: opacity` for GPU compositing isolation
3. **Cluster badge SVG** — rendered on top so badges are never obscured by element overlays

All SVGs share the same `viewBox` and `preserveAspectRatio="xMidYMid meet"` so their coordinate spaces align. The overlay SVGs have `pointer-events: none` on the `<svg>` element itself, with `pointer-events: auto` on interactive children.

**Why separate SVGs?** CSS hover effects (even simple `opacity` transitions) within a single SVG trigger browser repaints across the entire compositing layer, causing visible flicker on neighbouring elements. Separate SVGs give each element its own compositing layer. Each element is also wrapped in a `React.memo`'d component (`OverlayElement`) so React skips re-rendering elements whose state hasn't changed.

The `MapRenderer` uses this pattern via `MapElementOverlays` (`src/visualizations/map/MapElementOverlays.tsx`), which reads `viewBoxString` from `ZoomPanContext` to create matching overlay SVGs.

## Coordinate space handling

The container computes a viewBox from the union of all element `viewBoxBounds` (with 5% padding). All SVGs in the stack use `preserveAspectRatio="xMidYMid meet"`.

Screen pixel distance = viewBox distance × scale × basePixelsPerViewBoxUnit

where `basePixelsPerViewBoxUnit = min(containerWidth / viewBoxWidth, containerHeight / viewBoxHeight)`.

## Tooltip portal pattern

`react-zoom-pan-pinch`'s CSS `transform` on the wrapper creates a new containing block, which breaks `position: fixed` positioning for any child elements. Tooltips (or any overlay that needs to be positioned relative to the viewport) must be rendered via `createPortal(tooltip, document.body)` instead of inside the SVG. See `TimelineRenderer.tsx` for the pattern. Any renderer adding tooltips should follow the same approach.

## SVG click handling

An SVG `<g>` element only receives click events on its visible children — clicks on empty space fall through to the `<svg>` element itself. Renderers that use `onPositionClick` (e.g., locate mode) must add a transparent `<rect>` covering the full area as the first child of their click-handling `<g>`, otherwise clicks on empty map/grid areas won't register. See `MapRenderer.tsx` for the pattern.
