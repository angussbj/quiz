/**
 * Generate color-mapped PNG tiles from ETOPO 2022 (60 arc-second) GeoTIFF DEM.
 *
 * Uses country border polygons from world-borders.csv as a land mask so that
 * only land areas are colored — ocean (including shallow continental shelves)
 * is transparent. Below-sea-level land depressions (Dead Sea, Death Valley)
 * render correctly because the mask is polygon-based, not elevation-based.
 *
 * Source file (gitignored, ~120 MB):
 *   scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Download:
 *   https://www.ngdc.noaa.gov/mgg/global/relief/ETOPO2022/data/60s/60s_surface_elev_gtif/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Usage:
 *   npx tsx scripts/generateTopographyTiles.ts            # sqrt scaling (default)
 *   npx tsx scripts/generateTopographyTiles.ts --linear   # linear scaling
 *
 * Output:
 *   public/data/topography/z{level}/...      (sqrt)
 *   public/data/topography-linear/z{level}/... (linear)
 */

import { fromFile } from 'geotiff';
import type { GeoTIFFImage } from 'geotiff';
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { elevationToRgb } from '../src/visualizations/map/hypsometricScale.ts';
import type { ElevationScaling } from '../src/visualizations/map/hypsometricScale.ts';
import { tileColumns, tileRows } from '../src/visualizations/map/topographyTiles.ts';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const TILE_SIZE = 512;
const MAX_LEVEL = 5;
const SKIP_EMPTY_TILES = true;
const SOURCE_PATH = 'scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif';
const BORDERS_PATH = 'public/data/borders/world-borders.csv';

/** Resolution of the land mask bitmap (pixels per degree). */
const MASK_RESOLUTION = 10;
const MASK_WIDTH = 360 * MASK_RESOLUTION;   // 3600
const MASK_HEIGHT = 180 * MASK_RESOLUTION;  // 1800

// ------------------------------------------------------------------
// Land mask from border polygons
// ------------------------------------------------------------------

/**
 * Build a land mask by rasterizing all country border polygons into a bitmap.
 * Uses sharp to render an SVG containing all border polygons as white fills
 * on a transparent background, then extracts the alpha channel.
 *
 * The SVG uses equirectangular coordinates: x = longitude + 180, y = 90 - latitude.
 */
async function buildLandMask(): Promise<Uint8Array> {
  console.log('Building land mask from border polygons...');

  const csv = readFileSync(BORDERS_PATH, 'utf8');
  const lines = csv.split('\n');
  const headers = lines[0].split(',');
  const pathsIndex = headers.indexOf('paths');

  // Collect all SVG path d-strings from the borders CSV
  const pathElements: Array<string> = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line respecting quoted fields
    const pathsField = extractCsvField(line, pathsIndex);
    if (!pathsField) continue;

    // paths field contains pipe-separated SVG path d-strings
    const subpaths = pathsField.split('|');
    for (const d of subpaths) {
      if (!d.trim()) continue;
      // Transform from map coordinates (x=lng, y=-lat) to mask coordinates
      // Mask: x = lng + 180 (0-360), y = 90 - lat (0-180), scaled by MASK_RESOLUTION
      // SVG path uses x=lng, y=-lat, so: maskX = (lng+180)*res, maskY = (90+(-lat))*res = (90-lat)*res
      // Since y in path = -lat, maskY = (90 + y)*res... but we need to transform the path.
      // Easier: use a viewBox that matches the path coordinate system.
      pathElements.push(`<path d="${d}" fill="white" fill-rule="evenodd"/>`);
    }
  }

  console.log(`  ${pathElements.length} border polygons loaded`);

  // Build SVG with viewBox matching the map coordinate system (x=lng, y=-lat)
  // x: -180 to 180, y: -90 to 90
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MASK_WIDTH}" height="${MASK_HEIGHT}" viewBox="-180 -90 360 180">
    <rect x="-180" y="-90" width="360" height="180" fill="black"/>
    ${pathElements.join('\n    ')}
  </svg>`;

  // Render SVG to bitmap
  const { data } = await sharp(Buffer.from(svg))
    .resize(MASK_WIDTH, MASK_HEIGHT)
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Extract a single-channel land mask (white = land, black = ocean)
  // sharp raw output is RGBA (4 bytes per pixel)
  const mask = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  for (let i = 0; i < mask.length; i++) {
    // Use red channel (white pixels have r=255, black have r=0)
    mask[i] = data[i * 4] > 128 ? 1 : 0;
  }

  const landPixels = mask.reduce((sum, v) => sum + v, 0);
  console.log(`  Land mask: ${MASK_WIDTH}×${MASK_HEIGHT}, ${landPixels} land pixels (${(landPixels / mask.length * 100).toFixed(1)}%)`);

  return mask;
}

/** Check if a geographic point is on land according to the mask. */
function isLand(mask: Uint8Array, lng: number, lat: number): boolean {
  // Mask coordinates: x = (lng + 180) * res, y = (90 - lat) * res
  const mx = Math.round((lng + 180) * MASK_RESOLUTION);
  const my = Math.round((90 - lat) * MASK_RESOLUTION);
  if (mx < 0 || mx >= MASK_WIDTH || my < 0 || my >= MASK_HEIGHT) return false;
  return mask[my * MASK_WIDTH + mx] === 1;
}

/**
 * Extract a field from a CSV line, handling quoted fields.
 * Simple parser that handles the common case of pipe-separated SVG paths in quotes.
 */
function extractCsvField(line: string, fieldIndex: number): string {
  let field = 0;
  let i = 0;
  let start = 0;

  while (i < line.length && field < fieldIndex) {
    if (line[i] === '"') {
      // Skip quoted field
      i++;
      while (i < line.length && line[i] !== '"') i++;
      if (i < line.length) i++; // skip closing quote
    } else if (line[i] === ',') {
      field++;
      i++;
      start = i;
    } else {
      i++;
    }
  }

  if (field !== fieldIndex) return '';

  // Now read the field value starting at position start
  if (line[start] === '"') {
    // Quoted field — find closing quote
    const end = line.indexOf('"', start + 1);
    return end >= 0 ? line.slice(start + 1, end) : line.slice(start + 1);
  }
  // Unquoted field — read to next comma or end
  const end = line.indexOf(',', start);
  return end >= 0 ? line.slice(start, end) : line.slice(start);
}

// ------------------------------------------------------------------
// DEM reading
// ------------------------------------------------------------------

async function readElevationWindow(
  image: GeoTIFFImage,
  demWidth: number,
  demHeight: number,
  lngStart: number,
  latStart: number,
  lngWidth: number,
  latHeight: number,
  outWidth: number,
  outHeight: number,
): Promise<Float32Array> {
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

  const result = new Float32Array(outWidth * outHeight);
  for (let py = 0; py < outHeight; py++) {
    for (let px = 0; px < outWidth; px++) {
      const lng = lngStart + (px + 0.5) / outWidth * lngWidth;
      const lat = latStart - (py + 0.5) / outHeight * latHeight;

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
  const scaling: ElevationScaling = process.argv.includes('--linear') ? 'linear' : 'sqrt';
  const outputBase = scaling === 'linear'
    ? 'public/data/topography-linear'
    : 'public/data/topography';

  console.log(`Scaling: ${scaling}`);
  console.log(`Output:  ${outputBase}/`);

  // Build land mask from border polygons
  const landMask = await buildLandMask();

  console.log(`Reading ${SOURCE_PATH}...`);
  const tiff = await fromFile(SOURCE_PATH);
  const image = await tiff.getImage();
  const demWidth = image.getWidth();
  const demHeight = image.getHeight();

  console.log(`DEM size: ${demWidth} × ${demHeight}`);
  console.log('Generating tiles...\n');

  let tileCount = 0;
  let generatedCount = 0;
  const totalTiles = Array.from({ length: MAX_LEVEL + 1 }, (_, l) => tileColumns(l) * tileRows(l))
    .reduce((a, b) => a + b, 0);

  for (let level = 0; level <= MAX_LEVEL; level++) {
    const cols = tileColumns(level);
    const rows = tileRows(level);

    for (let tileRow = 0; tileRow < rows; tileRow++) {
      for (let tileCol = 0; tileCol < cols; tileCol++) {
        tileCount++;
        process.stdout.write(`  [${tileCount}/${totalTiles}] z${level}/${tileCol}_${tileRow}...`);

        const dirPath = `${outputBase}/z${level}`;
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
          const px = i % TILE_SIZE;
          const py = (i - px) / TILE_SIZE;
          const lng = tileLngStart + (px + 0.5) / TILE_SIZE * tileLngWidth;
          const lat = tileLatStart - (py + 0.5) / TILE_SIZE * tileLatHeight;
          const offset = i * 4;

          if (!isLand(landMask, lng, lat)) {
            rgba[offset] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
          } else {
            hasLand = true;
            const { r, g, b } = elevationToRgb(elevations[i], scaling);
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

        generatedCount++;
        process.stdout.write(` done\n`);
      }
    }
  }

  console.log(`\n${generatedCount} tiles generated in ${outputBase}/`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
