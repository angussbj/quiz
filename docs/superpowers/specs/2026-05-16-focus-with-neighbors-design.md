# Focus framing with neighbor context

## Problem

When the camera frames a focus target (locate-mode reveal, prompted-recall advance, ordered-recall remaining group, or the manual Focus button), it can zoom in arbitrarily close to that element. A small element in isolation looks correctly framed in the abstract, but the user loses spatial context — they can no longer tell where on the map the focus is, or what's nearby.

Today's framing logic in `ZoomPanContainer.tsx` (`executePutInView`) has two related but separate behaviors:

1. **Automatic putInView** (no `force`): re-frames only when the target is off-screen or below an 8px-diagonal floor. No upper bound on zoom-in — a small isolated element can be zoomed to fit the screen.
2. **Manual Focus button** (`force: true`, `minScreenFraction: 0.25`): zooms so the target fills at least 25% of the smaller viewport dimension.

Both paths can produce frames where no other quiz elements are visible.

## Goal

Always frame a focus target alongside at least its 4 nearest quiz neighbors, so the user retains spatial context. Apply this rule to both the automatic and manual paths via a single shared code path.

## Rule

The focus frame is computed so that:

1. **Center** is the centroid of the focus target's combined bounding box (multiple IDs allowed; their union bbox is used).
2. **Frame extents** are large enough to include:
   - The focus target itself.
   - The 4 nearest non-hidden, non-focus quiz elements (by centroid-to-centroid Euclidean distance in viewBox coordinates). Tie-breaks deterministically by element ID.
3. **No panning**: the frame is symmetric around the focus center. Required half-extent in each axis is the maximum of `|neighbor_edge − center|` across the focus target and the 4 selected neighbors. Distance is measured in raw viewBox units (no aspect-ratio correction); on equirectangular maps this slightly biases neighbor selection toward latitude-aligned elements, which is acceptable.
4. **Scale** fits the frame into the container with `ZOOM_PADDING = 0.7` (existing constant).
5. **Caps and floors**:
   - Upper cap: `MAX_CLUSTER_SCALE` (existing).
   - Lower floor: the existing 8px-diagonal minimum-visible rule, so a tiny element on a small map still has some screen presence.
6. **Fewer than 5 elements total**: use whatever neighbors exist (e.g., 3 elements → 2 neighbors → frame all 3).

## When to re-frame

### Automatic putInView

Triggered when the `putInView` prop changes. Re-frames if any of the following are true:

- The target is not fully on-screen.
- The target's screen diagonal is below the 8px floor (existing).
- Fewer than 4 non-hidden, non-focus quiz elements are currently visible on-screen (any of them — not necessarily the *nearest* 4). The selection rule asks for the *nearest* 4; the re-frame trigger only checks that *some* 4 are visible. This asymmetry is intentional: the trigger is a cheap "is the user lost?" check, while the framing is a precise "ensure context" computation.
- The target's larger dimension exceeds 50% of the smaller viewport dimension on screen (target too big).

If none of these are true, the camera stays put.

### Manual Focus button

Always re-frames using the rule (existing `force: true` behavior).

The Focus button visibility uses the same conditions as the automatic-trigger checks above: shown when the rule isn't currently satisfied.

## Out of scope

- `Anatomy3DRenderer` keeps its existing camera angle logic. The 4-neighbor rule does not apply to 3D space.
- Cluster-badge clicks (`handleClusterClick`) keep their current "fit cluster bounds" behavior — they intentionally focus on a known group, not a single target.

## Implementation

### Files

**New:**

- `src/visualizations/findNearestNeighbors.ts` — pure function: given focus IDs, all elements, and `n`, return up to `n` nearest non-focus, non-hidden element IDs by centroid distance.
- `src/visualizations/tests/findNearestNeighbors.test.ts`
- `src/visualizations/computeFocusFrame.ts` — pure function: given focus bbox, neighbor bboxes, container size, viewBox, and `basePixelsPerViewBoxUnit`, return `{ scale, posX, posY }`. Encapsulates the centered-extents math.
- `src/visualizations/tests/computeFocusFrame.test.ts`

**Modified:**

- `src/visualizations/ZoomPanContainer.tsx`:
  - Replace `executePutInView`'s scale computation with `computeFocusFrame` using the result of `findNearestNeighbors`.
  - Drop the `minScreenFraction` option from `executePutInView` (no longer needed; the new rule replaces it).
  - Replace `isBBoxVisible` with a richer `shouldReframe` predicate covering the four trigger conditions above.
  - Update `showFocusButton` to use `shouldReframe`.

### Function signatures

```ts
// findNearestNeighbors.ts
export function findNearestNeighbors(
  focusIds: ReadonlySet<string>,
  elements: ReadonlyArray<VisualizationElement>,
  elementStates: Readonly<Record<string, ElementVisualState>> | undefined,
  n: number,
): ReadonlyArray<string>;

// computeFocusFrame.ts
interface BBox { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number; }
export function computeFocusFrame(
  focusBBox: BBox,
  neighborBBoxes: ReadonlyArray<BBox>,
  containerSize: { width: number; height: number },
  viewBox: ViewBox,
  basePixelsPerViewBoxUnit: number,
  minVisiblePixels: number,
): { scale: number; posX: number; posY: number };
```

`computeFocusFrame` keeps the focus center fixed and computes the symmetric half-extents that contain the focus and all neighbor bboxes. Returns the transform to feed `setTransform`.

### Re-frame predicate

```ts
function shouldReframe(
  focusBBox: BBox,
  allElements: ReadonlyArray<VisualizationElement>,
  focusIds: ReadonlySet<string>,
  elementStates: ...,
  containerSize, viewBox, basePixelsPerViewBoxUnit,
  currentTransform: { posX, posY, scale },
): boolean
```

Returns true if any of:

1. `focusBBox` is not fully within the visible viewBox window (existing logic, generalized).
2. `focusBBox` screen diagonal < `MIN_VISIBLE_PX` (8).
3. Count of non-hidden, non-focus quiz elements whose centroid is within the visible viewBox window < 4.
4. `max(focusBBox.width, focusBBox.height) * basePixelsPerViewBoxUnit * scale > 0.5 * min(containerSize.width, containerSize.height)`.

## Testing

**Unit (`findNearestNeighbors.test.ts`):**

- Empty elements list → empty array.
- Fewer than `n` available → returns all available.
- Excludes hidden and focus elements.
- Tie-breaking by element ID.
- Multi-element focus uses combined-bbox centroid as anchor.

**Unit (`computeFocusFrame.test.ts`):**

- Symmetric neighbors → frame is symmetric around focus.
- Asymmetric neighbors → frame extents driven by the farthest edge in each axis.
- Neighbor on left only → frame extends symmetrically on both sides (no panning).
- Single element (no neighbors) → frame uses `MIN_VISIBLE_PX` floor.
- Frame larger than container → scale capped, but no panning.

**Manual:**

- Locate-mode incorrect/skip reveal: target framed with neighbors visible.
- Prompted-recall advance: same.
- Ordered-recall remaining group: same.
- Focus button after manual deep zoom: re-frames with neighbors.
- Tiny isolated dot (e.g. Pacific island): doesn't zoom to maximum; framed with 4 nearest visible.
- Large element (e.g. Russia in a world quiz): doesn't trigger the "too big" path inappropriately.

## Risks

- **Neighbor selection for connected paths**: countries/borders can be very large. A "nearest by centroid" rule may pick visually distant countries when the focus is near a cluster of small ones. Acceptable — the rule is "include 4 elements", not "find the most visually relevant".
- **Stability across renders**: neighbor selection should be deterministic so consecutive identical focus targets don't oscillate. Tie-break by element ID ensures this.
- **Container size 0 on first render**: existing `pendingPutInViewRef` retry path handles this; preserve it.
