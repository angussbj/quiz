# ZoomPanContainer

Shared zoom/pan wrapper around `react-zoom-pan-pinch` for all visualization renderers.

## Components

### `ZoomPanContainer`
**File:** `src/visualizations/ZoomPanContainer.tsx`

Wraps children (SVG content from renderers) in a zoomable, pannable container. Computes a total SVG viewBox from all element bounds and manages clustering.

**Props:**
- `children` — SVG elements to render (from visualization renderers)
- `elements` — all `VisualizationElement` objects, used for viewBox calculation and clustering
- `elementStates` — current visual states, used for cluster badge numerator
- `clustering` — optional `ClusteringConfig` to enable element clustering
- `onClusterClick` — called when a cluster badge is clicked

### `ClusterBadge`
**File:** `src/visualizations/ClusterBadge.tsx`

SVG badge rendered at a cluster's centroid. Shows "matched/total" count. Uses inverse-scale transform to stay constant screen size at all zoom levels. Animates in/out with Framer Motion.

### `ZoomPanContext`
**File:** `src/visualizations/ZoomPanContext.ts`

React context provided by ZoomPanContainer. Use the `useZoomPan()` hook to access:
- `scale` — current zoom scale (quantised to 0.1 steps to limit re-renders)
- `clusteredElementIds` — `ReadonlySet<string>` of element IDs currently hidden in clusters

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

## Coordinate space handling

The container creates a single `<svg>` with a viewBox computed from the union of all element `viewBoxBounds` (with 5% padding). The SVG uses `preserveAspectRatio="xMidYMid meet"`.

Screen pixel distance = viewBox distance × scale × basePixelsPerViewBoxUnit

where `basePixelsPerViewBoxUnit = min(containerWidth / viewBoxWidth, containerHeight / viewBoxHeight)`.
