# Topographic Tile System

Tiled elevation layer rendered as SVG `<image>` elements in the map visualization. Tiles are pre-generated PNG images using a hypsometric color scale and loaded/unloaded based on the visible viewport.

## Architecture

The topographic layer sits below quiz elements in the SVG layer stack. It consists of PNG tiles placed at fixed positions in SVG viewBox coordinates. The `TopographyTileLayer` component subscribes to visible viewport bounds from `ZoomPanContext` and renders only tiles that intersect the current view.

Tiles use CSS `image-rendering: auto` (bilinear interpolation) for smooth appearance when zoomed in.

Dark mode applies a CSS `brightness(0.65)` filter to all tile images — no separate dark tile set is needed.

## Tile Coordinate System

Tiles are stored at `public/data/topography/z{level}/{col}_{row}.png`.

Level N has `2^N` columns and `max(1, 2^(N-1))` rows:

| Level | Columns | Rows | Tiles |
|-------|---------|------|-------|
| 0     | 1       | 1    | 1     |
| 1     | 2       | 1    | 2     |
| 2     | 4       | 2    | 8     |
| 3     | 8       | 4    | 32    |
| Total |         |      | 43    |

The row formula `max(1, 2^(N-1))` keeps level 0 and level 1 as single-row (full world height) while level 2+ subdivide vertically.

## Mapping Tiles to SVG ViewBox

The map uses equirectangular projection: **x = longitude, y = −latitude** (north is up). The full world spans x ∈ [−180, 180], y ∈ [−90, 90].

For level N, tile `(col, row)`:
- Width per tile: `360 / 2^N`
- Height per tile: `180 / max(1, 2^(N-1))`
- SVG x origin: `−180 + col × tileWidth`
- SVG y origin: `−90 + row × tileHeight`

## Hypsometric Color Scale

17 elevation stops linearly interpolated:

| Elevation (m) | Color (approx)         |
|---------------|------------------------|
| −500          | Deep sea blue          |
| 0             | Sea-level green        |
| 50            | Light green            |
| 200           | Pale yellow-green      |
| 500           | Tan/khaki              |
| 1000          | Light brown            |
| 1500          | Medium brown           |
| 2000          | Dark brown             |
| 2500          | Brown-grey             |
| 3000          | Grey-brown             |
| 3500          | Mid grey               |
| 4000          | Light grey             |
| 4500          | Pale grey              |
| 5500          | Near white             |
| 6500          | White-grey             |
| 7500          | White                  |
| 8849          | Pure white (Everest)   |

The scale is dense at low elevations (0–500 m) to ensure visibility of low-relief features like Australian ranges.

## The `showTopography` Toggle

The `showTopography` toggle is auto-injected for all map quizzes — quiz definitions do not need to declare it explicitly. Injection happens in the quiz shell when the visualization type is `'map'`.

`QuizDefinition.topographyDefault` (`boolean`, default `false`) controls whether the toggle starts enabled. Mountain ranges quizzes set this to `true`.

## Regenerating Tiles

1. Download **ETOPO 2022 60-second resolution GeoTIFF** from NOAA:
   `https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/`
   Save as `scripts/data/ETOPO_2022_v1_60s_N90W180_geoid.tif`

2. Run the generation script:
   ```bash
   npx tsx scripts/generateTopographyTiles.ts
   ```

The script reads the GeoTIFF, applies the hypsometric color scale, and writes PNGs to `public/data/topography/`. Each tile is 512 × 512 pixels. Existing tiles are overwritten.

## Adding More Zoom Levels

Increase `MAX_LEVEL` in `scripts/generateTopographyTiles.ts` and rerun the script. Level 4 would produce 128 tiles (16 columns × 8 rows), bringing the total to 171 tiles. Higher levels give sharper detail when zoomed in far.

The `TopographyTileLayer` component reads `MAX_LEVEL` from a constant — update it there too so the new tiles are loaded at appropriate zoom thresholds.

## Future Projections

The tile system assumes equirectangular projection. If a non-equirectangular projection is added (e.g. Mercator, equal-area), tile placement coordinates will need to be recalculated for that projection's coordinate space, or tiles regenerated in the new projection.
