/**
 * Generate color-mapped PNG tiles from the ETOPO1 Ice Surface GeoTIFF DEM.
 *
 * Reads the ETOPO1 elevation data directly using the `geotiff` package and
 * produces 512×512 PNG tiles for each zoom level. Ocean pixels (elevation ≤ 0)
 * are written as transparent; land pixels are colored using the hypsometric
 * color scale.
 *
 * Source file (gitignored, ~430 MB):
 *   scripts/source-data/ETOPO1_Ice_g_geotiff.tif
 *
 * Download:
 *   https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO1/data/ice_surface/grid_registered/georeferenced_tiff/
 *
 * Run:
 *   npx tsx scripts/generateTopographyTiles.ts
 *
 * Output:
 *   public/data/topography/z{level}/{col}_{row}.png
 *   43 tiles total: levels 0–3 (1 + 2 + 8 + 32)
 */

import { fromFile } from 'geotiff';
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { elevationToRgb } from '../src/visualizations/map/hypsometricScale.ts';
import { tileColumns, tileRows } from '../src/visualizations/map/topographyTiles.ts';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const TILE_SIZE = 512;
const MAX_LEVEL = 3;
const SOURCE_PATH = 'scripts/source-data/ETOPO1_Ice_g_geotiff.tif';
const OUTPUT_BASE = 'public/data/topography';

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Reading ${SOURCE_PATH}...`);

  const tiff = await fromFile(SOURCE_PATH);
  const image = await tiff.getImage();
  const demWidth = image.getWidth();    // 21601
  const demHeight = image.getHeight();  // 10801

  console.log(`DEM size: ${demWidth} × ${demHeight}`);

  const [rasters] = await image.readRasters() as [Int16Array];

  console.log('Rasters loaded. Generating tiles...\n');

  for (let level = 0; level <= MAX_LEVEL; level++) {
    const cols = tileColumns(level);
    const rows = tileRows(level);

    for (let tileRow = 0; tileRow < rows; tileRow++) {
      for (let tileCol = 0; tileCol < cols; tileCol++) {
        process.stdout.write(`  Level ${level}  tile ${tileCol}_${tileRow} (${cols}×${rows})...`);

        const dirPath = `${OUTPUT_BASE}/z${level}`;
        mkdirSync(dirPath, { recursive: true });

        const tileLngWidth = 360 / cols;
        const tileLatHeight = 180 / rows;
        const tileLngStart = -180 + tileCol * tileLngWidth;
        const tileLatStart = 90 - tileRow * tileLatHeight; // top-edge latitude

        const rgba = new Uint8Array(TILE_SIZE * TILE_SIZE * 4);

        for (let py = 0; py < TILE_SIZE; py++) {
          for (let px = 0; px < TILE_SIZE; px++) {
            const lng = tileLngStart + (px + 0.5) / TILE_SIZE * tileLngWidth;
            const lat = tileLatStart - (py + 0.5) / TILE_SIZE * tileLatHeight;

            const demCol = Math.round((lng + 180) * (demWidth - 1) / 360);
            const demRow = Math.round((90 - lat) * (demHeight - 1) / 180);
            const elevation = rasters[demRow * demWidth + demCol];

            const pixelIndex = (py * TILE_SIZE + px) * 4;

            if (elevation <= 0) {
              // Ocean — transparent
              rgba[pixelIndex] = 0;
              rgba[pixelIndex + 1] = 0;
              rgba[pixelIndex + 2] = 0;
              rgba[pixelIndex + 3] = 0;
            } else {
              const { r, g, b } = elevationToRgb(elevation);
              rgba[pixelIndex] = r;
              rgba[pixelIndex + 1] = g;
              rgba[pixelIndex + 2] = b;
              rgba[pixelIndex + 3] = 255;
            }
          }
        }

        const outPath = `${dirPath}/${tileCol}_${tileRow}.png`;
        await sharp(rgba, { raw: { width: TILE_SIZE, height: TILE_SIZE, channels: 4 } })
          .png({ compressionLevel: 9 })
          .toFile(outPath);

        process.stdout.write(` done → ${outPath}\n`);
      }
    }
  }

  console.log('\nAll tiles generated.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
