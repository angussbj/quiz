# Anatomy 3D Renderer

React Three Fiber renderer for 3D skeleton quizzes. Renders a GLB model with per-bone coloring driven by element visual states.

## Architecture

The renderer has three nested component layers inside a single `<Canvas>`:

1. **`SkeletonMeshes`** — loads the GLB, clones it for bilateral mirroring, deep-clones materials for independent coloring, computes bone centers and camera views, handles pointer events.
2. **`Scene`** — orchestrates lights, OrbitControls, camera animation, and the label overlay.
3. **`Anatomy3DRenderer`** (exported) — the top-level component matching `VisualizationRendererProps`. Manages sidebar UI and local state (label mode, camera views).

## GLB Model and Bilateral Mirroring

The GLB (`public/data/bones-3d/overview-skeleton.glb`) contains only right-side (`.r` suffix) and midline bones. Left-side bones are rendered by cloning the entire scene and scaling it by `(-1, 1, 1)` on the x-axis. This means:

- Right-side bones: rendered in the original scene.
- Left-side bones: rendered in the mirrored scene (same mesh, flipped).
- Midline bones: rendered only in the original scene (the mirrored copy overlaps at x=0 and is skipped during coloring).
- **Exception**: `Parietal bone left` and `Parietal bone right` are both directly in the GLB (not mirrored).

The `meshMap` keys encode this: `"original:MeshKey"` or `"mirrored:MeshKey"`.

**Z-fighting prevention**: In the mirrored scene, meshes with an `original:` entry but no `mirrored:` entry are hidden (`visible = false`) — these are midline or direct-mesh quiz bones already rendered in the original scene. Meshes with no entry at all (non-quiz context like teeth, costal cartilage) keep context colors in both scenes so they mirror correctly.

## Grouped Elements and meshEntries

When elements are grouped (bilateral merge or numbered merge), every constituent mesh maps to the same quiz element. The `Anatomy3DElement.meshEntries` array holds all mesh entries for the group:

- **Ungrouped**: 1 entry (e.g. `sternum` → `[{ meshName: 'Manubrium_of_sternum', side: 'midline', ... }]`)
- **Bilateral pair**: 2 entries (right + left, e.g. `femur` → right mesh + mirrored left mesh)
- **Numbered group**: N entries (e.g. `rib` with bilateral = 24 entries: 12 ribs × 2 sides)

All meshes in the group:
- Display the **same visual state** (color, opacity, emissive).
- Respond to **the same click** (clicking any constituent mesh selects the group element).
- Get their **own label sprite** (all showing the same group name, e.g. "Rib").

For locate mode distance checking, clicking any mesh in the group returns that mesh's element ID. Since the element is the correct answer, the distance is 0 regardless of which specific mesh was clicked.

## Three.js Name Sanitization

Three.js GLTFLoader sanitizes node names: **spaces become underscores**, dots are stripped. The `toNodeKey()` function applies the same transform so lookups match. Any hardcoded mesh name references (e.g. camera preset bone lists) must use original GLB names — `toNodeKey` handles the comparison.

## Sidebar Controls

The sidebar is rendered outside the R3F `<Canvas>` as regular HTML. It contains:

- **Camera presets** — 7 buttons (Full body, Skull, Torso, Legs, Hand, Foot, Back) with keyboard shortcuts. Each computes a `CameraView` (position + target) from bone bounding boxes at model load time.
- **Label mode** — Off / Hover / On segmented control, managed as local component state (not a quiz toggle).

## Label Visibility

Labels are sprite-based (canvas-rendered text textures that always face the camera). Visibility is governed by both the element's visual state and the label mode setting:

| Element State | Off | Hover | On |
|---|---|---|---|
| `default` / `highlighted` / `hidden` | — | — | — |
| `correct` / `correct-*` / `incorrect` / `missed` / `context` | — | Hovered only | Yes |

Key design decision: labels **never** appear for unanswered bones (`default`, `highlighted`), regardless of label mode. This prevents the label control from revealing answers. The mode only controls noise among already-answered labels.

Each mesh in a grouped element gets its own label sprite (all showing the same name). Label scale varies by body zone (`zoneScale`) — extremities (hands, feet, head) use smaller labels to avoid clutter.

## Element State Colors

Each visual state maps to a `{mesh, emissive, opacity}` triple applied to `MeshStandardMaterial`:

| State | Mesh Color | Emissive | Opacity |
|---|---|---|---|
| `default` | `--color-bone-default` (#e4ccb1) | black | 1.0 |
| `hidden` | grey | black | 0.0 |
| `highlighted` | `--color-highlighted` | #443300 | 1.0 |
| `context` | `--color-bone-context` | black | 0.55 |
| `correct` | `--color-correct` | #003311 | 1.0 |
| `correct-second` | `--color-correct-second` | #002200 | 1.0 |
| `correct-third` | `--color-correct-third` | #001100 | 1.0 |
| `incorrect` | `--color-incorrect` | #330000 | 1.0 |
| `missed` | `--color-missed` | #221100 | 1.0 |

Meshes not in the quiz element list (e.g. teeth when `showTeeth` is off) use a hardcoded context style: `#c8bba8` at 50% opacity.

The default bone color (#e4ccb1) matches the GLB asset's original material base color.

## Drag Detection

OrbitControls and bone click handlers coexist. A pointer-down/move ref tracks drag distance; clicks are suppressed when the pointer moved >5px (same threshold as the 2D map renderer). This prevents camera orbiting from registering as a locate answer.

## Camera Animation

`CameraAnimator` uses `useFrame` to lerp camera position and OrbitControls target toward the preset view. Convergence threshold is 0.5mm. The `onDone` callback clears the animation target so the lerp stops.
