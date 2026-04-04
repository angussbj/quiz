import {
  tileColumns,
  tileRows,
  tileBounds,
  visibleTiles,
  optimalTileLevel,
} from '../topographyTiles';
import type { TileId, TileBounds } from '../topographyTiles';

describe('tileColumns', () => {
  it('returns 1 at level 0', () => {
    expect(tileColumns(0)).toBe(1);
  });

  it('returns 2 at level 1', () => {
    expect(tileColumns(1)).toBe(2);
  });

  it('returns 4 at level 2', () => {
    expect(tileColumns(2)).toBe(4);
  });

  it('returns 8 at level 3', () => {
    expect(tileColumns(3)).toBe(8);
  });

  it('returns 16 at level 4', () => {
    expect(tileColumns(4)).toBe(16);
  });
});

describe('tileRows', () => {
  it('returns 1 at level 0', () => {
    expect(tileRows(0)).toBe(1);
  });

  it('returns 1 at level 1', () => {
    expect(tileRows(1)).toBe(1);
  });

  it('returns 2 at level 2', () => {
    expect(tileRows(2)).toBe(2);
  });

  it('returns 4 at level 3', () => {
    expect(tileRows(3)).toBe(4);
  });

  it('returns 8 at level 4', () => {
    expect(tileRows(4)).toBe(8);
  });
});

describe('tileBounds', () => {
  it('returns world bounds for the single tile at level 0', () => {
    const tile: TileId = { level: 0, col: 0, row: 0 };
    const bounds = tileBounds(tile);
    expect(bounds.x).toBeCloseTo(-180);
    expect(bounds.y).toBeCloseTo(-90);
    expect(bounds.width).toBeCloseTo(360);
    expect(bounds.height).toBeCloseTo(180);
  });

  it('returns left half for col 0 at level 1', () => {
    const tile: TileId = { level: 1, col: 0, row: 0 };
    const bounds = tileBounds(tile);
    expect(bounds.x).toBeCloseTo(-180);
    expect(bounds.y).toBeCloseTo(-90);
    expect(bounds.width).toBeCloseTo(180);
    expect(bounds.height).toBeCloseTo(180);
  });

  it('returns right half for col 1 at level 1', () => {
    const tile: TileId = { level: 1, col: 1, row: 0 };
    const bounds = tileBounds(tile);
    expect(bounds.x).toBeCloseTo(0);
    expect(bounds.y).toBeCloseTo(-90);
    expect(bounds.width).toBeCloseTo(180);
    expect(bounds.height).toBeCloseTo(180);
  });

  it('returns top-left quadrant at level 2, col 0, row 0', () => {
    const tile: TileId = { level: 2, col: 0, row: 0 };
    const bounds = tileBounds(tile);
    expect(bounds.x).toBeCloseTo(-180);
    expect(bounds.y).toBeCloseTo(-90);
    expect(bounds.width).toBeCloseTo(90);
    expect(bounds.height).toBeCloseTo(90);
  });

  it('returns bottom-right quadrant at level 2, col 3, row 1', () => {
    const tile: TileId = { level: 2, col: 3, row: 1 };
    const bounds = tileBounds(tile);
    expect(bounds.x).toBeCloseTo(90);
    expect(bounds.y).toBeCloseTo(0);
    expect(bounds.width).toBeCloseTo(90);
    expect(bounds.height).toBeCloseTo(90);
  });

  it('tiles at level 3 have 45x45 degree size', () => {
    const tile: TileId = { level: 3, col: 2, row: 1 };
    const bounds = tileBounds(tile);
    expect(bounds.width).toBeCloseTo(45);
    expect(bounds.height).toBeCloseTo(45);
    expect(bounds.x).toBeCloseTo(-180 + 2 * 45);
    expect(bounds.y).toBeCloseTo(-90 + 1 * 45);
  });
});

describe('visibleTiles', () => {
  const worldViewport: TileBounds = { x: -180, y: -90, width: 360, height: 180 };

  it('returns all tiles at level 0 for a world viewport', () => {
    const tiles = visibleTiles(worldViewport, 0);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toEqual({ level: 0, col: 0, row: 0 });
  });

  it('returns all 2 tiles at level 1 for a world viewport', () => {
    const tiles = visibleTiles(worldViewport, 1);
    expect(tiles).toHaveLength(2);
    expect(tiles).toContainEqual({ level: 1, col: 0, row: 0 });
    expect(tiles).toContainEqual({ level: 1, col: 1, row: 0 });
  });

  it('returns all 8 tiles at level 2 for a world viewport', () => {
    const tiles = visibleTiles(worldViewport, 2);
    expect(tiles).toHaveLength(8);
  });

  it('returns only intersecting tiles for a small viewport', () => {
    // Viewport covering roughly Western Europe
    const viewport: TileBounds = { x: -10, y: -60, width: 50, height: 50 };
    const tiles = visibleTiles(viewport, 2);
    // At level 2, tiles are 90x90 degrees; this viewport spans up to 2 columns and 1 row
    for (const tile of tiles) {
      const bounds = tileBounds(tile);
      // Each returned tile must actually intersect the viewport
      expect(bounds.x + bounds.width).toBeGreaterThan(viewport.x);
      expect(bounds.x).toBeLessThan(viewport.x + viewport.width);
      expect(bounds.y + bounds.height).toBeGreaterThan(viewport.y);
      expect(bounds.y).toBeLessThan(viewport.y + viewport.height);
    }
  });

  it('returns tiles that cover a single-point viewport', () => {
    // London, approximately (lng=0, lat=51 → SVG y = -51)
    const viewport: TileBounds = { x: 0, y: -51, width: 1, height: 1 };
    const tiles = visibleTiles(viewport, 2);
    expect(tiles.length).toBeGreaterThan(0);
    const containsTile = tiles.some((tile) => {
      const bounds = tileBounds(tile);
      return (
        bounds.x <= 0 &&
        bounds.x + bounds.width >= 1 &&
        bounds.y <= -51 &&
        bounds.y + bounds.height >= -50
      );
    });
    expect(containsTile).toBe(true);
  });

  it('returns tiles in row-major order (row, then col)', () => {
    const tiles = visibleTiles(worldViewport, 2);
    for (let i = 1; i < tiles.length; i++) {
      const prev = tiles[i - 1];
      const curr = tiles[i];
      const prevOrder = prev.row * 1000 + prev.col;
      const currOrder = curr.row * 1000 + curr.col;
      expect(currOrder).toBeGreaterThan(prevOrder);
    }
  });
});

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

  it('wider viewport returns same or lower level', () => {
    const narrow = optimalTileLevel(20, 3);
    const medium = optimalTileLevel(80, 3);
    const wide = optimalTileLevel(300, 3);
    expect(narrow).toBeGreaterThanOrEqual(medium);
    expect(medium).toBeGreaterThanOrEqual(wide);
  });
});
