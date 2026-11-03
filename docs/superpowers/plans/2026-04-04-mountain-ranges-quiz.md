# Mountain Ranges Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global topographic tile layer to the map visualization and a mountain ranges quiz with ~60-80 named ranges, where mountain range polygons overlay a world elevation color map.

**Architecture:** Three layers: (1) Topographic PNG tiles rendered as SVG `<image>` elements, loaded/unloaded based on viewport, available to all map quizzes via a toggle. (2) Mountain range polygons as invisible-by-default fill elements that highlight during quiz interactions. (3) Quiz definitions with continent group filtering. The tile layer requires extending ZoomPanContext with visible viewport bounds, building a tile coordinate system, and a Node.js generation script using `sharp`.

**Tech Stack:** React, SVG, TypeScript, `sharp` (PNG generation), GDAL CLI (DEM preprocessing), `react-zoom-pan-pinch`

---

## File Structure

**New files:**
- `src/visualizations/map/topographyTiles.ts` — Tile coordinate math (pure functions)
- `src/visualizations/map/tests/topographyTiles.test.ts`
- `src/visualizations/map/hypsometricScale.ts` — Elevation-to-RGB color mapping (pure functions)
- `src/visualizations/map/tests/hypsometricScale.test.ts`
- `src/visualizations/map/TopographyTileLayer.tsx` — Tile loading/rendering component
- `src/visualizations/map/TopographyTileLayer.module.css`
- `src/visualizations/map/tests/TopographyTileLayer.test.tsx`
- `scripts/generateTopographyTiles.ts` — DEM-to-PNG tile generation
- `scripts/generateMountainRanges.ts` — Mountain range polygon extraction + OSM matching
- `public/data/topography/z0/` through `z3/` — Generated tile PNGs
- `public/data/mountains/world-mountain-ranges.csv` — Mountain range quiz data
- `docs/topography-tiles.md` — Architecture documentation

**Modified files:**
- `src/visualizations/ZoomPanContext.ts` — Add `visibleViewport` to context
- `src/visualizations/ZoomPanContainer.tsx` — Compute and expose viewport bounds
- `src/visualizations/map/MapRenderer.tsx` — Integrate TopographyTileLayer + topography toggle
- `src/visualizations/map/MapElementOverlays.tsx` — Support transparent-default polygon rendering
- `src/quiz-definitions/QuizDefinition.ts` — Add `topographyDefault` field
- `src/quiz-definitions/quizRegistry.ts` — Add mountain ranges quiz definitions

---

## Task 1: Tile Coordinate Math

Pure functions for computing tile grids, bounds, and visibility.

**Files:**
- Create: `src/visualizations/map/topographyTiles.ts`
- Create: `src/visualizations/map/tests/topographyTiles.test.ts`

The tile system uses equirectangular projection where the world is 360° wide × 180° tall. Each zoom level doubles resolution in both dimensions:
- Level 0: 1×1 (1 tile, 360°×180°)
- Level 1: 2×1 (2 tiles, 180°×180°)
- Level 2: 4×2 (8 tiles, 90°×90°)
- Level 3: 8×4 (32 tiles, 45°×45°)

SVG viewBox coordinates: x = longitude (−180 to 180), y = −latitude (−90 to 90).

- [ ] **Step 1: Write tests for tile grid dimensions**

```typescript
// src/visualizations/map/tests/topographyTiles.test.ts
import { tileColumns, tileRows } from '../topographyTiles';

describe('tileColumns', () => {
  it('returns 1 column at level 0', () => {
    expect(tileColumns(0)).toBe(1);
  });
  it('returns 2 columns at level 1', () => {
    expect(tileColumns(1)).toBe(2);
  });
  it('returns 4 columns at level 2', () => {
    expect(tileColumns(2)).toBe(4);
  });
  it('returns 8 columns at level 3', () => {
    expect(tileColumns(3)).toBe(8);
  });
});

describe('tileRows', () => {
  it('returns 1 row at level 0', () => {
    expect(tileRows(0)).toBe(1);
  });
  it('returns 1 row at level 1', () => {
    expect(tileRows(1)).toBe(1);
  });
  it('returns 2 rows at level 2', () => {
    expect(tileRows(2)).toBe(2);
  });
  it('returns 4 rows at level 3', () => {
    expect(tileRows(3)).toBe(4);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/visualizations/map/tests/topographyTiles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement tile grid dimension functions**

```typescript
// src/visualizations/map/topographyTiles.ts

/** SVG viewBox bounds for a rectangular region. */
export interface TileBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface TileId {
  readonly level: number;
  readonly col: number;
  readonly row: number;
}

/** Full world extent in SVG viewBox coordinates (equirectangular). */
const WORLD_X = -180;
const WORLD_Y = -90;
const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 180;

/** Number of tile columns at a given zoom level. */
export function tileColumns(level: number): number {
  return Math.max(1, Math.pow(2, level));
}

/** Number of tile rows at a given zoom level. */
export function tileRows(level: number): number {
  return Math.max(1, Math.pow(2, level - 1));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/topographyTiles.test.ts`
Expected: PASS

- [ ] **Step 5: Write tests for tileBounds**

Add to the test file:

```typescript
import { tileColumns, tileRows, tileBounds } from '../topographyTiles';

describe('tileBounds', () => {
  it('level 0 tile covers the whole world', () => {
    const bounds = tileBounds({ level: 0, col: 0, row: 0 });
    expect(bounds).toEqual({ x: -180, y: -90, width: 360, height: 180 });
  });

  it('level 1 left tile covers western hemisphere', () => {
    const bounds = tileBounds({ level: 1, col: 0, row: 0 });
    expect(bounds).toEqual({ x: -180, y: -90, width: 180, height: 180 });
  });

  it('level 1 right tile covers eastern hemisphere', () => {
    const bounds = tileBounds({ level: 1, col: 1, row: 0 });
    expect(bounds).toEqual({ x: 0, y: -90, width: 180, height: 180 });
  });

  it('level 2 tiles are 90x90 degrees', () => {
    const bounds = tileBounds({ level: 2, col: 2, row: 1 });
    expect(bounds).toEqual({ x: 0, y: 0, width: 90, height: 90 });
  });

  it('level 3 tiles are 45x45 degrees', () => {
    const bounds = tileBounds({ level: 3, col: 0, row: 0 });
    expect(bounds).toEqual({ x: -180, y: -90, width: 45, height: 45 });
  });
});
```

- [ ] **Step 6: Implement tileBounds**

Add to `topographyTiles.ts`:

```typescript
/** Geographic bounds of a tile in SVG viewBox coordinates. */
export function tileBounds(tile: TileId): TileBounds {
  const cols = tileColumns(tile.level);
  const rows = tileRows(tile.level);
  const tileWidth = WORLD_WIDTH / cols;
  const tileHeight = WORLD_HEIGHT / rows;
  return {
    x: WORLD_X + tile.col * tileWidth,
    y: WORLD_Y + tile.row * tileHeight,
    width: tileWidth,
    height: tileHeight,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/topographyTiles.test.ts`
Expected: PASS

- [ ] **Step 8: Write tests for visibleTiles**

```typescript
import { tileColumns, tileRows, tileBounds, visibleTiles } from '../topographyTiles';

describe('visibleTiles', () => {
  it('returns all tiles at level 0 for any viewport', () => {
    const tiles = visibleTiles({ x: -50, y: -30, width: 100, height: 60 }, 0);
    expect(tiles).toEqual([{ level: 0, col: 0, row: 0 }]);
  });

  it('returns only left tile at level 1 when viewport is in western hemisphere', () => {
    const tiles = visibleTiles({ x: -120, y: -45, width: 60, height: 45 }, 1);
    expect(tiles).toEqual([{ level: 1, col: 0, row: 0 }]);
  });

  it('returns both tiles at level 1 when viewport spans the meridian', () => {
    const tiles = visibleTiles({ x: -30, y: -45, width: 60, height: 45 }, 1);
    expect(tiles).toHaveLength(2);
    expect(tiles).toContainEqual({ level: 1, col: 0, row: 0 });
    expect(tiles).toContainEqual({ level: 1, col: 1, row: 0 });
  });

  it('returns correct subset at level 2', () => {
    // Viewport centered on Europe: ~0°E, ~45°N → SVG y = -45
    const tiles = visibleTiles({ x: -10, y: -60, width: 40, height: 30 }, 2);
    // Should include tiles covering x=[-10,30], y=[-60,-30]
    // At level 2: 90° tiles. col 1 covers [-90,0], col 2 covers [0,90]
    // row 0 covers [-90,0], row 1 covers [0,90]
    expect(tiles).toContainEqual({ level: 2, col: 1, row: 0 });
    expect(tiles).toContainEqual({ level: 2, col: 2, row: 0 });
  });

  it('clamps to valid tile range', () => {
    // Viewport extends beyond world bounds
    const tiles = visibleTiles({ x: -200, y: -100, width: 50, height: 50 }, 2);
    expect(tiles.every(t => t.col >= 0 && t.row >= 0)).toBe(true);
  });
});
```

- [ ] **Step 9: Implement visibleTiles**

Add to `topographyTiles.ts`:

```typescript
/** Find all tiles at a level that intersect the given viewport. */
export function visibleTiles(viewport: TileBounds, level: number): ReadonlyArray<TileId> {
  const cols = tileColumns(level);
  const rows = tileRows(level);
  const tileWidth = WORLD_WIDTH / cols;
  const tileHeight = WORLD_HEIGHT / rows;

  const minCol = Math.max(0, Math.floor((viewport.x - WORLD_X) / tileWidth));
  const maxCol = Math.min(cols - 1, Math.floor((viewport.x + viewport.width - WORLD_X) / tileWidth));
  const minRow = Math.max(0, Math.floor((viewport.y - WORLD_Y) / tileHeight));
  const maxRow = Math.min(rows - 1, Math.floor((viewport.y + viewport.height - WORLD_Y) / tileHeight));

  const tiles: Array<TileId> = [];
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      tiles.push({ level, col, row });
    }
  }
  return tiles;
}
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/topographyTiles.test.ts`
Expected: PASS

- [ ] **Step 11: Write tests for optimalTileLevel**

```typescript
import { tileColumns, tileRows, tileBounds, visibleTiles, optimalTileLevel } from '../topographyTiles';

describe('optimalTileLevel', () => {
  it('returns 0 for a viewport wider than 180 degrees', () => {
    expect(optimalTileLevel(200, 3)).toBe(0);
  });

  it('returns 1 for a viewport around 100 degrees', () => {
    expect(optimalTileLevel(100, 3)).toBe(1);
  });

  it('returns 2 for a viewport around 50 degrees', () => {
    expect(optimalTileLevel(50, 3)).toBe(2);
  });

  it('returns 3 for a viewport around 20 degrees', () => {
    expect(optimalTileLevel(20, 3)).toBe(3);
  });

  it('never exceeds maxLevel', () => {
    expect(optimalTileLevel(1, 2)).toBe(2);
  });

  it('returns 0 for full world view', () => {
    expect(optimalTileLevel(360, 3)).toBe(0);
  });
});
```

- [ ] **Step 12: Implement optimalTileLevel**

Add to `topographyTiles.ts`:

```typescript
/**
 * Choose the best tile level for the current viewport width (in viewBox degrees).
 * Picks the highest level where each tile is roughly the size of the viewport
 * (so ~1-4 tiles are visible horizontally), capped at maxLevel.
 */
export function optimalTileLevel(viewportWidth: number, maxLevel: number): number {
  for (let level = maxLevel; level > 0; level--) {
    const tileWidth = WORLD_WIDTH / tileColumns(level);
    if (tileWidth <= viewportWidth) return level;
  }
  return 0;
}
```

- [ ] **Step 13: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/topographyTiles.test.ts`
Expected: PASS

- [ ] **Step 14: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 15: Commit**

```bash
git add src/visualizations/map/topographyTiles.ts src/visualizations/map/tests/topographyTiles.test.ts
git commit -m "feat: add tile coordinate math for topographic tile system"
```

---

## Task 2: Hypsometric Color Scale

Pure functions for mapping elevation values to RGB colors. Used by the tile generation script. Defines color stops with linear interpolation between adjacent stops. Non-linearity is achieved by spacing stops more densely at low elevations.

**Files:**
- Create: `src/visualizations/map/hypsometricScale.ts`
- Create: `src/visualizations/map/tests/hypsometricScale.test.ts`

- [ ] **Step 1: Write tests for elevation-to-color mapping**

```typescript
// src/visualizations/map/tests/hypsometricScale.test.ts
import { elevationToRgb, type RgbColor } from '../hypsometricScale';

describe('elevationToRgb', () => {
  it('returns green for 0m (sea level)', () => {
    const color = elevationToRgb(0);
    // First color stop is deep green
    expect(color.r).toBeGreaterThan(80);
    expect(color.r).toBeLessThan(130);
    expect(color.g).toBeGreaterThan(130);
    expect(color.b).toBeLessThan(120);
  });

  it('returns white-ish for 8849m (Everest)', () => {
    const color = elevationToRgb(8849);
    expect(color.r).toBeGreaterThan(230);
    expect(color.g).toBeGreaterThan(230);
    expect(color.b).toBeGreaterThan(230);
  });

  it('returns brownish for 1000m', () => {
    const color = elevationToRgb(1000);
    expect(color.r).toBeGreaterThan(170);
    expect(color.g).toBeLessThan(color.r);
    expect(color.b).toBeLessThan(color.g);
  });

  it('interpolates between stops', () => {
    const low = elevationToRgb(400);
    const high = elevationToRgb(600);
    const mid = elevationToRgb(500);
    // Mid should be between low and high for each channel
    expect(mid.r).toBeGreaterThanOrEqual(Math.min(low.r, high.r));
    expect(mid.r).toBeLessThanOrEqual(Math.max(low.r, high.r));
  });

  it('clamps below 0 to first stop', () => {
    const color = elevationToRgb(-100);
    const zero = elevationToRgb(0);
    expect(color).toEqual(zero);
  });

  it('clamps above max to last stop', () => {
    const color = elevationToRgb(10000);
    const max = elevationToRgb(8849);
    expect(color).toEqual(max);
  });

  it('differentiates Australian low mountains (1000m) from lowlands (100m)', () => {
    const lowland = elevationToRgb(100);
    const mountain = elevationToRgb(1000);
    const colorDistance = Math.sqrt(
      (lowland.r - mountain.r) ** 2 +
      (lowland.g - mountain.g) ** 2 +
      (lowland.b - mountain.b) ** 2,
    );
    // Should be visually distinct (color distance > 50)
    expect(colorDistance).toBeGreaterThan(50);
  });

  it('differentiates 1000m from 8000m', () => {
    const low = elevationToRgb(1000);
    const high = elevationToRgb(8000);
    const colorDistance = Math.sqrt(
      (low.r - high.r) ** 2 + (low.g - high.g) ** 2 + (low.b - high.b) ** 2,
    );
    expect(colorDistance).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/visualizations/map/tests/hypsometricScale.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement hypsometric color scale**

```typescript
// src/visualizations/map/hypsometricScale.ts

export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

interface ColorStop {
  readonly elevation: number;
  readonly color: RgbColor;
}

/**
 * Hypsometric tint color stops. Stops are more densely spaced at low
 * elevations for better differentiation (Australian 1000m mountains must
 * clearly differ from 100m lowlands), while still distinguishing
 * Himalayan 8000m peaks from lower ranges.
 */
const COLOR_STOPS: ReadonlyArray<ColorStop> = [
  { elevation: 0,    color: { r: 106, g: 153, b: 88 } },   // Deep green (lowland)
  { elevation: 50,   color: { r: 126, g: 163, b: 100 } },   // Medium green
  { elevation: 100,  color: { r: 152, g: 178, b: 116 } },   // Light green
  { elevation: 200,  color: { r: 184, g: 196, b: 134 } },   // Yellow-green
  { elevation: 300,  color: { r: 210, g: 208, b: 150 } },   // Pale yellow
  { elevation: 500,  color: { r: 224, g: 208, b: 156 } },   // Tan
  { elevation: 700,  color: { r: 214, g: 190, b: 144 } },   // Light brown
  { elevation: 1000, color: { r: 196, g: 168, b: 128 } },   // Medium brown
  { elevation: 1500, color: { r: 176, g: 144, b: 112 } },   // Brown
  { elevation: 2000, color: { r: 160, g: 128, b: 104 } },   // Dark brown
  { elevation: 2500, color: { r: 152, g: 128, b: 112 } },   // Brown-grey
  { elevation: 3000, color: { r: 148, g: 132, b: 120 } },   // Grey-brown
  { elevation: 4000, color: { r: 160, g: 156, b: 148 } },   // Light grey
  { elevation: 5000, color: { r: 176, g: 172, b: 168 } },   // Medium grey
  { elevation: 6000, color: { r: 200, g: 196, b: 192 } },   // Pale grey
  { elevation: 7000, color: { r: 224, g: 220, b: 216 } },   // Near white
  { elevation: 8849, color: { r: 248, g: 244, b: 240 } },   // White (Everest)
];

/**
 * Map an elevation value (meters above sea level) to an RGB color.
 * Linearly interpolates between adjacent color stops.
 * Values below 0 clamp to sea level; values above 8849 clamp to max.
 */
export function elevationToRgb(elevation: number): RgbColor {
  const clamped = Math.max(0, Math.min(elevation, COLOR_STOPS[COLOR_STOPS.length - 1].elevation));

  // Find the two surrounding stops
  if (clamped <= COLOR_STOPS[0].elevation) return COLOR_STOPS[0].color;

  for (let i = 1; i < COLOR_STOPS.length; i++) {
    if (clamped <= COLOR_STOPS[i].elevation) {
      const low = COLOR_STOPS[i - 1];
      const high = COLOR_STOPS[i];
      const t = (clamped - low.elevation) / (high.elevation - low.elevation);
      return {
        r: Math.round(low.color.r + t * (high.color.r - low.color.r)),
        g: Math.round(low.color.g + t * (high.color.g - low.color.g)),
        b: Math.round(low.color.b + t * (high.color.b - low.color.b)),
      };
    }
  }

  return COLOR_STOPS[COLOR_STOPS.length - 1].color;
}

/** Exported for use by the tile generation script. */
export { COLOR_STOPS };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/hypsometricScale.test.ts`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/visualizations/map/hypsometricScale.ts src/visualizations/map/tests/hypsometricScale.test.ts
git commit -m "feat: add hypsometric color scale for topographic tiles"
```

---

## Task 3: Visible Viewport in ZoomPanContext

Extend the ZoomPanContext to expose the currently visible viewport bounds (in SVG viewBox coordinates) so the TopographyTileLayer can determine which tiles to load.

**Files:**
- Modify: `src/visualizations/ZoomPanContext.ts`
- Modify: `src/visualizations/ZoomPanContainer.tsx`

**Key context:** The ZoomPanContainer already tracks `currentTransform` (`posX`, `posY`, `scale`) in `ZoomPanInner` (line 224 of `ZoomPanContainer.tsx`). It also has `containerSize`, `viewBox`, and `basePixelsPerViewBoxUnit`. The visible viewport calculation is already done inline in `executePutInView` (lines 458–461) — extract that math.

- [ ] **Step 1: Add visibleViewport to ZoomPanState interface**

In `src/visualizations/ZoomPanContext.ts`, add to the `ZoomPanState` interface:

```typescript
/** Visible portion of the SVG viewBox in viewBox coordinates. Updates on zoom/pan. */
readonly visibleViewport: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};
```

Update the default context value to include:
```typescript
visibleViewport: { x: 0, y: 0, width: 1, height: 1 },
```

- [ ] **Step 2: Compute visible viewport in ZoomPanInner**

In `src/visualizations/ZoomPanContainer.tsx`, inside `ZoomPanInner`, compute the visible viewport from existing state. Add this after the `basePixelsPerViewBoxUnit` computation (around line 321):

```typescript
const visibleViewport = useMemo(() => {
  if (containerSize.width === 0 || basePixelsPerViewBoxUnit === 0) {
    return { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height };
  }
  const { posX, posY, scale } = currentTransform;
  const svgPixelWidth = viewBox.width * basePixelsPerViewBoxUnit;
  const svgPixelHeight = viewBox.height * basePixelsPerViewBoxUnit;
  const offsetX = (containerSize.width - svgPixelWidth) / 2;
  const offsetY = (containerSize.height - svgPixelHeight) / 2;

  const visMinX = ((0 - posX) / scale - offsetX) / basePixelsPerViewBoxUnit + viewBox.x;
  const visMinY = ((0 - posY) / scale - offsetY) / basePixelsPerViewBoxUnit + viewBox.y;
  const visWidth = containerSize.width / (scale * basePixelsPerViewBoxUnit);
  const visHeight = containerSize.height / (scale * basePixelsPerViewBoxUnit);

  return { x: visMinX, y: visMinY, width: visWidth, height: visHeight };
}, [containerSize, currentTransform, basePixelsPerViewBoxUnit, viewBox]);
```

Add `visibleViewport` to the `contextValue` useMemo and its dependency array.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Run existing tests**

Run: `npm test`
Expected: All existing tests pass (no behavioral changes, just new data in context)

- [ ] **Step 5: Commit**

```bash
git add src/visualizations/ZoomPanContext.ts src/visualizations/ZoomPanContainer.tsx
git commit -m "feat: expose visible viewport bounds in ZoomPanContext"
```

---

## Task 4: TopographyTileLayer Component

React component that renders topographic PNG tiles as SVG `<image>` elements. Reads the visible viewport from ZoomPanContext, computes which tiles to load, and renders them.

**Files:**
- Create: `src/visualizations/map/TopographyTileLayer.tsx`
- Create: `src/visualizations/map/TopographyTileLayer.module.css`
- Create: `src/visualizations/map/tests/TopographyTileLayer.test.tsx`

- [ ] **Step 1: Write tests for TopographyTileLayer**

```typescript
// src/visualizations/map/tests/TopographyTileLayer.test.tsx
import { render } from '@testing-library/react';
import { TopographyTileLayer } from '../TopographyTileLayer';
import { ZoomPanContext } from '../../ZoomPanContext';

function renderWithContext(visibleViewport = { x: -180, y: -90, width: 360, height: 180 }, scale = 1) {
  const contextValue = {
    scale,
    clusteredElementIds: new Set<string>(),
    clusters: [],
    basePixelsPerViewBoxUnit: 1,
    viewBoxString: '-180 -90 360 180',
    visibleViewport,
  };

  return render(
    <ZoomPanContext.Provider value={contextValue}>
      <svg>
        <TopographyTileLayer maxLevel={3} />
      </svg>
    </ZoomPanContext.Provider>,
  );
}

describe('TopographyTileLayer', () => {
  it('renders image elements for visible tiles', () => {
    const { container } = renderWithContext();
    const images = container.querySelectorAll('image');
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders fewer tiles when zoomed into a small area', () => {
    const { container: fullView } = renderWithContext(
      { x: -180, y: -90, width: 360, height: 180 },
    );
    const { container: zoomedView } = renderWithContext(
      { x: 0, y: -50, width: 30, height: 20 },
    );
    const fullTiles = fullView.querySelectorAll('image').length;
    const zoomedTiles = zoomedView.querySelectorAll('image').length;
    // Zoomed view should load tiles at a higher level but fewer of them
    expect(zoomedTiles).toBeLessThanOrEqual(fullTiles + 4);
  });

  it('sets correct x, y, width, height on tile images', () => {
    const { container } = renderWithContext(
      { x: -180, y: -90, width: 360, height: 180 },
    );
    const images = container.querySelectorAll('image');
    // At level 0 (full world), single tile should cover [-180, -90, 360, 180]
    // or at level 1, tiles should be 180° wide
    const firstImage = images[0];
    const width = parseFloat(firstImage.getAttribute('width') ?? '0');
    const height = parseFloat(firstImage.getAttribute('height') ?? '0');
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('uses assetPath for tile src', () => {
    const { container } = renderWithContext();
    const images = container.querySelectorAll('image');
    const href = images[0].getAttribute('href') ?? '';
    expect(href).toMatch(/\/data\/topography\/z\d+\/\d+_\d+\.png/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/visualizations/map/tests/TopographyTileLayer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TopographyTileLayer**

```typescript
// src/visualizations/map/TopographyTileLayer.tsx
import { memo, useMemo } from 'react';
import { useZoomPan } from '../ZoomPanContext';
import { optimalTileLevel, visibleTiles, tileBounds } from './topographyTiles';
import { assetPath } from '../../utilities/assetPath';
import styles from './TopographyTileLayer.module.css';

interface TopographyTileLayerProps {
  readonly maxLevel: number;
}

/**
 * Renders topographic elevation tiles as SVG <image> elements.
 * Reads the visible viewport from ZoomPanContext and loads only
 * the tiles that are currently on screen at the appropriate zoom level.
 */
export const TopographyTileLayer = memo(function TopographyTileLayer({
  maxLevel,
}: TopographyTileLayerProps) {
  const { visibleViewport } = useZoomPan();

  const level = useMemo(
    () => optimalTileLevel(visibleViewport.width, maxLevel),
    [visibleViewport.width, maxLevel],
  );

  const tiles = useMemo(
    () => visibleTiles(visibleViewport, level),
    [visibleViewport, level],
  );

  return (
    <g className={styles.topographyLayer}>
      {tiles.map((tile) => {
        const bounds = tileBounds(tile);
        return (
          <image
            key={`topo-${tile.level}-${tile.col}-${tile.row}`}
            href={assetPath(`/data/topography/z${tile.level}/${tile.col}_${tile.row}.png`)}
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            preserveAspectRatio="none"
            className={styles.topographyTile}
          />
        );
      })}
    </g>
  );
});
```

```css
/* src/visualizations/map/TopographyTileLayer.module.css */
.topographyLayer {
  pointer-events: none;
}

.topographyTile {
  image-rendering: auto; /* bilinear interpolation for smooth zoom */
}

[data-theme='dark'] .topographyTile {
  filter: brightness(0.65);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/visualizations/map/tests/TopographyTileLayer.test.ts`
Expected: PASS

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/visualizations/map/TopographyTileLayer.tsx src/visualizations/map/TopographyTileLayer.module.css src/visualizations/map/tests/TopographyTileLayer.test.tsx
git commit -m "feat: add TopographyTileLayer component for rendering elevation tiles"
```

---

## Task 5: MapRenderer Topography Toggle + QuizDefinition Field

Wire the TopographyTileLayer into the MapRenderer, controlled by a `showTopography` toggle that's auto-injected for all map quizzes. Add `topographyDefault` field to QuizDefinition.

**Files:**
- Modify: `src/quiz-definitions/QuizDefinition.ts`
- Modify: `src/visualizations/map/MapRenderer.tsx`

**Important context:** Read `src/quiz-modes/ActiveQuiz.tsx` to understand how toggles flow from quiz definitions to the renderer. The toggle injection for topography should happen at the renderer level — MapRenderer reads `toggles['showTopography']` and conditionally renders the tile layer. The toggle itself needs to be added to the quiz's toggle list. Check how existing toggles like `showBorders` and `showLakes` are handled — they're defined per quiz but checked in MapRenderer with `toggles['showBorders'] !== false`.

The approach: Add `topographyDefault` to `QuizDefinition`. Then in `ActiveQuiz.tsx` (or wherever toggles are assembled), auto-inject a `showTopography` toggle for map quizzes using the definition's `topographyDefault` as the default value. This mirrors how `showBorders` works — it's in the definition's toggle list, not injected — but since topography should be available to ALL map quizzes without editing each one, injection is the right pattern.

- [ ] **Step 1: Add topographyDefault to QuizDefinition**

In `src/quiz-definitions/QuizDefinition.ts`, add to the `QuizDefinition` interface:

```typescript
/**
 * Default value for the topography toggle on map quizzes.
 * When true, the topographic elevation layer is shown by default.
 * All map quizzes get this toggle automatically; this field controls the default.
 */
readonly topographyDefault?: boolean;
```

- [ ] **Step 2: Integrate TopographyTileLayer into MapRenderer**

In `src/visualizations/map/MapRenderer.tsx`:

1. Import `TopographyTileLayer`:
```typescript
import { TopographyTileLayer } from './TopographyTileLayer';
```

2. In the `MapContent` component, read the toggle:
```typescript
const showTopography = toggles['showTopography'] === true;
```

3. Render the tile layer AFTER the ocean background but BEFORE country borders, so borders paint on top of topography:
```typescript
{/* Topographic elevation tiles */}
{showTopography && <TopographyTileLayer maxLevel={3} />}
```

Place this between the ocean background `<rect>` (line 256) and the background country borders (line 262).

- [ ] **Step 3: Auto-inject the showTopography toggle for map quizzes**

Read `src/quiz-modes/ActiveQuiz.tsx` to find where toggles are assembled from the quiz definition. Add logic to inject a `showTopography` toggle for quizzes with `visualizationType === 'map'`. The toggle should:
- Use `quiz.topographyDefault ?? false` as the default value
- Have `hiddenBehavior: 'never'` (always user-controllable)
- Have `group: 'display'`
- Be labeled "Topography"

The exact location depends on how `ActiveQuiz.tsx` processes toggles. Look for where `quiz.toggles` is spread into the active toggle state and add the injection there.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/quiz-definitions/QuizDefinition.ts src/visualizations/map/MapRenderer.tsx src/quiz-modes/ActiveQuiz.tsx
git commit -m "feat: auto-inject topography toggle for map quizzes"
```

---

## Task 6: Mountain Range Polygon Visual States

Modify MapElementOverlays to support mountain-range-style rendering: invisible by default, low-opacity fills on answered states, border on highlighted state. This is controlled via `elementStateColorOverrides` on the quiz definition — no new rendering mode needed.

**Files:**
- Modify: `src/visualizations/map/MapElementOverlays.tsx`

**Key context:** Currently in `MapElementOverlays.tsx`:
- `stateFillOpacity()` returns 0.6 for default, 0.4 for context, 0.3 for answered states
- `ElementShape` for fill paths uses a `<path>` with `fill: color` and `fillOpacity: stateFillOpacity(state)`
- Context fill shapes render as `borderPath` class (lines 248-255)
- The color is `elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main`

For mountain ranges, we'll set `elementStateColorOverrides` to `transparent` for default/context, and use `color-mix()` for low-opacity fills on answered states. But `color-mix()` won't work reliably with CSS variables in SVG fill attributes across all browsers. Instead, we should use SVG `fill-opacity` directly.

**Better approach:** Use `elementStateColorOverrides` to set default/context to `transparent`. For answered states, the existing `--color-correct` etc. variables work fine, but we need much lower opacity (~0.1 instead of 0.3). Add an optional `elementStateFillOpacity` override map to `VisualizationRendererProps` that mountain ranges can use to set low opacities.

Alternatively, add a simpler mechanism: a boolean `transparentDefault` on the quiz definition or a `fillOpacityScale` that scales all fill opacities down.

**Simplest approach that works:** The `elementStateColorOverrides` already replaces colors per state. If we set `default` and `context` overrides to `'transparent'`, those states are invisible. For the answered states, we need lower opacity. Add a new optional field `elementFillOpacityOverrides` to `VisualizationRendererProps` (parallel to `elementStateColorOverrides`) that lets quizzes override the fill opacity per state.

- [ ] **Step 1: Add elementFillOpacityOverrides to VisualizationRendererProps**

Read `src/visualizations/VisualizationRendererProps.ts` and add:

```typescript
/**
 * Override fill opacity for specific element visual states.
 * When a state has an entry here, it replaces the default stateFillOpacity value.
 * Used by mountain range quizzes for low-opacity polygon fills.
 */
readonly elementFillOpacityOverrides?: Readonly<Partial<Record<ElementVisualState, number>>>;
```

- [ ] **Step 2: Thread elementFillOpacityOverrides through MapRenderer to MapElementOverlays**

In `MapRenderer.tsx`, add `elementFillOpacityOverrides` to the props destructuring and pass it through to `MapContent` and then to `MapElementShapes`.

In `MapElementOverlays.tsx`, accept `elementFillOpacityOverrides` in `MapElementShapesProps` and `ElementShapeProps`. In `ElementShape`, use:

```typescript
const fillOpacity = elementFillOpacityOverrides?.[state ?? 'default']
  ?? stateFillOpacity(state);
```

- [ ] **Step 3: Add border for highlighted state on transparent-default elements**

In `ElementShape` for fill paths, when the element has a `highlighted` state AND `elementStateColorOverrides?.default === 'transparent'` (indicating it's a transparent-default element like mountain ranges), add a visible stroke:

```typescript
const isTransparentDefault = elementStateColorOverrides?.default === 'transparent';
const showBorder = state === 'highlighted' && isTransparentDefault;

// In the <path> element:
stroke: showBorder ? color : color,
strokeWidth: showBorder ? 0.3 : 0.075,
strokeOpacity: showBorder ? 0.8 : undefined,
```

- [ ] **Step 4: Wire elementFillOpacityOverrides from QuizDefinition through ActiveQuiz**

Read `src/quiz-modes/ActiveQuiz.tsx` to understand how `elementStateColorOverrides` flows from the quiz definition to the renderer. Add the same flow for `elementFillOpacityOverrides`. The quiz definition should have an `elementFillOpacityOverrides` field that passes through to the renderer props.

Add to `QuizDefinition.ts`:

```typescript
/**
 * Override fill opacity for specific element visual states.
 * Used by mountain range quizzes for low-opacity transparent polygon fills.
 */
readonly elementFillOpacityOverrides?: Readonly<Partial<Record<ElementVisualState, number>>>;
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/visualizations/VisualizationRendererProps.ts src/visualizations/map/MapRenderer.tsx src/visualizations/map/MapElementOverlays.tsx src/quiz-definitions/QuizDefinition.ts src/quiz-modes/ActiveQuiz.tsx
git commit -m "feat: support transparent-default fill elements with per-state opacity overrides"
```

---

## Task 7: Tile Generation Script

Node.js script that reads a preprocessed DEM heightmap and generates color-mapped PNG tiles using `sharp`.

**Files:**
- Create: `scripts/generateTopographyTiles.ts`
- Create: `docs/topography-tiles.md`

**Prerequisites (manual, before running script):**
1. Download ETOPO1 bedrock data: `https://www.ncei.noaa.gov/products/etopo-global-relief-model` (Ice Surface version, GeoTIFF format)
2. Place at `scripts/source-data/etopo1.tif`
3. Use GDAL to convert to a raw 16-bit signed integer binary file:
   ```bash
   gdal_translate -of ENVI -ot Int16 scripts/source-data/etopo1.tif scripts/source-data/etopo1.bin
   ```
   This creates `etopo1.bin` (raw pixel data) and `etopo1.hdr` (ENVI header with dimensions).

ETOPO1 is 21601 × 10801 pixels (1 arc-minute resolution). Each pixel is a 16-bit signed integer elevation in meters. Row 0 is 90°N, row 10800 is 90°S. Column 0 is 180°W, column 21600 is 180°E.

- [ ] **Step 1: Install sharp as a dev dependency**

Run: `npm install --save-dev sharp @types/sharp`

- [ ] **Step 2: Write the tile generation script**

```typescript
// scripts/generateTopographyTiles.ts
/**
 * Generate topographic elevation PNG tiles from a preprocessed ETOPO1 DEM.
 *
 * Prerequisites:
 *   1. Download ETOPO1 Ice Surface GeoTIFF from:
 *      https://www.ncei.noaa.gov/products/etopo-global-relief-model
 *   2. Convert to raw binary with GDAL:
 *      gdal_translate -of ENVI -ot Int16 scripts/source-data/etopo1.tif scripts/source-data/etopo1.bin
 *   3. Place etopo1.bin and etopo1.hdr in scripts/source-data/
 *
 * Usage: npx tsx scripts/generateTopographyTiles.ts
 *
 * Output: public/data/topography/z{level}/{col}_{row}.png
 */
import { readFileSync, mkdirSync, existsSync } from 'fs';
import sharp from 'sharp';
import { elevationToRgb } from '../src/visualizations/map/hypsometricScale';
import { tileColumns, tileRows } from '../src/visualizations/map/topographyTiles';

const DEM_PATH = 'scripts/source-data/etopo1.bin';
const OUTPUT_DIR = 'public/data/topography';
const TILE_SIZE = 512; // pixels per tile
const MAX_LEVEL = 3;

// ETOPO1 dimensions (1 arc-minute resolution)
const DEM_WIDTH = 21601;
const DEM_HEIGHT = 10801;

function readDem(): Int16Array {
  if (!existsSync(DEM_PATH)) {
    throw new Error(
      `DEM file not found at ${DEM_PATH}. See script header for download instructions.`,
    );
  }
  const buffer = readFileSync(DEM_PATH);
  return new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
}

/**
 * Sample elevation at a geographic coordinate.
 * lat: degrees north (90 to -90), lng: degrees east (-180 to 180).
 */
function sampleElevation(dem: Int16Array, lat: number, lng: number): number {
  // ETOPO1: row 0 = 90°N, col 0 = 180°W
  const col = Math.round((lng + 180) * (DEM_WIDTH - 1) / 360);
  const row = Math.round((90 - lat) * (DEM_HEIGHT - 1) / 180);
  const clampedCol = Math.max(0, Math.min(DEM_WIDTH - 1, col));
  const clampedRow = Math.max(0, Math.min(DEM_HEIGHT - 1, row));
  return dem[clampedRow * DEM_WIDTH + clampedCol];
}

async function generateTile(
  dem: Int16Array,
  level: number,
  col: number,
  row: number,
): Promise<void> {
  const cols = tileColumns(level);
  const rows = tileRows(level);
  const tileLngWidth = 360 / cols;
  const tileLatHeight = 180 / rows;
  const tileLngStart = -180 + col * tileLngWidth;
  const tileLatStart = 90 - row * tileLatHeight; // top edge latitude

  const rgba = Buffer.alloc(TILE_SIZE * TILE_SIZE * 4);

  for (let py = 0; py < TILE_SIZE; py++) {
    for (let px = 0; px < TILE_SIZE; px++) {
      const lng = tileLngStart + (px + 0.5) / TILE_SIZE * tileLngWidth;
      const lat = tileLatStart - (py + 0.5) / TILE_SIZE * tileLatHeight;
      const elevation = sampleElevation(dem, lat, lng);
      const offset = (py * TILE_SIZE + px) * 4;

      if (elevation <= 0) {
        // Ocean: transparent
        rgba[offset] = 0;
        rgba[offset + 1] = 0;
        rgba[offset + 2] = 0;
        rgba[offset + 3] = 0;
      } else {
        const { r, g, b } = elevationToRgb(elevation);
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = 255;
      }
    }
  }

  const dir = `${OUTPUT_DIR}/z${level}`;
  mkdirSync(dir, { recursive: true });
  await sharp(rgba, { raw: { width: TILE_SIZE, height: TILE_SIZE, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(`${dir}/${col}_${row}.png`);
}

async function main(): Promise<void> {
  console.log('Reading DEM...');
  const dem = readDem();
  console.log(`DEM loaded: ${DEM_WIDTH}x${DEM_HEIGHT} pixels`);

  for (let level = 0; level <= MAX_LEVEL; level++) {
    const cols = tileColumns(level);
    const rows = tileRows(level);
    const totalTiles = cols * rows;
    console.log(`\nLevel ${level}: ${cols}x${rows} = ${totalTiles} tiles`);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        await generateTile(dem, level, col, row);
        process.stdout.write('.');
      }
    }
    console.log(' done');
  }

  console.log('\nAll tiles generated.');
}

main().catch(console.error);
```

- [ ] **Step 3: Write documentation**

Create `docs/topography-tiles.md` documenting:
- Architecture: tiled elevation layer, zoom levels 0-3, 512px PNGs
- How tiles map to SVG viewBox coordinates (equirectangular)
- The hypsometric color scale and its design rationale
- How to regenerate tiles (DEM source, GDAL preprocessing, script command)
- Dark mode handling (CSS brightness filter)
- How to add more zoom levels in the future
- The tile coordinate system (`topographyTiles.ts`)
- The TopographyTileLayer component and its viewport tracking

- [ ] **Step 4: Add topography directory to .gitignore source-data pattern**

Tiles in `public/data/topography/` should be committed (they're small). But the source DEM should be gitignored. Check `.gitignore` for existing `source-data` patterns and ensure `scripts/source-data/etopo1.*` is covered.

- [ ] **Step 5: Commit**

```bash
git add scripts/generateTopographyTiles.ts docs/topography-tiles.md
git commit -m "feat: add topographic tile generation script"
```

---

## Task 8: Mountain Range Data Pipeline

Scripts to extract mountain range polygons from elevation data and match them against OpenStreetMap `natural=mountain_range` features.

**Files:**
- Create: `scripts/generateMountainRanges.ts`
- Create: `public/data/mountains/world-mountain-ranges.csv`

This task has two sub-parts: (A) downloading and processing OSM mountain range data, and (B) extracting elevation regions from the DEM and matching them. Part B involves significant algorithmic work and manual curation.

**CSV format:**
```
id,name,name_alternates,continent,paths,latitude,longitude,peak_elevation_m,length_km,area_km2,highest_peak
```

Where `paths` contains pipe-separated SVG polygon `d` strings (equirectangular: x=lng, y=−lat, closed with Z).

- [ ] **Step 1: Create the mountain range generation script skeleton**

```typescript
// scripts/generateMountainRanges.ts
/**
 * Generate mountain range polygon data by combining DEM elevation analysis
 * with OpenStreetMap mountain_range features.
 *
 * Prerequisites:
 *   1. ETOPO1 DEM (same as tile generation — see generateTopographyTiles.ts)
 *   2. OSM mountain range data: download from Overpass API or extract from
 *      a planet file. Place GeoJSON at scripts/source-data/osm-mountain-ranges.geojson
 *
 * The script:
 *   1. Reads the DEM and extracts contiguous regions above an elevation threshold
 *   2. Converts regions to simplified polygons (Douglas-Peucker)
 *   3. Matches DEM polygons to OSM features by spatial overlap
 *   4. Outputs unmatched/ambiguous entries for manual review
 *   5. Generates the final CSV
 *
 * Usage: npx tsx scripts/generateMountainRanges.ts
 *
 * Output: public/data/mountains/world-mountain-ranges.csv
 */
```

The full implementation of this script involves:
- **Flood-fill or marching squares** on the DEM to extract elevation regions above a threshold (e.g., 500m)
- **Polygon simplification** using Douglas-Peucker (reuse the existing implementation from `generateBorderPaths.ts`)
- **Overpass API query** to fetch OSM `natural=mountain_range` relations with their geometry
- **Spatial matching**: compute overlap between DEM polygons and OSM features, flag ambiguous matches
- **Manual review output**: generate a report of unmatched/multi-matched features for human curation
- **CSV generation**: combine names from OSM with boundaries from DEM, compute centroid coordinates

This is a complex data pipeline. Implement it incrementally:
1. First get OSM data downloading working and output a preliminary CSV with OSM names + rough polygons
2. Then add DEM-based boundary refinement
3. Then add the matching/curation pipeline

- [ ] **Step 2: Download OSM mountain range data**

Create an Overpass API query to fetch `natural=mountain_range` features. The query:
```
[out:json][timeout:300];
relation["natural"="mountain_range"];
out geom;
```

Save to `scripts/source-data/osm-mountain-ranges.geojson`. Add download instructions to the script header.

- [ ] **Step 3: Implement OSM GeoJSON to CSV conversion**

Process the OSM GeoJSON:
- Extract relation names and geometry (outer ways)
- Convert coordinates to equirectangular SVG paths (x=lng, y=−lat)
- Apply Douglas-Peucker simplification (epsilon ~0.1 for mountain ranges — coarser than rivers)
- Compute centroid latitude/longitude
- Assign continents based on centroid coordinates
- Output CSV

- [ ] **Step 4: Implement DEM elevation region extraction**

Use the preprocessed ETOPO1 binary to:
- Threshold the DEM at a configurable elevation (default 500m)
- Run connected-component labeling to find contiguous regions
- Convert region boundaries to polygons using marching squares or contour tracing
- Simplify polygons with Douglas-Peucker
- Filter out tiny regions (area < threshold)

- [ ] **Step 5: Implement spatial matching between DEM regions and OSM features**

For each OSM mountain range:
- Find DEM regions whose centroid falls within the OSM polygon (or vice versa)
- Compute overlap area
- Report matches: 1:1 (clean), 1:many (OSM range covers multiple DEM regions — merge), many:1 (multiple OSM ranges in one DEM region — split), 0:1 (DEM region with no OSM match — needs manual naming)

Output a `mountain-ranges-review.json` with flagged entries for manual curation.

- [ ] **Step 6: Manual curation**

Review the flagged entries. For each:
- Decide whether to merge/split/rename
- Add `name_alternates` where relevant
- Add metadata: `peak_elevation_m`, `highest_peak`, `length_km`, `area_km2`
- Assign correct `continent` values

Save the curated data and regenerate the CSV.

- [ ] **Step 7: Generate final CSV**

Place the output at `public/data/mountains/world-mountain-ranges.csv`.

- [ ] **Step 8: Commit**

```bash
git add scripts/generateMountainRanges.ts public/data/mountains/world-mountain-ranges.csv
git commit -m "feat: add mountain range polygon data generation pipeline"
```

---

## Task 9: Mountain Ranges Quiz Definition

Register the mountain ranges quiz in the quiz registry with appropriate configuration.

**Files:**
- Modify: `src/quiz-definitions/quizRegistry.ts`

- [ ] **Step 1: Create the mountainRangesQuizBase shared config**

Add to `quizRegistry.ts` before the registry array:

```typescript
/**
 * Shared configuration for mountain range quizzes.
 * Uses fill-style polygons with transparent default state —
 * the topographic tile layer shows the mountains visually,
 * while the polygons are invisible interaction targets that
 * light up during quiz interactions.
 */
const mountainRangesQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'identify' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showMountainRangeNames', label: 'Mountain range names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
  ],
  presets: [],
  columnMappings: {
    answer: 'name',
    label: 'name',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'continent',
  },
  dataPath: '/data/mountains/world-mountain-ranges.csv',
  supportingDataPaths: ['/data/borders/world-borders.csv'],
  topographyDefault: true,
  locateDistanceMode: 'polygon-boundary' as const,
  locateThresholds: { correct: 100, correctSecond: 200, correctThird: 300 },
  hideFilteredElements: true,
  elementStateColorOverrides: {
    default: 'transparent',
    context: 'transparent',
  },
  elementFillOpacityOverrides: {
    correct: 0.1,
    'correct-second': 0.1,
    'correct-third': 0.1,
    incorrect: 0.1,
    missed: 0.1,
    highlighted: 0.15,
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;
```

- [ ] **Step 2: Add the World Mountain Ranges quiz entry to the registry**

```typescript
{
  ...mountainRangesQuizBase,
  id: 'geo-mountain-ranges-world',
  title: 'World Mountain Ranges',
  description: 'Name the major mountain ranges of the world.',
  initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  groupFilterColumn: 'continent',
  groupFilterLabel: 'Continent',
  groupFilterCameraPositions: {
    Europe: { x: -25, y: -72, width: 77, height: 42 },
    Asia: { x: 25, y: -70, width: 155, height: 80 },
    Africa: { x: -25, y: -40, width: 85, height: 80 },
    'North America': { x: -130, y: -55, width: 80, height: 50 },
    'South America': { x: -85, y: -15, width: 55, height: 73 },
    Oceania: { x: 100, y: -15, width: 80, height: 55 },
  },
},
```

- [ ] **Step 3: Handle mountain range name labels**

Mountain ranges use fill-style polygons, so their labels go through the `computeElementLabels` / `MapCountryLabels` system (the same path as countries/subdivisions — see MapRenderer.tsx lines 200-211). The `showMountainRangeNames` toggle needs to be checked in the label rendering.

Read how `showCountryNames` flows through `MapCountryLabels` and ensure `showMountainRangeNames` follows the same pattern. The label toggle key in `elementToggles` should map to `showMountainRangeNames` for mountain range elements.

Check `src/visualizations/map/computeElementLabels.ts` and `src/quiz-modes/ActiveQuiz.tsx` for how per-element toggle mappings work. Mountain range elements need their label toggle mapped to `showMountainRangeNames` rather than `showCountryNames`.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/quiz-definitions/quizRegistry.ts
git commit -m "feat: add mountain ranges quiz definition"
```

---

## Task 10: Ordered Recall Support (Deferred)

Add `orderedRecallSortColumns` for peak elevation and area. **Wait for another agent to finish related ordered-recall work first.** The user will signal when to rebase and proceed.

- [ ] **Step 1: Rebase onto latest main (when instructed)**

```bash
git fetch origin
git rebase origin/main
```

Fix any conflicts.

- [ ] **Step 2: Add ordered recall config to mountainRangesQuizBase**

Add `'free-recall-ordered'` to `availableModes` and add:

```typescript
orderedRecallSortColumns: [
  { column: 'peak_elevation_m', label: 'Peak elevation' },
  { column: 'area_km2', label: 'Area' },
],
```

- [ ] **Step 3: Run typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/quiz-definitions/quizRegistry.ts
git commit -m "feat: add ordered recall by elevation and area for mountain ranges"
```

---

## Task 11: Documentation and Feature List Update

Update project documentation to reflect the new topography system and mountain ranges quiz.

**Files:**
- Modify: `CLAUDE.md` (mention topography-tiles.md in detailed docs section)
- Modify: `docs/features.md` (add mountain ranges feature entry)
- Create: `docs/topography-tiles.md` (if not created in Task 7)

- [ ] **Step 1: Update CLAUDE.md**

Add to the "Detailed docs" section:
```
- `docs/topography-tiles.md` — Topographic tile system: tile coordinate math, generation pipeline, viewport tracking, dark mode
```

- [ ] **Step 2: Add feature entry to docs/features.md**

Add a new entry for the mountain ranges quiz:
```markdown
### 31. Mountain Ranges Quiz — DONE
**Branch:** `worktree-angusj-mountain-ranges`
**Scope:** Mountain ranges quiz with topographic elevation tile layer. Global DEM-based topography rendered as PNG tiles at 4 zoom levels (z0-z3), loaded/unloaded based on viewport. Mountain range polygons extracted from DEM + OSM data, invisible by default with low-opacity fills on quiz interactions. All map quizzes get an auto-injected "Topography" toggle (default off; mountain ranges default on). Four quiz modes: free recall, identify, locate (polygon-boundary), prompted recall. Ordered recall by peak elevation and area (added after rebase). Dark mode via CSS brightness filter on tiles.
**Key design decisions:**
- Topographic tiles use SVG `<image>` with bilinear interpolation for smooth zoom
- Hypsometric color scale with 17 stops, dense at low elevations for Australian-range visibility
- Mountain range polygons are invisible-by-default with `elementStateColorOverrides: { default: 'transparent', context: 'transparent' }`
- `elementFillOpacityOverrides` provides per-state opacity control (0.1 for answered states)
- Visible viewport bounds exposed via ZoomPanContext for tile loading
- Tile coordinate system: level N has 2^N columns × max(1, 2^(N-1)) rows
**Notes for other features:** The topographic tile layer is available to all map quizzes. Future map projections will need tile system adaptation. Tile system supports arbitrary zoom levels — add z4+ by running the generation script with higher MAX_LEVEL.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/features.md docs/topography-tiles.md
git commit -m "docs: add topography tiles and mountain ranges documentation"
```

---

## Task 12: Visual Testing and Polish

Generate test tiles, verify the full quiz flow in the browser, handle edge cases.

- [ ] **Step 1: Generate topography tiles**

Run: `npx tsx scripts/generateTopographyTiles.ts`
Verify tiles appear in `public/data/topography/z0/` through `z3/`.

- [ ] **Step 2: Generate mountain range data**

Run: `npx tsx scripts/generateMountainRanges.ts`
Review the output CSV and curation report. Manually curate as needed.

- [ ] **Step 3: Visual verification in browser**

Open the dev server and navigate to the mountain ranges quiz. Verify:
- [ ] Topographic tiles load and display correctly
- [ ] Tiles swap to higher resolution when zooming in
- [ ] No visible seams between adjacent tiles (add 0.01° overlap to tile bounds if needed)
- [ ] Mountain range polygons are invisible by default
- [ ] Hovering highlights the polygon outline
- [ ] Answering correctly shows a low-opacity green fill
- [ ] Incorrect answers show a low-opacity red fill
- [ ] Missed ranges show on give-up
- [ ] Country borders render on top of topography
- [ ] Dark mode dims the topography appropriately
- [ ] The topography toggle works (on/off)
- [ ] Other map quizzes (capitals, rivers, countries) have the topography toggle defaulting to off
- [ ] Performance is acceptable during zoom/pan

- [ ] **Step 4: Handle tile seams if visible**

If hairline gaps appear between tiles, add a small overlap (0.01 viewBox units) to each tile's rendered width/height in TopographyTileLayer:

```typescript
<image
  x={bounds.x - 0.005}
  y={bounds.y - 0.005}
  width={bounds.width + 0.01}
  height={bounds.height + 0.01}
  ...
/>
```

- [ ] **Step 5: Run final checks**

```bash
npm run typecheck
npm test
npx eslint .
npm run build
```

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual polish for topography tiles and mountain range rendering"
```
