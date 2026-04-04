/**
 * Tile coordinate math for the topographic tile layer.
 *
 * Uses equirectangular projection where the world is 360° wide × 180° tall.
 * SVG viewBox coordinates: x = longitude (−180 to 180), y = −latitude (−90 to 90).
 *
 * Zoom levels:
 *   Level 0: 1×1 (1 tile, 360°×180°)
 *   Level 1: 2×1 (2 tiles, 180°×180°)
 *   Level 2: 4×2 (8 tiles, 90°×90°)
 *   Level 3: 8×4 (32 tiles, 45°×45°)
 */

const WORLD_X = -180;
const WORLD_Y = -90;
const WORLD_WIDTH = 360;
const WORLD_HEIGHT = 180;

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

/**
 * Number of tile columns at a given zoom level: 2^level (minimum 1).
 */
export function tileColumns(level: number): number {
  return Math.max(1, Math.pow(2, level));
}

/**
 * Number of tile rows at a given zoom level: max(1, 2^(level-1)).
 */
export function tileRows(level: number): number {
  return Math.max(1, Math.pow(2, level - 1));
}

/**
 * Geographic bounds of a tile in SVG viewBox coordinates.
 * x = longitude, y = −latitude.
 */
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

/**
 * Find all tiles at a given level that intersect a viewport.
 * Returns tiles in row-major order (row ascending, then col ascending).
 */
export function visibleTiles(
  viewport: TileBounds,
  level: number,
): ReadonlyArray<TileId> {
  const cols = tileColumns(level);
  const rows = tileRows(level);
  const tileWidth = WORLD_WIDTH / cols;
  const tileHeight = WORLD_HEIGHT / rows;

  // Clamp viewport to world bounds before computing tile range
  const vpLeft = Math.max(viewport.x, WORLD_X);
  const vpTop = Math.max(viewport.y, WORLD_Y);
  const vpRight = Math.min(viewport.x + viewport.width, WORLD_X + WORLD_WIDTH);
  const vpBottom = Math.min(viewport.y + viewport.height, WORLD_Y + WORLD_HEIGHT);

  if (vpRight <= vpLeft || vpBottom <= vpTop) {
    return [];
  }

  const colStart = Math.max(0, Math.floor((vpLeft - WORLD_X) / tileWidth));
  const colEnd = Math.min(cols - 1, Math.ceil((vpRight - WORLD_X) / tileWidth) - 1);
  const rowStart = Math.max(0, Math.floor((vpTop - WORLD_Y) / tileHeight));
  const rowEnd = Math.min(rows - 1, Math.ceil((vpBottom - WORLD_Y) / tileHeight) - 1);

  const result: TileId[] = [];
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      result.push({ level, col, row });
    }
  }
  return result;
}

/**
 * Choose the best tile level for a viewport width (in viewBox degrees).
 *
 * Picks the highest level where each tile is wider than the viewport,
 * keeping ~1-2 tiles visible horizontally. For very zoomed-in views,
 * returns maxLevel (finest available resolution).
 */
export function optimalTileLevel(viewportWidth: number, maxLevel: number): number {
  let best = 0;
  for (let level = 1; level <= maxLevel; level++) {
    const tileWidth = WORLD_WIDTH / tileColumns(level);
    if (tileWidth > viewportWidth) {
      best = level;
    } else {
      break;
    }
  }
  return best;
}
