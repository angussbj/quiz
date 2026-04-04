/**
 * Generate color-mapped PNG tiles from ETOPO 2022 (60 arc-second) GeoTIFF DEM.
 *
 * Reads the elevation data directly using the `geotiff` package and
 * produces 512×512 PNG tiles for each zoom level. Ocean pixels (elevation ≤ 0)
 * are written as transparent; land pixels are colored using the hypsometric
 * color scale.
 *
 * Source file (gitignored, ~120 MB):
 *   scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Download:
 *   https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Run:
 *   npx tsx scripts/generateTopographyTiles.ts
 *
 * Output:
 *   public/data/topography/z{level}/{col}_{row}.png
 *   43 tiles total: levels 0–3 (1 + 2 + 8 + 32)
 */

import { fromFile } from 'geotiff';
import type { GeoTIFFImage } from 'geotiff';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { elevationToRgb } from '../src/visualizations/map/hypsometricScale.ts';
import { tileColumns, tileRows } from '../src/visualizations/map/topographyTiles.ts';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const TILE_SIZE = 512;
const MAX_LEVEL = 5;
/** Skip tiles that are entirely ocean (all pixels transparent). */
const SKIP_EMPTY_TILES = true;
const SOURCE_PATH = 'scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif';
const OUTPUT_BASE = 'public/data/topography';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * Read a geographic window from the DEM as Float32Array using windowed reads.
 * ETOPO 2022 uses deflate compression that geotiff handles per-tile but not
 * for full-raster reads, so we read windows per output tile.
 *
 * The DEM covers -180 to 180 longitude (left to right) and
 * 90 to -90 latitude (top to bottom). Pixels are Float32 elevation in meters.
 */
async function readElevationWindow(
  image: GeoTIFFImage,
  demWidth: number,
  demHeight: number,
  lngStart: number,
  latStart: number, // top edge (northernmost)
  lngWidth: number,
  latHeight: number,
  outWidth: number,
  outHeight: number,
): Promise<Float32Array> {
  // Convert geographic bounds to pixel bounds in the DEM
  const pixelLeft = Math.floor((lngStart + 180) / 360 * demWidth);
  const pixelTop = Math.floor((90 - latStart) / 180 * demHeight);
  const pixelRight = Math.ceil((lngStart + lngWidth + 180) / 360 * demWidth);
  const pixelBottom = Math.ceil((90 - (latStart - latHeight)) / 180 * demHeight);

  const clampedLeft = Math.max(0, pixelLeft);
  const clampedTop = Math.max(0, pixelTop);
  const clampedRight = Math.min(demWidth, pixelRight);
  const clampedBottom = Math.min(demHeight, pixelBottom);

  const windowWidth = clampedRight - clampedLeft;
  const windowHeight = clampedBottom - clampedTop;

  if (windowWidth <= 0 || windowHeight <= 0) {
    return new Float32Array(outWidth * outHeight);
  }

  const rasterData = await image.readRasters({
    window: [clampedLeft, clampedTop, clampedRight, clampedBottom],
  });
  const raster = rasterData[0] as Float32Array;

  // Resample from DEM resolution to output tile resolution
  const result = new Float32Array(outWidth * outHeight);
  for (let py = 0; py < outHeight; py++) {
    for (let px = 0; px < outWidth; px++) {
      const lng = lngStart + (px + 0.5) / outWidth * lngWidth;
      const lat = latStart - (py + 0.5) / outHeight * latHeight;

      // Map to pixel position within the window
      const demX = (lng + 180) / 360 * demWidth - clampedLeft;
      const demY = (90 - lat) / 180 * demHeight - clampedTop;

      const ix = Math.min(windowWidth - 1, Math.max(0, Math.round(demX)));
      const iy = Math.min(windowHeight - 1, Math.max(0, Math.round(demY)));

      result[py * outWidth + px] = raster[iy * windowWidth + ix];
    }
  }
  return result;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Reading ${SOURCE_PATH}...`);

  const tiff = await fromFile(SOURCE_PATH);
  const image = await tiff.getImage();
  const demWidth = image.getWidth();
  const demHeight = image.getHeight();

  console.log(`DEM size: ${demWidth} × ${demHeight}`);
  console.log('Generating tiles...\n');

  let tileCount = 0;
  const totalTiles = Array.from({ length: MAX_LEVEL + 1 }, (_, l) => tileColumns(l) * tileRows(l))
    .reduce((a, b) => a + b, 0);

  for (let level = 0; level <= MAX_LEVEL; level++) {
    const cols = tileColumns(level);
    const rows = tileRows(level);

    for (let tileRow = 0; tileRow < rows; tileRow++) {
      for (let tileCol = 0; tileCol < cols; tileCol++) {
        tileCount++;
        process.stdout.write(`  [${tileCount}/${totalTiles}] z${level}/${tileCol}_${tileRow}...`);

        const dirPath = `${OUTPUT_BASE}/z${level}`;
        mkdirSync(dirPath, { recursive: true });

        const tileLngWidth = 360 / cols;
        const tileLatHeight = 180 / rows;
        const tileLngStart = -180 + tileCol * tileLngWidth;
        const tileLatStart = 90 - tileRow * tileLatHeight;

        const elevations = await readElevationWindow(
          image, demWidth, demHeight,
          tileLngStart, tileLatStart, tileLngWidth, tileLatHeight,
          TILE_SIZE, TILE_SIZE,
        );

        const rgba = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);
        let hasLand = false;
        for (let i = 0; i < TILE_SIZE * TILE_SIZE; i++) {
          const elevation = elevations[i];
          const offset = i * 4;

          if (elevation <= 0) {
            rgba[offset] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
          } else {
            hasLand = true;
            const { r, g, b } = elevationToRgb(elevation);
            rgba[offset] = r;
            rgba[offset + 1] = g;
            rgba[offset + 2] = b;
            rgba[offset + 3] = 255;
          }
        }

        if (SKIP_EMPTY_TILES && !hasLand) {
          process.stdout.write(` skipped (ocean)\n`);
          continue;
        }

        const outPath = `${dirPath}/${tileCol}_${tileRow}.png`;
        await sharp(rgba, { raw: { width: TILE_SIZE, height: TILE_SIZE, channels: 4 } })
          .png({ compressionLevel: 9 })
          .toFile(outPath);

        process.stdout.write(` done\n`);
      }
    }
  }

  console.log(`\nAll ${totalTiles} tiles generated in ${OUTPUT_BASE}/`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
