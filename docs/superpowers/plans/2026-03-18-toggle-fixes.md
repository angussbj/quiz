# Toggle Features & Identify Mode Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix city dots in identify mode, render country name labels from background data, add SVG flags to the map and identify prompt, and implement per-mode toggle constraints in the setup panel.

**Architecture:** Five independent subsystems wired together through the existing toggle/element system. The `'default'` element state makes dots visible in identify mode. Country name labels are rendered from background border data centroids. SVG flag files are loaded via `<image>` elements keyed by country code. The identify mode prompt bar becomes data-driven from toggle state + CSV row data. Toggle constraints are declared per-mode on the quiz definition and enforced in the setup panel.

**Tech Stack:** React, TypeScript, SVG, CSS Modules, Jest + Testing Library

---

## File Structure

### New files
- `src/visualizations/map/computePathCentroid.ts` — compute centroid of SVG path `d` strings for label placement
- `src/visualizations/map/tests/computePathCentroid.test.ts` — tests
- `src/visualizations/map/BackgroundLabel.ts` — interface for background label data (name + centroid position)
- `src/visualizations/map/computeBackgroundLabels.ts` — derives label positions from BackgroundPath data
- `src/visualizations/map/tests/computeBackgroundLabels.test.ts` — tests
- `src/quiz-modes/identify/IdentifyPromptFields.tsx` — renders data-driven prompt fields (text, SVG images)
- `src/quiz-modes/identify/IdentifyPromptFields.module.css` — styling for prompt fields
- `src/quiz-modes/identify/tests/IdentifyPromptFields.test.tsx` — tests
- `src/quiz-modes/ToggleConstraint.ts` — constraint types (simple + at-least-one)
- `src/quiz-modes/resolveToggleConstraints.ts` — evaluates constraints against current toggle values + mode
- `src/quiz-modes/tests/resolveToggleConstraints.test.ts` — tests
- `public/flags/*.svg` — individual SVG flag files keyed by alpha-2 country code (e.g., `fr.svg`)

### Modified files
- `src/visualizations/VisualizationElement.ts` — add `'default'` to `ElementVisualState`
- `src/quiz-modes/identify/useIdentifyQuiz.ts` — use `'default'` instead of `'hidden'` for unanswered elements
- `src/quiz-modes/identify/tests/useIdentifyQuiz.test.ts` — update expected states
- `src/visualizations/map/MapRenderer.tsx` — handle `'default'` state for dots; render background labels; render flag images
- `src/visualizations/map/MapRenderer.module.css` — styles for default-state dots, background labels, flag images
- `src/visualizations/map/MapElement.ts` — add optional `countryCode` field
- `src/visualizations/map/buildMapElements.ts` — populate `countryCode` from CSV data
- `src/visualizations/VisualizationRendererProps.ts` — add `backgroundLabels` prop
- `src/quiz-definitions/quizRegistry.ts` — split flag toggles, add `modeConstraints`, add `countryCode` column mapping
- `src/quiz-definitions/QuizDefinition.ts` — add `modeConstraints` to definition type
- `src/quiz-modes/identify/IdentifyMode.tsx` — render prompt fields from toggle state + data
- `src/quiz-modes/identify/IdentifyMode.module.css` — prompt field layout
- `src/quiz-modes/ToggleDefinition.ts` — add prompt field metadata to toggle definitions
- `src/quiz-modes/TogglePanel.tsx` — disabled state + tooltip for constrained toggles
- `src/quiz-modes/TogglePanel.module.css` — disabled toggle styles
- `src/quiz-modes/QuizSetupPanel.tsx` — pass constraints to TogglePanel, enforce on mode change
- `src/quiz-modes/QuizShell.tsx` — pass mode to setup panel for constraint evaluation
- `src/quiz-modes/useToggleState.ts` — apply constraints when mode changes
- `src/routes/QuizPage.tsx` — compute and pass background labels
- `src/quiz-modes/ModeAdapter.tsx` — pass data rows and column mappings to identify mode prompt
- `public/data/capitals/world-capitals.csv` — add `code` column with ISO alpha-2 codes
- `public/data/borders/world-borders.csv` — add `code` column with ISO alpha-2 codes
- `src/visualizations/map/loadBackgroundPaths.ts` — parse `code` from border rows onto BackgroundPath

---

## Task 1: Add `'default'` element state and fix identify mode

The city dots bug: `useIdentifyQuiz` sets unanswered elements to `'hidden'`, and MapRenderer filters out hidden elements from dot rendering. Fix: use `'default'` state for unanswered elements; render dots in a neutral muted color for `'default'` state.

**Files:**
- Modify: `src/visualizations/VisualizationElement.ts:21-26` (add `'default'` to union)
- Modify: `src/quiz-modes/identify/useIdentifyQuiz.ts:71-72` (change `'hidden'` → `'default'`)
- Modify: `src/quiz-modes/identify/tests/useIdentifyQuiz.test.ts` (update expected states)
- Modify: `src/visualizations/map/MapRenderer.tsx:29-55,196-197,200` (handle `'default'` in stateColor/stateFillOpacity, don't filter out default dots, use neutral color)
- Modify: `src/visualizations/map/MapRenderer.module.css` (add `.defaultDot` style)
- Modify: `src/visualizations/tests/elementToggle.test.ts` (if any tests assume hidden state)

- [ ] **Step 1: Write tests for `'default'` state in useIdentifyQuiz**

In `src/quiz-modes/identify/tests/useIdentifyQuiz.test.ts`, find existing tests that check `elementStates` for unanswered elements and update them to expect `'default'` instead of `'hidden'`. Add a test:

```ts
it('sets unanswered elements to default state', () => {
  const { result } = renderHook(() => useIdentifyQuiz(elements));
  const states = result.current.elementStates;
  // All unanswered elements should be 'default', not 'hidden'
  for (const el of elements) {
    if (el.id !== result.current.currentElementId) {
      expect(states[el.id]).toBe('default');
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern="useIdentifyQuiz" --verbose`
Expected: FAIL — tests expect `'default'` but get `'hidden'`

- [ ] **Step 3: Add `'default'` to `ElementVisualState` and update `useIdentifyQuiz`**

In `src/visualizations/VisualizationElement.ts`, add `'default'` to the union:
```ts
export type ElementVisualState =
  | 'default'
  | 'hidden'
  | 'highlighted'
  | 'revealed'
  | 'correct'
  | 'incorrect';
```

In `src/quiz-modes/identify/useIdentifyQuiz.ts` line 72, change:
```ts
// Before
states[el.id] = 'hidden';
// After
states[el.id] = 'default';
```

- [ ] **Step 4: Update MapRenderer to handle `'default'` state**

In `src/visualizations/map/MapRenderer.tsx`:

Update `stateColor` to return a neutral muted color for `'default'`:
```ts
function stateColor(state: ElementVisualState | undefined): string | undefined {
  switch (state) {
    case 'correct':
      return 'var(--color-correct)';
    case 'incorrect':
      return 'var(--color-incorrect)';
    case 'highlighted':
      return 'var(--color-highlight)';
    case 'default':
      return 'var(--color-text-muted)';
    default:
      return undefined;
  }
}
```

Update `stateFillOpacity` to treat `'default'` like revealed (visible but muted):
```ts
case 'default':
  return 0.15;
```

In the city dots section, change the filter from `if (state === 'hidden') return null;` to allow `'default'` through. Only filter `'hidden'`:
```ts
// Line 197: keep this check — hidden elements still shouldn't render dots
if (state === 'hidden') return null;
```
This already works since we changed from 'hidden' to 'default'. The dot will now render.

For 'default' state dots, use a non-interactive class so they don't show hover effects in free recall mode (city dots non-interactable spec from feature 19). But in identify mode they must be interactive. The `element.interactive` flag already controls this — `interactive` is true for all quiz elements. The renderer already checks `element.interactive` for cursor/hover styles. So no change needed here — the existing `.interactiveDot` class handles it.

- [ ] **Step 5: Run all tests and typecheck**

Run: `npm test` and `npm run typecheck`
Expected: All pass. If any tests in other files assumed 'hidden' for identify mode elements, update them.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "fix: use 'default' element state for unanswered identify mode elements

City dots were invisible in identify mode because useIdentifyQuiz set
unanswered elements to 'hidden' and MapRenderer filtered hidden elements
from dot rendering. Now uses 'default' state which renders as a neutral
muted dot."
```

---

## Task 2: Country name labels from background border data

Render country name labels positioned at the centroid of each country's border polygon. Labels come from the border CSV's `name` column, not from quiz elements. Controlled by the existing `showCountryNames` toggle.

**Files:**
- Create: `src/visualizations/map/computePathCentroid.ts`
- Create: `src/visualizations/map/tests/computePathCentroid.test.ts`
- Create: `src/visualizations/map/BackgroundLabel.ts`
- Create: `src/visualizations/map/computeBackgroundLabels.ts`
- Create: `src/visualizations/map/tests/computeBackgroundLabels.test.ts`
- Modify: `src/visualizations/VisualizationRendererProps.ts` — add `backgroundLabels` prop
- Modify: `src/visualizations/map/MapRenderer.tsx` — render background labels
- Modify: `src/visualizations/map/MapRenderer.module.css` — background label styles
- Modify: `src/routes/QuizPage.tsx` — compute and pass background labels
- Modify: `src/visualizations/map/loadBackgroundPaths.ts` — extract name data from border rows

### Sub-task 2a: Centroid computation

- [ ] **Step 1: Write tests for `computePathCentroid`**

Create `src/visualizations/map/tests/computePathCentroid.test.ts`:

```ts
import { computePathCentroid } from '../computePathCentroid';

describe('computePathCentroid', () => {
  it('computes centroid of a simple square path', () => {
    // Square from (0,0) to (10,10)
    const d = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBeCloseTo(5, 0);
    expect(centroid.y).toBeCloseTo(5, 0);
  });

  it('computes centroid of a triangle', () => {
    const d = 'M 0 0 L 10 0 L 5 10 Z';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBeCloseTo(5, 0);
    expect(centroid.y).toBeCloseTo(3.3, 0);
  });

  it('returns bounding box center for degenerate paths', () => {
    const d = 'M 5 5';
    const centroid = computePathCentroid(d);
    expect(centroid.x).toBe(5);
    expect(centroid.y).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --testPathPattern="computePathCentroid" --verbose`

- [ ] **Step 3: Implement `computePathCentroid`**

Create `src/visualizations/map/computePathCentroid.ts`:

```ts
import type { ViewBoxPosition } from '../VisualizationElement';

/**
 * Compute the centroid (center of mass) of an SVG path.
 * Parses M/L/Z commands, computes the polygon centroid using the
 * shoelace formula. Falls back to bounding box center for degenerate paths.
 */
export function computePathCentroid(d: string): ViewBoxPosition {
  const points = parsePathPoints(d);
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length < 3) return boundingBoxCenter(points);

  const centroid = polygonCentroid(points);
  // If centroid computation fails (zero area), fall back to bbox center
  if (!Number.isFinite(centroid.x) || !Number.isFinite(centroid.y)) {
    return boundingBoxCenter(points);
  }
  return centroid;
}

function parsePathPoints(d: string): ReadonlyArray<ViewBoxPosition> {
  const points: ViewBoxPosition[] = [];
  const regex = /([MLZ])\s*([-\d.]+)?\s*([-\d.]+)?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1].toUpperCase();
    if ((cmd === 'M' || cmd === 'L') && match[2] && match[3]) {
      points.push({ x: parseFloat(match[2]), y: parseFloat(match[3]) });
    }
  }
  return points;
}

function polygonCentroid(points: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = points[i].x * points[j].y - points[j].x * points[i].y;
    area += cross;
    cx += (points[i].x + points[j].x) * cross;
    cy += (points[i].y + points[j].y) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) return boundingBoxCenter(points);
  cx /= (6 * area);
  cy /= (6 * area);
  return { x: cx, y: cy };
}

function boundingBoxCenter(points: ReadonlyArray<ViewBoxPosition>): ViewBoxPosition {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --testPathPattern="computePathCentroid" --verbose` then `npm run typecheck`

- [ ] **Step 5: Commit**

```
git add src/visualizations/map/computePathCentroid.ts src/visualizations/map/tests/computePathCentroid.test.ts
git commit -m "feat: add computePathCentroid for SVG path centroid calculation"
```

### Sub-task 2b: Background labels interface and computation

- [ ] **Step 6: Create `BackgroundLabel` interface**

Create `src/visualizations/map/BackgroundLabel.ts`:

```ts
import type { ViewBoxPosition } from '../VisualizationElement';

/** A label positioned at a background shape's centroid (e.g., country name). */
export interface BackgroundLabel {
  readonly id: string;
  readonly name: string;
  readonly center: ViewBoxPosition;
}
```

- [ ] **Step 7: Write tests for `computeBackgroundLabels`**

Create `src/visualizations/map/tests/computeBackgroundLabels.test.ts`:

```ts
import type { BackgroundPath } from '../../VisualizationRendererProps';
import { computeBackgroundLabels } from '../computeBackgroundLabels';

const squarePath = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';

describe('computeBackgroundLabels', () => {
  it('computes one label per unique group', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'fr-0', svgPathData: squarePath, group: 'France' },
      { id: 'fr-1', svgPathData: 'M 20 0 L 30 0 L 30 10 L 20 10 Z', group: 'France' },
      { id: 'de', svgPathData: 'M 40 0 L 50 0 L 50 10 L 40 10 Z', group: 'Germany' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(2);
    expect(labels.map(l => l.name)).toContain('France');
    expect(labels.map(l => l.name)).toContain('Germany');
  });

  it('picks the largest path segment for multi-path countries', () => {
    const smallSquare = 'M 0 0 L 2 0 L 2 2 L 0 2 Z';
    const bigSquare = 'M 10 10 L 30 10 L 30 30 L 10 30 Z';
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'fr-0', svgPathData: smallSquare, group: 'France' },
      { id: 'fr-1', svgPathData: bigSquare, group: 'France' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(1);
    // Label should be at the centroid of the big square (20, 20), not the small one
    expect(labels[0].center.x).toBeCloseTo(20, 0);
    expect(labels[0].center.y).toBeCloseTo(20, 0);
  });

  it('skips paths without a group', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'unknown', svgPathData: squarePath },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(0);
  });
});
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `npm test -- --testPathPattern="computeBackgroundLabels" --verbose`

- [ ] **Step 9: Implement `computeBackgroundLabels`**

Create `src/visualizations/map/computeBackgroundLabels.ts`:

```ts
import type { BackgroundPath } from '../VisualizationRendererProps';
import type { BackgroundLabel } from './BackgroundLabel';
import { computePathCentroid } from './computePathCentroid';

/**
 * Derive one label per unique country/group from background paths.
 * For multi-path countries (e.g., France mainland + Corsica), uses the
 * largest path segment's centroid for label placement.
 */
export function computeBackgroundLabels(
  paths: ReadonlyArray<BackgroundPath>,
): ReadonlyArray<BackgroundLabel> {
  // Group paths by their group (country name)
  const byGroup = new Map<string, BackgroundPath[]>();
  for (const path of paths) {
    if (!path.group) continue;
    const existing = byGroup.get(path.group);
    if (existing) {
      existing.push(path);
    } else {
      byGroup.set(path.group, [path]);
    }
  }

  const labels: BackgroundLabel[] = [];
  for (const [group, groupPaths] of byGroup) {
    // Find the largest path segment (most points ≈ largest area)
    const largest = groupPaths.reduce((best, current) =>
      current.svgPathData.length > best.svgPathData.length ? current : best,
    );
    labels.push({
      id: group,
      name: group,
      center: computePathCentroid(largest.svgPathData),
    });
  }

  return labels;
}
```

- [ ] **Step 10: Run tests and typecheck**

Run: `npm test -- --testPathPattern="computeBackgroundLabels" --verbose` then `npm run typecheck`

- [ ] **Step 11: Commit**

```
git add src/visualizations/map/BackgroundLabel.ts src/visualizations/map/computeBackgroundLabels.ts src/visualizations/map/tests/computeBackgroundLabels.test.ts
git commit -m "feat: compute background labels from border path centroids"
```

### Sub-task 2c: Wire background labels into MapRenderer

- [ ] **Step 12: Add `backgroundLabels` to `VisualizationRendererProps`**

In `src/visualizations/VisualizationRendererProps.ts`, import `BackgroundLabel` and add to the props:

```ts
import type { BackgroundLabel } from './map/BackgroundLabel';

// Add to VisualizationRendererProps interface:
/** Labels positioned at background shape centroids (e.g., country names) */
readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
```

- [ ] **Step 13: Render background labels in MapRenderer**

In `src/visualizations/map/MapRenderer.tsx`:

Add `backgroundLabels` to the destructured props in both `MapRenderer` and `MapContent` (add to `MapContentProps` interface too).

Replace the existing `{/* Labels */}` section (which renders element labels) with background labels. The existing section that uses `showCountryNames` on elements should be replaced:

```tsx
{/* Country name labels (from background border data) */}
{toggles['showCountryNames'] && backgroundLabels?.map((label) => (
  <text
    key={`bg-label-${label.id}`}
    x={label.center.x}
    y={label.center.y}
    className={styles.backgroundLabel}
    textAnchor="middle"
    dominantBaseline="central"
  >
    {label.name}
  </text>
))}
```

Remove the old element-based labels section entirely (the one that iterated over `elements` checking `showCountryNames`).

Add to `MapRenderer.module.css`:
```css
.backgroundLabel {
  fill: var(--color-text-secondary);
  font-family: var(--font-family);
  font-size: 0.45px;
  font-weight: 500;
  pointer-events: none;
  user-select: none;
  opacity: 0.8;
}
```

- [ ] **Step 14: Compute and pass background labels in QuizPage**

In `src/routes/QuizPage.tsx`, import `computeBackgroundLabels` and compute labels from the background paths:

```ts
import { computeBackgroundLabels } from '@/visualizations/map/computeBackgroundLabels';

// Inside QuizPageLoaded, after backgroundPaths is available:
const backgroundLabels = useMemo(
  () => backgroundPaths ? computeBackgroundLabels(backgroundPaths) : undefined,
  [backgroundPaths],
);
```

Pass `backgroundLabels` to `ActiveQuiz`. This means adding it to `ActiveQuizProps`, `ModeAdapterProps`, and threading it through to the `Renderer` component. Each adapter passes it as a prop to `<Renderer>`.

Update the call chain:
1. `QuizPageLoaded` → `ActiveQuiz` (add `backgroundLabels` prop)
2. `ActiveQuiz` → `ModeAdapter` (add `backgroundLabels` prop)
3. `ModeAdapter` → each adapter → `<Renderer>` (pass `backgroundLabels` prop)

- [ ] **Step 15: Run all tests and typecheck**

Run: `npm test` and `npm run typecheck`
Fix any test breakage from the new required prop by providing `backgroundLabels` as undefined in test renders.

- [ ] **Step 16: Commit**

```
git add -A
git commit -m "feat: render country name labels at border centroids on map"
```

---

## Task 3: Download SVG flags and add country codes to data

Download flat SVG flag files and add ISO alpha-2 country codes to both CSV data files.

**Files:**
- Create: `public/flags/*.svg` — ~200 SVG flag files
- Modify: `public/data/capitals/world-capitals.csv` — add `code` column
- Modify: `public/data/borders/world-borders.csv` — add `code` column
- Modify: `src/visualizations/map/MapElement.ts` — add `countryCode` field
- Modify: `src/visualizations/map/buildMapElements.ts` — populate `countryCode`
- Modify: `src/visualizations/VisualizationRendererProps.ts` — add optional `code` to `BackgroundPath`
- Modify: `src/visualizations/map/loadBackgroundPaths.ts` — parse `code` column

- [ ] **Step 1: Download SVG flags from lipis/flag-icons**

Use the lipis/flag-icons repo (MIT licensed). Download the 4x3 aspect ratio SVGs (better for map rendering). Save to `public/flags/` with lowercase alpha-2 codes as filenames (e.g., `fr.svg`, `de.svg`).

```bash
# Clone the repo temporarily, copy the SVG files, clean up
cd /tmp
git clone --depth 1 https://github.com/lipis/flag-icons.git
cp flag-icons/flags/4x3/*.svg /path/to/worktree/public/flags/
rm -rf flag-icons
```

Verify: `ls public/flags/ | head -5` should show files like `ad.svg`, `ae.svg`, `af.svg`...

- [ ] **Step 2: Add `code` column to world-capitals.csv**

Add an ISO alpha-2 country code column to `public/data/capitals/world-capitals.csv`. The header becomes: `id,city,country,latitude,longitude,region,subregion,city_alternates,code`

Each row gets the correct code (e.g., `algiers,...,dz`, `luanda,...,ao`). Use lowercase codes to match the flag file names.

Cross-check codes against an authoritative source (e.g., ISO 3166-1 list). Do NOT rely on LLM knowledge — verify each code.

- [ ] **Step 3: Add `code` column to world-borders.csv**

Add an ISO alpha-2 country code column to `public/data/borders/world-borders.csv`. The header becomes: `id,name,region,group,code,paths`

Use the same lowercase alpha-2 codes. Verify against the same source.

- [ ] **Step 4: Update MapElement and buildMapElements**

In `src/visualizations/map/MapElement.ts`, the `code` field already exists. Verify it's populated.

In `src/visualizations/map/buildMapElements.ts`, populate `code` from the CSV column:
```ts
code: row['code'] ?? row['id'],
```

If there's a `code` column mapping, use it. Add `code: 'code'` to the column mappings for capitals quizzes in the registry.

- [ ] **Step 5: Update BackgroundPath and loadBackgroundPaths**

In `src/visualizations/VisualizationRendererProps.ts`, add `code` to `BackgroundPath`:
```ts
export interface BackgroundPath {
  readonly id: string;
  readonly svgPathData: string;
  readonly group?: string;
  readonly code?: string;
}
```

In `src/visualizations/map/loadBackgroundPaths.ts`, parse the `code` column:
```ts
result.push({
  id: ...,
  svgPathData: ...,
  group: row['group'] ?? row['name'],
  code: row['code'],
});
```

Do the same in `src/quiz-definitions/parseBackgroundPaths.ts`.

- [ ] **Step 6: Add `code` to BackgroundLabel**

In `src/visualizations/map/BackgroundLabel.ts`, add:
```ts
readonly code?: string;
```

In `computeBackgroundLabels.ts`, pass through the code from the largest path:
```ts
labels.push({
  id: group,
  name: group,
  center: computePathCentroid(largest.svgPathData),
  code: largest.code,
});
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test` and `npm run typecheck`

- [ ] **Step 8: Commit**

```
git add -A
git commit -m "feat: add SVG flags and country codes to data files

Downloaded 4x3 SVG flags from lipis/flag-icons (MIT).
Added ISO alpha-2 code column to world-capitals.csv and world-borders.csv.
Updated MapElement, BackgroundPath, and BackgroundLabel to carry codes."
```

---

## Task 4: Render flags on the map

Render SVG flag images on the map near city dots (for capitals quizzes) or at country centroids (for country quizzes). Uses `<image>` SVG elements pointing to the flag SVG files. Controlled by a new `showMapFlags` toggle (split from the old `showFlags`).

**Files:**
- Modify: `src/visualizations/map/MapRenderer.tsx` — render flag `<image>` elements
- Modify: `src/visualizations/map/MapRenderer.module.css` — flag image styles
- Modify: `src/quiz-definitions/quizRegistry.ts` — split `showFlags` into `showMapFlags` and `showPromptFlags`
- Modify: `src/visualizations/map/tests/MapRenderer.test.tsx` — test flag rendering

- [ ] **Step 1: Split the `showFlags` toggle**

In `src/quiz-definitions/quizRegistry.ts`, for quizzes that have `showFlags`, replace it with two toggles:

```ts
{ key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } },
{ key: 'showPromptFlags', label: 'Flags in prompt', defaultValue: false, group: 'display', hiddenBehavior: 'never' },
```

Update presets to use the new toggle keys (`showMapFlags` and `showPromptFlags` instead of `showFlags`).

- [ ] **Step 2: Render flag images in MapRenderer**

In `src/visualizations/map/MapRenderer.tsx`, add a flag rendering section after the city dots section.

For element flags (capitals quiz — flags at city dot positions):
```tsx
{/* Flag images near city dots */}
{elements.map((element) => {
  if (clusteredElementIds.has(element.id)) return null;
  if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
  if (!isMapElement(element) || !element.code) return null;
  const state = elementStates[element.id];
  if (state === 'hidden') return null;
  const flagSize = 1.2;
  return (
    <image
      key={`flag-${element.id}`}
      href={`/flags/${element.code}.svg`}
      x={element.viewBoxCenter.x + CITY_DOT_RADIUS + 0.15}
      y={element.viewBoxCenter.y - flagSize / 2}
      width={flagSize * 4 / 3}
      height={flagSize}
      className={styles.flagImage}
    />
  );
})}

{/* Flag images at background label positions (country quizzes) */}
{toggles['showMapFlags'] && backgroundLabels?.map((label) => {
  if (!label.code) return null;
  const flagSize = 1.5;
  return (
    <image
      key={`bg-flag-${label.id}`}
      href={`/flags/${label.code}.svg`}
      x={label.center.x - (flagSize * 4 / 3) / 2}
      y={label.center.y + 0.3}
      width={flagSize * 4 / 3}
      height={flagSize}
      className={styles.flagImage}
    />
  );
})}
```

Add to `MapRenderer.module.css`:
```css
.flagImage {
  pointer-events: none;
  user-select: none;
}
```

- [ ] **Step 3: Run tests and typecheck**

Run: `npm test` and `npm run typecheck`

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "feat: render SVG flag images on the map

Flags appear near city dots (capitals) or at country centroids (countries).
Split showFlags into showMapFlags and showPromptFlags toggles."
```

---

## Task 5: Identify mode prompt fields

Make the identify mode prompt bar data-driven: show additional fields (text, flag images) based on which toggles are enabled. The prompt bar gets data from the CSV row of the current target element.

**Files:**
- Create: `src/quiz-modes/identify/IdentifyPromptFields.tsx`
- Create: `src/quiz-modes/identify/IdentifyPromptFields.module.css`
- Create: `src/quiz-modes/identify/tests/IdentifyPromptFields.test.tsx`
- Modify: `src/quiz-modes/ToggleDefinition.ts` — add `promptField` metadata
- Modify: `src/quiz-modes/identify/IdentifyMode.tsx` — render prompt fields
- Modify: `src/quiz-modes/identify/IdentifyMode.module.css` — layout
- Modify: `src/quiz-modes/ModeAdapter.tsx` — pass row data to identify mode
- Modify: `src/quiz-definitions/quizRegistry.ts` — configure prompt fields on toggles

- [ ] **Step 1: Add `promptField` to `ToggleDefinition`**

In `src/quiz-modes/ToggleDefinition.ts`, add optional prompt field metadata:

```ts
/** How to display this toggle's data in the identify mode prompt bar. */
export interface PromptFieldConfig {
  /** Type of rendering: 'text' for plain text, 'flag' for SVG flag image */
  readonly type: 'text' | 'flag';
  /** CSV column key to pull the value from. For 'flag', this is the country code column. */
  readonly column: string;
}

export interface ToggleDefinition {
  readonly key: string;
  readonly label: string;
  readonly defaultValue: boolean;
  readonly group: string;
  readonly hiddenBehavior?: HiddenBehavior;
  /** If set, this toggle adds a field to the identify mode prompt bar when enabled. */
  readonly promptField?: PromptFieldConfig;
}
```

- [ ] **Step 2: Configure prompt fields in the quiz registry**

In `src/quiz-definitions/quizRegistry.ts`, for the `showPromptFlags` toggle on capitals quizzes:

```ts
{
  key: 'showPromptFlags',
  label: 'Flags in prompt',
  defaultValue: false,
  group: 'display',
  hiddenBehavior: 'never',
  promptField: { type: 'flag', column: 'code' },
},
```

For `showCountryNames` (optional — show country name in prompt too):
```ts
{
  key: 'showCountryNames',
  label: 'Country names',
  defaultValue: false,
  group: 'display',
  hiddenBehavior: 'on-reveal',
  promptField: { type: 'text', column: 'country' },
},
```

- [ ] **Step 3: Write tests for `IdentifyPromptFields`**

Create `src/quiz-modes/identify/tests/IdentifyPromptFields.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { IdentifyPromptFields } from '../IdentifyPromptFields';

describe('IdentifyPromptFields', () => {
  it('renders nothing when no fields are active', () => {
    const { container } = render(
      <IdentifyPromptFields fields={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a text field', () => {
    render(
      <IdentifyPromptFields fields={[{ type: 'text', value: 'France' }]} />
    );
    expect(screen.getByText('France')).toBeInTheDocument();
  });

  it('renders a flag image', () => {
    render(
      <IdentifyPromptFields fields={[{ type: 'flag', value: 'fr' }]} />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/flags/fr.svg');
  });

  it('renders multiple fields', () => {
    render(
      <IdentifyPromptFields
        fields={[
          { type: 'flag', value: 'fr' },
          { type: 'text', value: 'France' },
        ]}
      />
    );
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('France')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- --testPathPattern="IdentifyPromptFields" --verbose`

- [ ] **Step 5: Implement `IdentifyPromptFields`**

Create `src/quiz-modes/identify/IdentifyPromptFields.tsx`:

```tsx
import styles from './IdentifyPromptFields.module.css';

export interface PromptField {
  readonly type: 'text' | 'flag';
  readonly value: string;
}

interface IdentifyPromptFieldsProps {
  readonly fields: ReadonlyArray<PromptField>;
}

export function IdentifyPromptFields({ fields }: IdentifyPromptFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <div className={styles.fields}>
      {fields.map((field, index) => {
        if (field.type === 'flag') {
          return (
            <img
              key={index}
              src={`/flags/${field.value}.svg`}
              alt=""
              role="img"
              className={styles.flagImage}
            />
          );
        }
        return (
          <span key={index} className={styles.textField}>
            {field.value}
          </span>
        );
      })}
    </div>
  );
}
```

Create `src/quiz-modes/identify/IdentifyPromptFields.module.css`:

```css
.fields {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.flagImage {
  height: 1.5em;
  border-radius: 2px;
  box-shadow: var(--shadow-sm);
}

.textField {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- --testPathPattern="IdentifyPromptFields" --verbose`

- [ ] **Step 7: Wire IdentifyPromptFields into IdentifyMode**

In `src/quiz-modes/identify/IdentifyMode.tsx`:

Add props for data rows and column mappings (these are already on `QuizModeProps` which `IdentifyModeProps` extends, so `dataRows` and `columnMappings` are already available).

Import the new component and `PromptFieldConfig` type. In the prompt bar, compute active prompt fields from toggle state and render them:

```tsx
import { IdentifyPromptFields, type PromptField } from './IdentifyPromptFields';

// Inside the component, compute prompt fields for the current element:
const promptFields = useMemo((): ReadonlyArray<PromptField> => {
  if (!quiz.currentElementId) return [];
  // Find the data row for the current element
  const row = dataRows.find(r => r[columnMappings['answer'] ?? 'id'] === quiz.currentElementLabel
    || r['id'] === quiz.currentElementId);
  if (!row) return [];

  const fields: PromptField[] = [];
  for (const toggleDef of toggleDefinitions) {
    if (!toggleDef.promptField) continue;
    if (!toggleValues[toggleDef.key]) continue;
    const value = row[toggleDef.promptField.column];
    if (value) {
      fields.push({ type: toggleDef.promptField.type, value });
    }
  }
  return fields;
}, [quiz.currentElementId, quiz.currentElementLabel, dataRows, columnMappings, toggleDefinitions, toggleValues]);
```

Then render in the prompt bar:
```tsx
<div className={styles.promptBar}>
  {promptFields.length > 0 && <IdentifyPromptFields fields={promptFields} />}
  <span className={styles.promptText}>
    Click on <span className={styles.promptLabel}>{quiz.currentElementLabel}</span>
  </span>
  ...
</div>
```

- [ ] **Step 8: Run all tests and typecheck**

Run: `npm test` and `npm run typecheck`

- [ ] **Step 9: Commit**

```
git add -A
git commit -m "feat: data-driven prompt fields in identify mode

Toggle definitions can specify promptField config. When a toggle is
enabled, its prompt field (text or flag image) renders in the prompt bar.
Supports 1-3 fields with compact side-by-side layout."
```

---

## Task 6: Per-mode toggle constraints

Some toggle combinations don't make sense for certain modes. The setup panel should enforce constraints: disable constrained toggles with a tooltip, and prevent turning off the last toggle in an "at least one" group.

**Files:**
- Create: `src/quiz-modes/ToggleConstraint.ts`
- Create: `src/quiz-modes/resolveToggleConstraints.ts`
- Create: `src/quiz-modes/tests/resolveToggleConstraints.test.ts`
- Modify: `src/quiz-definitions/QuizDefinition.ts` — add `modeConstraints`
- Modify: `src/quiz-definitions/quizRegistry.ts` — declare constraints
- Modify: `src/quiz-modes/TogglePanel.tsx` — disabled state + tooltips
- Modify: `src/quiz-modes/TogglePanel.module.css` — disabled styles
- Modify: `src/quiz-modes/QuizSetupPanel.tsx` — pass constraints
- Modify: `src/quiz-modes/QuizShell.tsx` — pass mode to toggle state management
- Modify: `src/quiz-modes/useToggleState.ts` — apply constraints on mode change

### Sub-task 6a: Constraint types and resolution

- [ ] **Step 1: Define constraint types**

Create `src/quiz-modes/ToggleConstraint.ts`:

```ts
/** Force a specific toggle to a fixed value in a given mode. */
export interface ForcedValueConstraint {
  readonly type: 'forced';
  readonly key: string;
  readonly forcedValue: boolean;
  readonly reason: string;
}

/** At least one of the specified toggles must be enabled. */
export interface AtLeastOneConstraint {
  readonly type: 'atLeastOne';
  readonly keys: ReadonlyArray<string>;
  readonly reason: string;
}

export type ToggleConstraint = ForcedValueConstraint | AtLeastOneConstraint;
```

- [ ] **Step 2: Write tests for `resolveToggleConstraints`**

Create `src/quiz-modes/tests/resolveToggleConstraints.test.ts`:

```ts
import type { ToggleConstraint } from '../ToggleConstraint';
import { resolveToggleConstraints } from '../resolveToggleConstraints';

describe('resolveToggleConstraints', () => {
  it('returns empty results when no constraints', () => {
    const result = resolveToggleConstraints([], { a: true });
    expect(result.forcedValues).toEqual({});
    expect(result.preventDisable).toEqual(new Set());
  });

  it('forces a toggle value', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'forced', key: 'showCityDots', forcedValue: true, reason: 'Required for identify mode' },
    ];
    const result = resolveToggleConstraints(constraints, { showCityDots: false });
    expect(result.forcedValues).toEqual({ showCityDots: true });
    expect(result.reasons).toEqual({ showCityDots: 'Required for identify mode' });
  });

  it('prevents disabling the last enabled toggle in an atLeastOne group', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need at least one hint' },
    ];
    // Only showCountryNames is on — it should be prevented from disabling
    const result = resolveToggleConstraints(constraints, { showCountryNames: true, showPromptFlags: false });
    expect(result.preventDisable).toEqual(new Set(['showCountryNames']));
    expect(result.reasons).toEqual({ showCountryNames: 'Need at least one hint' });
  });

  it('does not prevent disable when multiple toggles in group are on', () => {
    const constraints: ReadonlyArray<ToggleConstraint> = [
      { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'Need at least one hint' },
    ];
    const result = resolveToggleConstraints(constraints, { showCountryNames: true, showPromptFlags: true });
    expect(result.preventDisable).toEqual(new Set());
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- --testPathPattern="resolveToggleConstraints" --verbose`

- [ ] **Step 4: Implement `resolveToggleConstraints`**

Create `src/quiz-modes/resolveToggleConstraints.ts`:

```ts
import type { ToggleConstraint } from './ToggleConstraint';

export interface ConstraintResult {
  /** Toggle keys forced to a specific value — UI should set and disable these. */
  readonly forcedValues: Readonly<Record<string, boolean>>;
  /** Toggle keys that cannot be turned off (last enabled in an atLeastOne group). */
  readonly preventDisable: ReadonlySet<string>;
  /** Tooltip text for constrained toggles. */
  readonly reasons: Readonly<Record<string, string>>;
}

export function resolveToggleConstraints(
  constraints: ReadonlyArray<ToggleConstraint>,
  currentValues: Readonly<Record<string, boolean>>,
): ConstraintResult {
  const forcedValues: Record<string, boolean> = {};
  const preventDisable = new Set<string>();
  const reasons: Record<string, string> = {};

  for (const constraint of constraints) {
    if (constraint.type === 'forced') {
      forcedValues[constraint.key] = constraint.forcedValue;
      reasons[constraint.key] = constraint.reason;
    } else if (constraint.type === 'atLeastOne') {
      const enabledKeys = constraint.keys.filter((k) => currentValues[k]);
      if (enabledKeys.length === 1) {
        preventDisable.add(enabledKeys[0]);
        reasons[enabledKeys[0]] = constraint.reason;
      }
    }
  }

  return { forcedValues, preventDisable, reasons };
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- --testPathPattern="resolveToggleConstraints" --verbose`

- [ ] **Step 6: Commit**

```
git add src/quiz-modes/ToggleConstraint.ts src/quiz-modes/resolveToggleConstraints.ts src/quiz-modes/tests/resolveToggleConstraints.test.ts
git commit -m "feat: toggle constraint types and resolution logic"
```

### Sub-task 6b: Add constraints to quiz definitions

- [ ] **Step 7: Add `modeConstraints` to `QuizDefinition`**

In `src/quiz-definitions/QuizDefinition.ts`:

```ts
import type { ToggleConstraint } from '@/quiz-modes/ToggleConstraint';

// Add to QuizDefinition interface:
/** Per-mode toggle constraints. Key is a QuizModeType string. */
readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
```

- [ ] **Step 8: Declare constraints in the registry**

In `src/quiz-definitions/quizRegistry.ts`, for `geo-capitals-europe` (and other capitals quizzes):

```ts
modeConstraints: {
  identify: [
    { type: 'forced', key: 'showCityDots', forcedValue: true, reason: 'City dots are required for clicking in identify mode' },
    { type: 'atLeastOne', keys: ['showCountryNames', 'showPromptFlags'], reason: 'At least one hint must be enabled in identify mode' },
  ],
},
```

- [ ] **Step 9: Commit**

```
git add src/quiz-definitions/QuizDefinition.ts src/quiz-definitions/quizRegistry.ts
git commit -m "feat: declare per-mode toggle constraints in quiz definitions"
```

### Sub-task 6c: Enforce constraints in the setup panel UI

- [ ] **Step 10: Update TogglePanel to support disabled toggles with tooltips**

In `src/quiz-modes/TogglePanel.tsx`, add new props:

```tsx
interface TogglePanelProps {
  readonly toggles: ReadonlyArray<ToggleDefinition>;
  readonly presets: ReadonlyArray<TogglePreset>;
  readonly values: Readonly<Record<string, boolean>>;
  readonly activePreset: string | undefined;
  readonly onChange: (key: string, value: boolean) => void;
  readonly onPreset: (preset: TogglePreset) => void;
  /** Toggle keys that are forced and cannot be changed by the user. */
  readonly disabledKeys?: ReadonlySet<string>;
  /** Tooltip text for disabled/constrained toggles. */
  readonly tooltips?: Readonly<Record<string, string>>;
}
```

In the toggle row rendering, check if the toggle is disabled:

```tsx
{items.map((toggle) => {
  const isDisabled = disabledKeys?.has(toggle.key) ?? false;
  const tooltip = tooltips?.[toggle.key];
  return (
    <div
      key={toggle.key}
      className={`${styles.toggleRow} ${isDisabled ? styles.toggleRowDisabled : ''}`}
      onClick={() => {
        if (!isDisabled) {
          onChange(toggle.key, !(values[toggle.key] ?? toggle.defaultValue));
        }
      }}
      title={tooltip}
    >
      <span className={`${styles.toggleLabel} ${isDisabled ? styles.toggleLabelDisabled : ''}`}>
        {toggle.label}
      </span>
      <ToggleSwitch
        checked={values[toggle.key] ?? toggle.defaultValue}
        onToggle={(checked) => {
          if (!isDisabled) onChange(toggle.key, checked);
        }}
        disabled={isDisabled}
      />
    </div>
  );
})}
```

Update `ToggleSwitch` to accept a `disabled` prop and add appropriate styling:

```tsx
function ToggleSwitch({
  checked,
  onToggle,
  disabled = false,
}: {
  readonly checked: boolean;
  readonly onToggle: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      className={styles.switch}
      data-checked={checked || undefined}
      data-disabled={disabled || undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onToggle(!checked);
      }}
      disabled={disabled}
    >
      <motion.span
        className={styles.switchThumb}
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
```

Add to `TogglePanel.module.css`:

```css
.toggleRowDisabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.toggleLabelDisabled {
  color: var(--color-text-muted);
}

.switch[data-disabled] {
  cursor: not-allowed;
  opacity: 0.6;
}
```

- [ ] **Step 11: Wire constraints through QuizSetupPanel → TogglePanel**

In `src/quiz-modes/QuizSetupPanel.tsx`:

Import and use `resolveToggleConstraints`:

```tsx
import type { ToggleConstraint } from './ToggleConstraint';
import { resolveToggleConstraints } from './resolveToggleConstraints';

// Add to QuizSetupPanelProps:
readonly modeConstraints?: Readonly<Record<string, ReadonlyArray<ToggleConstraint>>>;
```

Inside the component, compute constraint results:

```tsx
const activeConstraints = modeConstraints?.[selectedMode] ?? [];
const constraintResult = resolveToggleConstraints(activeConstraints, toggleValues);

// Merge forced values + prevent-disable into a single disabled set
const disabledKeys = new Set([
  ...Object.keys(constraintResult.forcedValues),
  ...constraintResult.preventDisable,
]);
```

Pass to `TogglePanel`:

```tsx
<TogglePanel
  toggles={toggles}
  presets={presets}
  values={toggleValues}
  activePreset={activePreset}
  onChange={onToggleChange}
  onPreset={onPreset}
  disabledKeys={disabledKeys}
  tooltips={constraintResult.reasons}
/>
```

- [ ] **Step 12: Apply forced values when mode changes**

In `src/quiz-modes/useToggleState.ts`, add constraint awareness. When mode changes, forced-value constraints should be applied to the toggle state.

In `src/quiz-modes/QuizShell.tsx`, when mode changes, apply any forced values from the new mode's constraints:

```tsx
const handleModeChange = useCallback((newMode: QuizModeType) => {
  setSelectedMode(newMode);
  // Apply forced toggle values for the new mode
  const constraints = definition.modeConstraints?.[newMode] ?? [];
  for (const constraint of constraints) {
    if (constraint.type === 'forced') {
      toggleState.set(constraint.key, constraint.forcedValue);
    }
  }
}, [definition.modeConstraints, toggleState]);
```

This requires passing `modeConstraints` through from `QuizShell` props. Add it to `QuizShellProps`.

- [ ] **Step 13: Run all tests and typecheck**

Run: `npm test` and `npm run typecheck`
Fix any test breakage from the new props (provide `modeConstraints` as undefined in tests).

- [ ] **Step 14: Commit**

```
git add -A
git commit -m "feat: per-mode toggle constraints with disabled UI and tooltips

Setup panel enforces toggle constraints per mode:
- Forced-value constraints disable the toggle and set its value
- AtLeastOne constraints prevent disabling the last enabled toggle
- Tooltips explain why toggles are constrained"
```

---

## Task 7: Integration testing and visual verification

Run the full quiz flow end-to-end. Verify all features work together.

- [ ] **Step 1: Run full test suite**

```bash
npm run typecheck
npm test
npm run build
```

All must pass.

- [ ] **Step 2: Visual testing in browser**

Open the dev server. Navigate to European Capitals quiz. Verify:

1. **Identify mode**: City dots are visible and clickable. Prompt bar shows flag and/or country name when toggles are on. Constrained toggles (city dots) are disabled in setup panel.
2. **Free recall mode**: Country name labels appear at country centroids when toggle is on. Flag images appear on map when toggle is on.
3. **Toggle constraints**: Switching to identify mode forces city dots on. Can't turn off both country names and prompt flags in identify mode.
4. **Dark mode**: All new elements look correct in dark mode.

- [ ] **Step 3: Take screenshots**

Capture screenshots showing:
1. Identify mode with dots visible and prompt flags
2. Free recall mode with country names and map flags
3. Setup panel showing disabled/constrained toggles
4. Dark mode variants

- [ ] **Step 4: Final commit if any fixes were needed**

```
git add -A
git commit -m "fix: visual polish from integration testing"
```
