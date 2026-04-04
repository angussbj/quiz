/**
 * Generate world-mountain-ranges.csv with ~65 major mountain ranges.
 *
 * Each range includes metadata (elevation, length, area, highest peak) and
 * an SVG polygon path in equirectangular projection (x = longitude, y = −latitude).
 *
 * The script reads the ETOPO 2022 DEM to verify that centroid coordinates
 * fall on land at reasonable elevation, nudging them if necessary.
 *
 * Usage:
 *   npx tsx scripts/generateMountainRanges.ts
 *
 * Input:
 *   scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif
 *
 * Output:
 *   public/data/mountains/world-mountain-ranges.csv
 */

import { fromFile } from 'geotiff';
import type { GeoTIFFImage } from 'geotiff';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface MountainRange {
  readonly id: string;
  readonly name: string;
  readonly nameAlternates: string;
  readonly continent: string;
  readonly polygon: ReadonlyArray<readonly [number, number]>; // [lng, lat] pairs
  readonly latitude: number;
  readonly longitude: number;
  readonly peakElevationM: number;
  readonly lengthKm: number;
  readonly areaKm2: number;
  readonly highestPeak: string;
}

// ------------------------------------------------------------------
// DEM helpers
// ------------------------------------------------------------------

async function readElevationAtPoint(
  image: GeoTIFFImage,
  demWidth: number,
  demHeight: number,
  lng: number,
  lat: number,
): Promise<number> {
  const pixelX = Math.floor((lng + 180) / 360 * demWidth);
  const pixelY = Math.floor((90 - lat) / 180 * demHeight);

  const clampedX = Math.max(0, Math.min(demWidth - 1, pixelX));
  const clampedY = Math.max(0, Math.min(demHeight - 1, pixelY));

  const rasterData = await image.readRasters({
    window: [clampedX, clampedY, clampedX + 1, clampedY + 1],
  });
  const raster = rasterData[0] as Float32Array;
  return raster[0];
}

/**
 * Search in a small grid around the centroid to find a point with higher
 * elevation, nudging the centroid onto land / higher terrain.
 */
async function refineCentroid(
  image: GeoTIFFImage,
  demWidth: number,
  demHeight: number,
  lng: number,
  lat: number,
): Promise<{ readonly lng: number; readonly lat: number; readonly elevation: number }> {
  let bestLng = lng;
  let bestLat = lat;
  let bestElev = -Infinity;

  // Search a 5x5 grid with 0.5° spacing around the centroid
  for (let dLat = -1.0; dLat <= 1.0; dLat += 0.5) {
    for (let dLng = -1.0; dLng <= 1.0; dLng += 0.5) {
      const testLng = lng + dLng;
      const testLat = lat + dLat;
      const elev = await readElevationAtPoint(image, demWidth, demHeight, testLng, testLat);
      if (elev > bestElev) {
        bestElev = elev;
        bestLng = testLng;
        bestLat = testLat;
      }
    }
  }

  return { lng: bestLng, lat: bestLat, elevation: bestElev };
}

// ------------------------------------------------------------------
// SVG path generation
// ------------------------------------------------------------------

function polygonToSvgPath(polygon: ReadonlyArray<readonly [number, number]>): string {
  if (polygon.length < 3) throw new Error('Polygon needs at least 3 vertices');

  const parts: Array<string> = [];
  for (let i = 0; i < polygon.length; i++) {
    const [lng, lat] = polygon[i];
    const x = Math.round(lng * 10) / 10;
    const y = Math.round(-lat * 10) / 10;
    parts.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

// ------------------------------------------------------------------
// Mountain range data
// ------------------------------------------------------------------

const RANGES: ReadonlyArray<MountainRange> = [
  // ======================== ASIA (20) ========================
  {
    id: 'himalayas',
    name: 'Himalayas',
    nameAlternates: 'Himalaya|The Himalayas',
    continent: 'Asia',
    polygon: [[73.5, 35.5], [77.0, 36.5], [80.0, 35.0], [83.0, 33.0], [86.0, 29.5], [88.5, 28.0], [90.5, 27.5], [93.0, 27.5], [95.5, 28.0], [97.0, 28.5], [95.0, 29.5], [92.0, 28.5], [88.0, 29.0], [85.0, 30.5], [82.0, 32.0], [79.0, 34.0], [76.0, 35.5]],
    latitude: 28.5,
    longitude: 84.0,
    peakElevationM: 8849,
    lengthKm: 2400,
    areaKm2: 595000,
    highestPeak: 'Everest',
  },
  {
    id: 'karakoram',
    name: 'Karakoram',
    nameAlternates: 'Karakorum',
    continent: 'Asia',
    polygon: [[74.5, 37.5], [76.0, 37.0], [77.5, 36.5], [79.0, 36.0], [79.5, 35.5], [78.5, 35.0], [77.0, 35.0], [75.5, 35.5], [74.0, 36.5]],
    latitude: 36.0,
    longitude: 76.5,
    peakElevationM: 8611,
    lengthKm: 500,
    areaKm2: 77000,
    highestPeak: 'K2',
  },
  {
    id: 'hindu-kush',
    name: 'Hindu Kush',
    nameAlternates: 'Hindukush',
    continent: 'Asia',
    polygon: [[66.5, 34.5], [68.0, 35.5], [70.0, 36.5], [72.0, 37.0], [73.5, 36.5], [74.5, 36.0], [73.0, 35.0], [71.0, 34.5], [69.0, 33.5], [67.0, 33.5]],
    latitude: 35.5,
    longitude: 70.5,
    peakElevationM: 7708,
    lengthKm: 800,
    areaKm2: 115000,
    highestPeak: 'Tirich Mir',
  },
  {
    id: 'pamir-mountains',
    name: 'Pamir Mountains',
    nameAlternates: 'Pamirs|Roof of the World',
    continent: 'Asia',
    polygon: [[70.5, 39.5], [72.0, 40.0], [74.0, 39.5], [75.5, 39.0], [75.0, 38.0], [73.5, 37.5], [72.0, 37.5], [70.5, 38.0]],
    latitude: 38.5,
    longitude: 73.0,
    peakElevationM: 7495,
    lengthKm: 400,
    areaKm2: 120000,
    highestPeak: 'Ismoil Somoni Peak',
  },
  {
    id: 'tian-shan',
    name: 'Tian Shan',
    nameAlternates: 'Tien Shan|Celestial Mountains',
    continent: 'Asia',
    polygon: [[69.0, 43.5], [72.0, 43.0], [75.0, 42.5], [78.0, 42.0], [80.5, 42.5], [83.0, 43.0], [86.0, 43.5], [88.0, 43.0], [90.0, 42.0], [88.5, 41.0], [86.0, 41.5], [83.0, 41.0], [80.0, 40.5], [77.0, 40.5], [74.0, 40.5], [71.0, 41.0], [69.0, 42.0]],
    latitude: 42.0,
    longitude: 80.0,
    peakElevationM: 7439,
    lengthKm: 2500,
    areaKm2: 450000,
    highestPeak: 'Jengish Chokusu',
  },
  {
    id: 'kunlun-mountains',
    name: 'Kunlun Mountains',
    nameAlternates: 'Kunlun Shan|Kunlun Range',
    continent: 'Asia',
    polygon: [[74.0, 37.5], [77.0, 37.0], [80.0, 36.5], [83.0, 36.0], [86.0, 36.5], [89.0, 36.5], [92.0, 36.0], [95.0, 36.0], [97.0, 35.5], [96.0, 34.5], [93.0, 34.5], [90.0, 35.0], [87.0, 35.0], [84.0, 35.0], [81.0, 35.5], [78.0, 35.5], [75.0, 36.0]],
    latitude: 35.5,
    longitude: 85.0,
    peakElevationM: 7167,
    lengthKm: 3000,
    areaKm2: 340000,
    highestPeak: 'Liushi Shan',
  },
  {
    id: 'altai-mountains',
    name: 'Altai Mountains',
    nameAlternates: 'Altay Mountains',
    continent: 'Asia',
    polygon: [[83.0, 51.5], [85.0, 51.0], [87.0, 50.5], [89.0, 49.5], [90.5, 48.5], [91.0, 47.5], [90.0, 47.0], [88.0, 47.5], [86.0, 48.5], [84.0, 49.5], [82.5, 50.5]],
    latitude: 49.0,
    longitude: 87.0,
    peakElevationM: 4506,
    lengthKm: 2000,
    areaKm2: 300000,
    highestPeak: 'Belukha',
  },
  {
    id: 'ural-mountains',
    name: 'Ural Mountains',
    nameAlternates: 'Urals|Ural Range',
    continent: 'Asia',
    polygon: [[57.0, 68.0], [60.0, 68.5], [62.0, 66.0], [63.0, 63.0], [61.0, 60.0], [60.5, 57.0], [59.5, 54.0], [58.0, 51.5], [56.0, 51.0], [55.0, 53.0], [56.0, 56.0], [57.0, 59.0], [58.0, 62.0], [57.5, 65.0]],
    latitude: 60.0,
    longitude: 59.0,
    peakElevationM: 1895,
    lengthKm: 2500,
    areaKm2: 220000,
    highestPeak: 'Mount Narodnaya',
  },
  {
    id: 'caucasus',
    name: 'Caucasus',
    nameAlternates: 'Caucasus Mountains|Greater Caucasus',
    continent: 'Asia',
    polygon: [[36.5, 44.5], [38.5, 44.0], [40.5, 43.5], [42.5, 42.5], [44.5, 42.0], [46.5, 41.5], [48.5, 41.5], [50.0, 41.0], [49.5, 40.5], [47.5, 41.0], [45.0, 41.5], [43.0, 42.0], [41.0, 43.0], [39.0, 43.5], [37.0, 43.5]],
    latitude: 42.5,
    longitude: 43.5,
    peakElevationM: 5642,
    lengthKm: 1200,
    areaKm2: 160000,
    highestPeak: 'Mount Elbrus',
  },
  {
    id: 'zagros-mountains',
    name: 'Zagros Mountains',
    nameAlternates: 'Zagros Range',
    continent: 'Asia',
    polygon: [[44.5, 37.0], [46.0, 36.5], [47.5, 35.5], [48.5, 34.0], [49.5, 33.0], [50.5, 32.0], [51.5, 30.5], [53.0, 29.0], [54.5, 28.0], [55.0, 27.0], [54.0, 27.0], [52.0, 28.5], [50.0, 30.0], [48.5, 31.5], [47.0, 33.0], [46.0, 34.5], [44.5, 36.0]],
    latitude: 32.0,
    longitude: 49.0,
    peakElevationM: 4409,
    lengthKm: 1600,
    areaKm2: 240000,
    highestPeak: 'Dena',
  },
  {
    id: 'elburz-mountains',
    name: 'Elburz Mountains',
    nameAlternates: 'Alborz|Alborz Mountains',
    continent: 'Asia',
    polygon: [[48.5, 37.0], [50.0, 37.0], [51.5, 36.5], [53.0, 36.5], [54.5, 36.0], [56.0, 35.5], [55.5, 35.0], [53.5, 35.5], [51.5, 35.5], [49.5, 36.0], [48.0, 36.5]],
    latitude: 36.0,
    longitude: 52.0,
    peakElevationM: 5610,
    lengthKm: 900,
    areaKm2: 60000,
    highestPeak: 'Damavand',
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats',
    nameAlternates: 'Sahyadri|Western Ghat Mountains',
    continent: 'Asia',
    polygon: [[73.0, 21.0], [74.0, 20.0], [74.5, 18.0], [75.0, 16.0], [76.0, 14.0], [76.5, 12.0], [77.0, 10.0], [77.5, 8.5], [76.5, 8.5], [76.0, 10.0], [75.5, 12.0], [75.0, 14.0], [74.0, 16.0], [73.5, 18.0], [73.0, 20.0], [72.5, 21.0]],
    latitude: 14.0,
    longitude: 75.0,
    peakElevationM: 2695,
    lengthKm: 1600,
    areaKm2: 160000,
    highestPeak: 'Anamudi',
  },
  {
    id: 'eastern-ghats',
    name: 'Eastern Ghats',
    nameAlternates: 'Eastern Ghat Mountains',
    continent: 'Asia',
    polygon: [[80.0, 20.0], [81.0, 19.0], [81.5, 17.5], [82.0, 16.0], [80.5, 14.5], [79.5, 13.0], [78.5, 12.0], [78.0, 11.5], [77.5, 12.0], [78.0, 13.5], [79.0, 15.0], [79.5, 17.0], [80.0, 18.5]],
    latitude: 15.5,
    longitude: 79.5,
    peakElevationM: 1680,
    lengthKm: 1300,
    areaKm2: 75000,
    highestPeak: 'Jindhagada Peak',
  },
  {
    id: 'japanese-alps',
    name: 'Japanese Alps',
    nameAlternates: 'Nihon Alps',
    continent: 'Asia',
    polygon: [[137.0, 37.0], [137.5, 36.8], [138.0, 36.5], [138.2, 36.0], [138.0, 35.5], [137.5, 35.5], [137.0, 35.8], [136.8, 36.2], [136.8, 36.7]],
    latitude: 36.2,
    longitude: 137.5,
    peakElevationM: 3190,
    lengthKm: 200,
    areaKm2: 12000,
    highestPeak: 'Mount Hotaka',
  },
  {
    id: 'altun-mountains',
    name: 'Altun Mountains',
    nameAlternates: 'Altun Shan|Astin Tagh',
    continent: 'Asia',
    polygon: [[85.0, 39.5], [87.0, 39.0], [89.0, 38.5], [91.0, 38.0], [92.5, 37.5], [91.5, 37.0], [89.5, 37.5], [87.5, 38.0], [85.5, 38.5]],
    latitude: 38.0,
    longitude: 88.5,
    peakElevationM: 6161,
    lengthKm: 800,
    areaKm2: 60000,
    highestPeak: 'Ulugh Muztagh',
  },
  {
    id: 'hengduan-mountains',
    name: 'Hengduan Mountains',
    nameAlternates: 'Hengduan Shan',
    continent: 'Asia',
    polygon: [[97.0, 32.0], [98.5, 31.5], [100.0, 30.5], [101.0, 29.0], [101.5, 27.5], [101.0, 26.0], [100.0, 25.5], [99.0, 26.5], [98.0, 28.0], [97.0, 29.5], [96.5, 31.0]],
    latitude: 28.5,
    longitude: 99.0,
    peakElevationM: 7556,
    lengthKm: 900,
    areaKm2: 125000,
    highestPeak: 'Minya Konka',
  },
  {
    id: 'stanovoy-range',
    name: 'Stanovoy Range',
    nameAlternates: 'Stanovoi Range|Stanovoy Mountains',
    continent: 'Asia',
    polygon: [[121.0, 57.0], [124.0, 57.5], [127.0, 57.0], [130.0, 56.5], [133.0, 56.0], [132.0, 55.0], [129.0, 55.5], [126.0, 55.5], [123.0, 56.0], [120.5, 56.0]],
    latitude: 56.0,
    longitude: 127.0,
    peakElevationM: 2412,
    lengthKm: 700,
    areaKm2: 95000,
    highestPeak: 'Stanovoy Peak',
  },
  {
    id: 'verkhoyansk-range',
    name: 'Verkhoyansk Range',
    nameAlternates: 'Verkhoyansk Mountains',
    continent: 'Asia',
    polygon: [[127.0, 68.0], [129.0, 67.5], [131.0, 66.0], [133.0, 64.0], [134.0, 62.0], [133.5, 60.0], [132.0, 60.5], [130.0, 62.0], [128.5, 64.0], [127.0, 66.0], [126.0, 67.5]],
    latitude: 64.0,
    longitude: 130.0,
    peakElevationM: 2389,
    lengthKm: 1200,
    areaKm2: 180000,
    highestPeak: 'Mus-Khaya',
  },
  {
    id: 'chersky-range',
    name: 'Chersky Range',
    nameAlternates: 'Chersky Mountains|Cherskiy Range',
    continent: 'Asia',
    polygon: [[137.0, 66.0], [139.5, 65.5], [142.0, 65.0], [144.5, 64.0], [147.0, 63.5], [149.0, 63.0], [148.0, 62.0], [145.5, 62.5], [143.0, 63.5], [140.5, 64.5], [138.0, 65.0], [136.0, 65.5]],
    latitude: 64.0,
    longitude: 143.0,
    peakElevationM: 3003,
    lengthKm: 1500,
    areaKm2: 220000,
    highestPeak: 'Pobeda Peak',
  },
  {
    id: 'sikhote-alin',
    name: 'Sikhote-Alin',
    nameAlternates: 'Sikhote Alin Mountains',
    continent: 'Asia',
    polygon: [[134.0, 48.5], [135.5, 48.0], [136.5, 47.0], [137.0, 46.0], [137.5, 45.0], [137.0, 44.0], [136.0, 43.5], [135.0, 44.0], [134.0, 45.0], [133.5, 46.5], [133.5, 47.5]],
    latitude: 46.0,
    longitude: 135.5,
    peakElevationM: 2090,
    lengthKm: 1200,
    areaKm2: 116000,
    highestPeak: 'Gora Tordoki-Yani',
  },

  // ======================== EUROPE (12) ========================
  {
    id: 'alps',
    name: 'Alps',
    nameAlternates: 'European Alps|The Alps',
    continent: 'Europe',
    polygon: [[5.5, 48.0], [7.0, 47.5], [9.0, 47.5], [10.5, 47.5], [12.0, 47.5], [13.5, 47.0], [15.0, 46.5], [16.0, 46.0], [15.5, 45.5], [13.5, 46.0], [11.5, 46.5], [9.5, 46.0], [8.0, 45.5], [6.5, 44.0], [5.5, 44.5], [5.0, 46.0], [5.0, 47.5]],
    latitude: 46.5,
    longitude: 10.0,
    peakElevationM: 4809,
    lengthKm: 1200,
    areaKm2: 200000,
    highestPeak: 'Mont Blanc',
  },
  {
    id: 'pyrenees',
    name: 'Pyrenees',
    nameAlternates: 'Pirineos|Pyrenees Mountains',
    continent: 'Europe',
    polygon: [[-1.8, 43.5], [-0.5, 43.2], [0.5, 43.0], [1.5, 42.8], [2.5, 42.5], [3.2, 42.5], [3.2, 42.2], [2.0, 42.2], [0.5, 42.3], [-0.5, 42.5], [-1.5, 42.8], [-1.8, 43.0]],
    latitude: 42.7,
    longitude: 0.7,
    peakElevationM: 3404,
    lengthKm: 491,
    areaKm2: 55000,
    highestPeak: 'Aneto',
  },
  {
    id: 'carpathians',
    name: 'Carpathians',
    nameAlternates: 'Carpathian Mountains',
    continent: 'Europe',
    polygon: [[17.0, 49.5], [19.0, 49.5], [21.0, 49.0], [23.0, 48.5], [24.5, 47.5], [26.0, 46.5], [26.5, 45.5], [25.5, 45.0], [24.5, 45.5], [23.5, 46.0], [22.0, 47.0], [20.0, 47.5], [18.5, 48.5], [17.0, 49.0]],
    latitude: 47.5,
    longitude: 22.0,
    peakElevationM: 2655,
    lengthKm: 1500,
    areaKm2: 190000,
    highestPeak: 'Gerlach',
  },
  {
    id: 'scandinavian-mountains',
    name: 'Scandinavian Mountains',
    nameAlternates: 'Scandes|Scandinavian Range',
    continent: 'Europe',
    polygon: [[5.0, 62.5], [7.0, 63.0], [10.0, 64.0], [13.0, 66.0], [15.0, 67.5], [17.0, 69.0], [19.0, 69.5], [20.0, 69.0], [18.0, 68.0], [16.0, 66.5], [14.0, 64.5], [12.0, 63.0], [9.0, 62.0], [7.5, 61.0], [6.0, 60.5], [5.0, 61.0]],
    latitude: 64.5,
    longitude: 13.0,
    peakElevationM: 2469,
    lengthKm: 1700,
    areaKm2: 230000,
    highestPeak: 'Galdhopiggen',
  },
  {
    id: 'apennines',
    name: 'Apennines',
    nameAlternates: 'Apennine Mountains|Appennini',
    continent: 'Europe',
    polygon: [[8.0, 44.5], [9.5, 44.5], [11.0, 43.5], [12.5, 42.5], [13.5, 42.0], [14.5, 41.5], [15.5, 40.5], [16.0, 39.5], [16.5, 39.0], [16.0, 38.5], [15.5, 39.0], [15.0, 40.0], [14.0, 41.0], [13.0, 42.0], [11.5, 43.0], [10.0, 44.0], [8.5, 44.5]],
    latitude: 42.0,
    longitude: 13.0,
    peakElevationM: 2912,
    lengthKm: 1200,
    areaKm2: 100000,
    highestPeak: 'Corno Grande',
  },
  {
    id: 'dinaric-alps',
    name: 'Dinaric Alps',
    nameAlternates: 'Dinarides|Dinaric Mountains',
    continent: 'Europe',
    polygon: [[13.5, 46.5], [14.5, 46.0], [16.0, 45.0], [17.0, 44.0], [18.0, 43.5], [19.0, 43.0], [19.5, 42.5], [20.0, 42.0], [19.5, 41.5], [18.5, 42.0], [17.5, 43.0], [16.5, 43.5], [15.5, 44.0], [14.0, 45.5], [13.0, 46.0]],
    latitude: 43.5,
    longitude: 17.0,
    peakElevationM: 2694,
    lengthKm: 645,
    areaKm2: 75000,
    highestPeak: 'Maja Jezerca',
  },
  {
    id: 'balkan-mountains',
    name: 'Balkan Mountains',
    nameAlternates: 'Stara Planina|Balkans',
    continent: 'Europe',
    polygon: [[22.0, 43.8], [23.0, 43.5], [24.0, 43.2], [25.0, 43.0], [26.0, 42.8], [27.5, 42.8], [28.5, 42.8], [28.5, 42.3], [27.0, 42.3], [25.5, 42.5], [24.0, 42.5], [22.5, 42.8], [21.5, 43.2]],
    latitude: 42.8,
    longitude: 25.0,
    peakElevationM: 2376,
    lengthKm: 560,
    areaKm2: 40000,
    highestPeak: 'Botev Peak',
  },
  {
    id: 'pindus-mountains',
    name: 'Pindus Mountains',
    nameAlternates: 'Pindos|Pindus Range',
    continent: 'Europe',
    polygon: [[20.5, 40.5], [21.0, 40.0], [21.5, 39.5], [21.5, 39.0], [21.0, 38.5], [20.5, 38.0], [20.0, 38.5], [20.0, 39.0], [20.0, 39.5], [20.0, 40.0]],
    latitude: 39.5,
    longitude: 20.8,
    peakElevationM: 2637,
    lengthKm: 250,
    areaKm2: 18000,
    highestPeak: 'Smolikas',
  },
  {
    id: 'scottish-highlands',
    name: 'Scottish Highlands',
    nameAlternates: 'Highlands|Scottish Highland Mountains',
    continent: 'Europe',
    polygon: [[-6.5, 58.5], [-5.0, 58.5], [-4.0, 58.0], [-3.5, 57.5], [-4.0, 57.0], [-4.5, 56.5], [-5.5, 56.5], [-6.0, 57.0], [-6.5, 57.5]],
    latitude: 57.5,
    longitude: -5.0,
    peakElevationM: 1345,
    lengthKm: 250,
    areaKm2: 26000,
    highestPeak: 'Ben Nevis',
  },
  {
    id: 'sierra-nevada-spain',
    name: 'Sierra Nevada',
    nameAlternates: 'Sierra Nevada Spain',
    continent: 'Europe',
    polygon: [[-3.8, 37.2], [-3.3, 37.2], [-2.8, 37.1], [-2.5, 37.0], [-2.8, 36.8], [-3.3, 36.8], [-3.8, 36.9]],
    latitude: 37.0,
    longitude: -3.2,
    peakElevationM: 3479,
    lengthKm: 80,
    areaKm2: 2100,
    highestPeak: 'Mulhacen',
  },
  {
    id: 'cantabrian-mountains',
    name: 'Cantabrian Mountains',
    nameAlternates: 'Cordillera Cantabrica',
    continent: 'Europe',
    polygon: [[-7.0, 43.5], [-5.5, 43.2], [-4.0, 43.2], [-2.5, 43.0], [-2.5, 42.7], [-4.0, 42.5], [-5.5, 42.5], [-7.0, 42.8]],
    latitude: 43.0,
    longitude: -5.0,
    peakElevationM: 2650,
    lengthKm: 480,
    areaKm2: 36000,
    highestPeak: 'Picos de Europa',
  },
  {
    id: 'rhodope-mountains',
    name: 'Rhodope Mountains',
    nameAlternates: 'Rhodopes|Rodopi',
    continent: 'Europe',
    polygon: [[23.5, 42.0], [24.5, 42.0], [25.5, 41.8], [26.0, 41.5], [25.5, 41.0], [24.5, 41.2], [23.5, 41.5]],
    latitude: 41.5,
    longitude: 24.5,
    peakElevationM: 2191,
    lengthKm: 240,
    areaKm2: 18000,
    highestPeak: 'Golyam Perelik',
  },

  // ======================== NORTH AMERICA (10) ========================
  {
    id: 'rocky-mountains',
    name: 'Rocky Mountains',
    nameAlternates: 'Rockies|The Rockies',
    continent: 'North America',
    polygon: [[-120.0, 60.0], [-117.0, 58.0], [-115.0, 55.0], [-114.0, 52.0], [-112.0, 49.0], [-110.0, 46.0], [-108.0, 43.0], [-107.0, 40.0], [-106.0, 37.0], [-105.5, 35.0], [-107.0, 35.5], [-108.5, 38.0], [-110.0, 41.0], [-112.0, 44.0], [-114.0, 47.0], [-116.0, 50.0], [-118.0, 53.0], [-119.5, 56.0], [-121.0, 59.0]],
    latitude: 47.0,
    longitude: -114.0,
    peakElevationM: 4401,
    lengthKm: 4800,
    areaKm2: 990000,
    highestPeak: 'Mount Elbert',
  },
  {
    id: 'appalachian-mountains',
    name: 'Appalachian Mountains',
    nameAlternates: 'Appalachians|The Appalachians',
    continent: 'North America',
    polygon: [[-69.0, 48.0], [-68.0, 47.0], [-70.0, 45.0], [-72.0, 43.0], [-74.0, 41.0], [-76.0, 39.5], [-78.0, 38.0], [-80.0, 37.0], [-82.0, 36.0], [-84.0, 35.0], [-85.0, 34.5], [-84.0, 34.0], [-82.0, 35.0], [-80.0, 36.0], [-78.0, 37.0], [-76.0, 38.5], [-74.0, 40.0], [-72.0, 42.0], [-70.0, 44.0], [-69.0, 46.5]],
    latitude: 40.0,
    longitude: -77.0,
    peakElevationM: 2037,
    lengthKm: 2400,
    areaKm2: 480000,
    highestPeak: 'Mount Mitchell',
  },
  {
    id: 'sierra-nevada-usa',
    name: 'Sierra Nevada',
    nameAlternates: 'Sierra Nevada USA|Sierras',
    continent: 'North America',
    polygon: [[-121.5, 40.0], [-120.0, 39.5], [-119.0, 38.5], [-118.0, 37.5], [-117.5, 36.5], [-118.0, 35.5], [-119.0, 35.5], [-120.0, 36.5], [-121.0, 37.5], [-121.5, 38.5]],
    latitude: 37.5,
    longitude: -119.5,
    peakElevationM: 4421,
    lengthKm: 640,
    areaKm2: 63000,
    highestPeak: 'Mount Whitney',
  },
  {
    id: 'cascade-range',
    name: 'Cascade Range',
    nameAlternates: 'Cascades|Cascade Mountains',
    continent: 'North America',
    polygon: [[-122.5, 49.0], [-121.5, 48.5], [-121.0, 47.5], [-121.0, 46.5], [-121.5, 45.5], [-122.0, 44.5], [-122.0, 43.5], [-122.5, 42.5], [-122.0, 41.5], [-123.0, 41.5], [-123.0, 42.5], [-123.0, 44.0], [-122.5, 45.5], [-122.5, 47.0], [-123.0, 48.5]],
    latitude: 45.5,
    longitude: -121.8,
    peakElevationM: 4392,
    lengthKm: 1100,
    areaKm2: 85000,
    highestPeak: 'Mount Rainier',
  },
  {
    id: 'alaska-range',
    name: 'Alaska Range',
    nameAlternates: 'Alaska Range Mountains',
    continent: 'North America',
    polygon: [[-154.0, 63.5], [-152.0, 63.5], [-150.0, 63.0], [-148.0, 62.5], [-146.0, 62.0], [-144.0, 61.5], [-144.5, 61.0], [-146.5, 61.5], [-148.5, 62.0], [-150.5, 62.5], [-152.5, 63.0], [-154.5, 63.0]],
    latitude: 62.5,
    longitude: -149.0,
    peakElevationM: 6190,
    lengthKm: 650,
    areaKm2: 78000,
    highestPeak: 'Denali',
  },
  {
    id: 'brooks-range',
    name: 'Brooks Range',
    nameAlternates: 'Brooks Range Mountains',
    continent: 'North America',
    polygon: [[-163.0, 69.0], [-160.0, 68.5], [-157.0, 68.5], [-154.0, 68.5], [-151.0, 68.0], [-148.0, 68.0], [-145.0, 68.5], [-143.0, 69.0], [-145.0, 69.5], [-148.0, 69.0], [-151.0, 69.0], [-154.0, 69.0], [-157.0, 69.5], [-160.0, 69.5]],
    latitude: 68.5,
    longitude: -153.0,
    peakElevationM: 2736,
    lengthKm: 1100,
    areaKm2: 180000,
    highestPeak: 'Mount Isto',
  },
  {
    id: 'coast-mountains',
    name: 'Coast Mountains',
    nameAlternates: 'Coast Range BC',
    continent: 'North America',
    polygon: [[-130.0, 59.0], [-128.5, 58.0], [-127.0, 56.5], [-125.5, 55.0], [-124.5, 53.5], [-123.5, 52.0], [-123.0, 51.0], [-124.0, 51.0], [-125.0, 52.5], [-126.5, 54.0], [-128.0, 55.5], [-129.5, 57.0], [-131.0, 58.5]],
    latitude: 55.0,
    longitude: -126.5,
    peakElevationM: 4042,
    lengthKm: 1600,
    areaKm2: 220000,
    highestPeak: 'Mount Waddington',
  },
  {
    id: 'sierra-madre-occidental',
    name: 'Sierra Madre Occidental',
    nameAlternates: 'Western Sierra Madre',
    continent: 'North America',
    polygon: [[-109.0, 31.0], [-107.5, 29.5], [-106.5, 27.5], [-106.0, 25.5], [-105.5, 23.5], [-105.0, 22.0], [-106.0, 22.0], [-106.5, 24.0], [-107.5, 26.0], [-108.5, 28.0], [-109.5, 30.0], [-110.0, 31.0]],
    latitude: 26.0,
    longitude: -107.0,
    peakElevationM: 3250,
    lengthKm: 1250,
    areaKm2: 190000,
    highestPeak: 'Cerro Mohinora',
  },
  {
    id: 'sierra-madre-oriental',
    name: 'Sierra Madre Oriental',
    nameAlternates: 'Eastern Sierra Madre',
    continent: 'North America',
    polygon: [[-100.5, 28.0], [-99.5, 27.0], [-99.0, 25.5], [-99.0, 24.0], [-99.5, 22.5], [-100.0, 21.0], [-101.0, 21.0], [-100.5, 23.0], [-100.0, 25.0], [-100.5, 26.5], [-101.5, 28.0]],
    latitude: 24.5,
    longitude: -100.0,
    peakElevationM: 3700,
    lengthKm: 1000,
    areaKm2: 130000,
    highestPeak: 'Cerro San Rafael',
  },
  {
    id: 'sierra-madre-del-sur',
    name: 'Sierra Madre del Sur',
    nameAlternates: 'Southern Sierra Madre',
    continent: 'North America',
    polygon: [[-101.0, 18.5], [-100.0, 18.0], [-98.5, 17.5], [-97.0, 16.5], [-96.0, 16.0], [-96.5, 15.5], [-98.0, 16.5], [-99.5, 17.0], [-101.0, 17.5], [-101.5, 18.0]],
    latitude: 17.0,
    longitude: -98.5,
    peakElevationM: 3703,
    lengthKm: 1000,
    areaKm2: 95000,
    highestPeak: 'Cerro Teotepec',
  },

  // ======================== SOUTH AMERICA (8) ========================
  {
    id: 'andes',
    name: 'Andes',
    nameAlternates: 'Andes Mountains|Cordillera de los Andes',
    continent: 'South America',
    polygon: [[-75.5, 11.0], [-73.0, 8.0], [-72.0, 5.0], [-76.0, 2.0], [-79.0, -1.0], [-79.5, -4.0], [-78.0, -8.0], [-76.0, -11.0], [-72.0, -15.0], [-69.0, -18.0], [-68.0, -22.0], [-67.0, -27.0], [-69.0, -32.0], [-70.0, -37.0], [-71.5, -42.0], [-73.0, -46.0], [-74.0, -50.0], [-73.0, -54.0], [-71.0, -53.0], [-72.0, -48.0], [-71.5, -44.0], [-70.5, -39.0], [-68.0, -34.0], [-66.0, -28.0], [-66.0, -23.0], [-67.5, -18.0], [-69.5, -14.0], [-74.0, -10.0], [-76.5, -6.0], [-78.0, -2.0], [-77.5, 1.0], [-75.0, 4.0], [-74.0, 7.0], [-76.5, 10.0]],
    latitude: -18.0,
    longitude: -70.0,
    peakElevationM: 6961,
    lengthKm: 7000,
    areaKm2: 3370000,
    highestPeak: 'Aconcagua',
  },
  {
    id: 'serra-do-mar',
    name: 'Serra do Mar',
    nameAlternates: 'Sea Mountain Range',
    continent: 'South America',
    polygon: [[-43.5, -22.5], [-44.0, -23.0], [-45.0, -23.5], [-46.5, -24.0], [-48.0, -25.0], [-49.0, -26.0], [-49.5, -27.5], [-49.0, -28.0], [-48.0, -27.0], [-47.0, -25.5], [-45.5, -24.0], [-44.5, -23.0], [-43.5, -22.0]],
    latitude: -25.0,
    longitude: -47.0,
    peakElevationM: 2316,
    lengthKm: 1500,
    areaKm2: 52000,
    highestPeak: 'Pico Parana',
  },
  {
    id: 'serra-da-mantiqueira',
    name: 'Serra da Mantiqueira',
    nameAlternates: 'Mantiqueira Mountains',
    continent: 'South America',
    polygon: [[-42.5, -21.5], [-43.5, -22.0], [-44.5, -22.5], [-45.5, -22.5], [-46.5, -23.0], [-46.5, -23.5], [-45.5, -23.0], [-44.5, -22.8], [-43.5, -22.5], [-42.5, -22.0]],
    latitude: -22.5,
    longitude: -44.5,
    peakElevationM: 2798,
    lengthKm: 500,
    areaKm2: 30000,
    highestPeak: 'Pedra da Mina',
  },
  {
    id: 'guiana-highlands',
    name: 'Guiana Highlands',
    nameAlternates: 'Guiana Shield|Guyana Highlands',
    continent: 'South America',
    polygon: [[-66.0, 7.0], [-63.0, 6.5], [-60.0, 5.5], [-58.0, 5.0], [-60.0, 3.0], [-62.0, 2.0], [-65.0, 2.5], [-67.0, 4.0], [-67.0, 6.0]],
    latitude: 4.5,
    longitude: -63.0,
    peakElevationM: 2810,
    lengthKm: 1300,
    areaKm2: 450000,
    highestPeak: 'Mount Roraima',
  },
  {
    id: 'cordillera-blanca',
    name: 'Cordillera Blanca',
    nameAlternates: 'White Range',
    continent: 'South America',
    polygon: [[-77.8, -8.5], [-77.3, -8.8], [-77.0, -9.2], [-77.0, -9.8], [-77.3, -10.0], [-77.8, -9.8], [-78.0, -9.3], [-78.0, -8.8]],
    latitude: -9.2,
    longitude: -77.5,
    peakElevationM: 6768,
    lengthKm: 180,
    areaKm2: 6500,
    highestPeak: 'Huascaran',
  },
  {
    id: 'cordillera-real',
    name: 'Cordillera Real',
    nameAlternates: 'Royal Range|Cordillera Real Bolivia',
    continent: 'South America',
    polygon: [[-68.5, -15.0], [-68.0, -15.5], [-67.5, -16.0], [-67.0, -16.5], [-67.0, -17.0], [-67.5, -17.5], [-68.0, -17.0], [-68.5, -16.5], [-69.0, -16.0], [-69.0, -15.5]],
    latitude: -16.0,
    longitude: -68.0,
    peakElevationM: 6438,
    lengthKm: 200,
    areaKm2: 10000,
    highestPeak: 'Illimani',
  },
  {
    id: 'sierra-nevada-de-santa-marta',
    name: 'Sierra Nevada de Santa Marta',
    nameAlternates: 'Sierra Nevada Santa Marta',
    continent: 'South America',
    polygon: [[-74.5, 11.5], [-73.5, 11.2], [-73.0, 10.8], [-73.0, 10.3], [-73.5, 10.0], [-74.2, 10.3], [-74.5, 10.8]],
    latitude: 10.7,
    longitude: -73.7,
    peakElevationM: 5775,
    lengthKm: 170,
    areaKm2: 17000,
    highestPeak: 'Pico Cristobal Colon',
  },
  {
    id: 'patagonian-andes',
    name: 'Patagonian Andes',
    nameAlternates: 'Andes Patagonicos',
    continent: 'South America',
    polygon: [[-73.0, -40.5], [-72.0, -41.5], [-71.5, -43.0], [-72.0, -44.5], [-72.5, -46.0], [-73.5, -47.5], [-74.0, -49.0], [-74.5, -50.5], [-74.0, -51.5], [-73.0, -50.5], [-72.5, -48.5], [-72.0, -46.5], [-71.5, -44.5], [-71.5, -43.0], [-72.0, -41.5], [-72.5, -40.5]],
    latitude: -45.5,
    longitude: -72.5,
    peakElevationM: 3405,
    lengthKm: 1200,
    areaKm2: 240000,
    highestPeak: 'Monte San Valentin',
  },

  // ======================== AFRICA (8) ========================
  {
    id: 'atlas-mountains',
    name: 'Atlas Mountains',
    nameAlternates: 'Atlas Range|The Atlas',
    continent: 'Africa',
    polygon: [[-9.0, 35.0], [-7.0, 34.5], [-5.0, 34.0], [-3.0, 34.5], [-1.0, 35.0], [1.0, 35.5], [3.0, 35.5], [5.0, 36.0], [7.0, 36.5], [9.0, 35.5], [8.5, 34.5], [6.5, 34.0], [4.5, 34.0], [2.5, 34.0], [0.5, 33.5], [-1.5, 32.5], [-3.5, 31.5], [-5.5, 31.0], [-7.5, 31.0], [-9.5, 31.5], [-10.0, 33.0]],
    latitude: 33.5,
    longitude: -1.0,
    peakElevationM: 4167,
    lengthKm: 2500,
    areaKm2: 775000,
    highestPeak: 'Toubkal',
  },
  {
    id: 'ethiopian-highlands',
    name: 'Ethiopian Highlands',
    nameAlternates: 'Ethiopian Plateau|Abyssinian Highlands',
    continent: 'Africa',
    polygon: [[35.0, 15.0], [37.0, 14.5], [39.0, 13.5], [40.5, 12.0], [42.0, 10.0], [42.0, 8.0], [40.0, 6.5], [38.0, 7.0], [36.0, 8.0], [34.5, 9.5], [34.0, 11.0], [34.0, 13.0]],
    latitude: 10.5,
    longitude: 38.0,
    peakElevationM: 4550,
    lengthKm: 1000,
    areaKm2: 530000,
    highestPeak: 'Ras Dashen',
  },
  {
    id: 'rwenzori-mountains',
    name: 'Rwenzori Mountains',
    nameAlternates: 'Ruwenzori|Mountains of the Moon',
    continent: 'Africa',
    polygon: [[29.5, 0.8], [30.0, 0.5], [30.2, 0.1], [30.2, -0.3], [30.0, -0.5], [29.5, -0.3], [29.3, 0.1], [29.3, 0.5]],
    latitude: 0.2,
    longitude: 29.8,
    peakElevationM: 5109,
    lengthKm: 120,
    areaKm2: 4000,
    highestPeak: 'Mount Stanley',
  },
  {
    id: 'drakensberg',
    name: 'Drakensberg',
    nameAlternates: 'Drakensberg Mountains|uKhahlamba',
    continent: 'Africa',
    polygon: [[27.0, -28.5], [28.0, -29.0], [29.0, -29.5], [29.5, -30.0], [30.0, -30.5], [29.5, -31.0], [29.0, -31.5], [28.5, -31.0], [28.0, -30.5], [27.5, -30.0], [27.0, -29.5]],
    latitude: -29.5,
    longitude: 28.5,
    peakElevationM: 3482,
    lengthKm: 1000,
    areaKm2: 60000,
    highestPeak: 'Thabana Ntlenyana',
  },
  {
    id: 'hoggar-mountains',
    name: 'Hoggar Mountains',
    nameAlternates: 'Ahaggar|Ahaggar Mountains',
    continent: 'Africa',
    polygon: [[4.0, 24.5], [5.5, 24.0], [7.0, 23.5], [7.0, 22.5], [6.0, 22.0], [4.5, 22.0], [3.5, 22.5], [3.5, 23.5]],
    latitude: 23.0,
    longitude: 5.5,
    peakElevationM: 2918,
    lengthKm: 500,
    areaKm2: 55000,
    highestPeak: 'Mount Tahat',
  },
  {
    id: 'tibesti-mountains',
    name: 'Tibesti Mountains',
    nameAlternates: 'Tibesti Massif',
    continent: 'Africa',
    polygon: [[15.5, 22.0], [17.0, 22.0], [18.5, 21.5], [19.0, 20.5], [18.5, 19.5], [17.0, 19.5], [15.5, 20.0], [15.0, 21.0]],
    latitude: 21.0,
    longitude: 17.0,
    peakElevationM: 3445,
    lengthKm: 300,
    areaKm2: 100000,
    highestPeak: 'Emi Koussi',
  },
  {
    id: 'cameroon-highlands',
    name: 'Cameroon Highlands',
    nameAlternates: 'Cameroon Line|Cameroon Volcanic Line',
    continent: 'Africa',
    polygon: [[8.5, 7.5], [9.5, 7.0], [10.5, 6.5], [11.0, 6.0], [10.5, 5.5], [9.5, 5.0], [9.0, 4.0], [8.5, 4.5], [9.0, 5.5], [9.5, 6.0], [8.5, 6.5]],
    latitude: 6.0,
    longitude: 9.5,
    peakElevationM: 4095,
    lengthKm: 500,
    areaKm2: 45000,
    highestPeak: 'Mount Cameroon',
  },
  {
    id: 'east-african-rift-mountains',
    name: 'East African Rift Mountains',
    nameAlternates: 'East African Mountains|Rift Valley Mountains',
    continent: 'Africa',
    polygon: [[34.0, 2.0], [35.5, 1.0], [37.0, 0.0], [38.0, -1.5], [37.5, -3.0], [36.5, -4.5], [35.5, -5.0], [34.5, -4.0], [35.0, -2.5], [35.5, -1.0], [34.5, 0.5], [33.5, 1.5]],
    latitude: -1.5,
    longitude: 36.0,
    peakElevationM: 5895,
    lengthKm: 800,
    areaKm2: 120000,
    highestPeak: 'Kilimanjaro',
  },

  // ======================== OCEANIA (5) ========================
  {
    id: 'great-dividing-range',
    name: 'Great Dividing Range',
    nameAlternates: 'Great Divide|Eastern Highlands Australia',
    continent: 'Oceania',
    polygon: [[142.5, -14.0], [144.0, -16.0], [146.0, -18.0], [147.5, -20.0], [149.0, -23.0], [150.0, -25.5], [151.0, -28.0], [151.5, -30.0], [150.5, -32.0], [149.5, -34.0], [148.5, -36.0], [147.5, -37.5], [146.5, -37.5], [147.0, -36.0], [148.5, -33.5], [149.5, -31.0], [149.5, -28.5], [149.0, -26.0], [148.0, -23.5], [146.5, -21.0], [145.0, -18.5], [143.0, -16.5], [141.5, -14.5]],
    latitude: -26.0,
    longitude: 148.0,
    peakElevationM: 2228,
    lengthKm: 3500,
    areaKm2: 520000,
    highestPeak: 'Kosciuszko',
  },
  {
    id: 'southern-alps-nz',
    name: 'Southern Alps',
    nameAlternates: 'Ka Tiritiri o te Moana|New Zealand Alps',
    continent: 'Oceania',
    polygon: [[168.5, -42.5], [169.5, -43.0], [170.5, -43.5], [171.5, -44.0], [172.0, -44.5], [171.0, -45.0], [170.0, -44.5], [169.0, -44.0], [168.0, -43.5], [167.5, -43.0]],
    latitude: -43.5,
    longitude: 170.0,
    peakElevationM: 3724,
    lengthKm: 500,
    areaKm2: 36000,
    highestPeak: 'Aoraki/Mount Cook',
  },
  {
    id: 'maoke-mountains',
    name: 'Maoke Mountains',
    nameAlternates: 'Sudirman Range|Snow Mountains',
    continent: 'Oceania',
    polygon: [[136.0, -3.5], [137.0, -3.8], [138.0, -4.0], [139.0, -4.2], [140.0, -4.5], [140.5, -5.0], [139.5, -5.2], [138.0, -5.0], [136.5, -4.5], [135.5, -4.0]],
    latitude: -4.2,
    longitude: 138.0,
    peakElevationM: 4884,
    lengthKm: 600,
    areaKm2: 50000,
    highestPeak: 'Puncak Jaya',
  },
  {
    id: 'owen-stanley-range',
    name: 'Owen Stanley Range',
    nameAlternates: 'Owen Stanley Mountains',
    continent: 'Oceania',
    polygon: [[147.0, -7.0], [147.8, -7.5], [148.5, -8.0], [149.0, -8.5], [149.5, -9.0], [149.0, -9.5], [148.0, -9.0], [147.0, -8.5], [146.5, -8.0], [146.5, -7.5]],
    latitude: -8.0,
    longitude: 148.0,
    peakElevationM: 4072,
    lengthKm: 300,
    areaKm2: 25000,
    highestPeak: 'Mount Victoria',
  },
  {
    id: 'central-range-taiwan',
    name: 'Central Range',
    nameAlternates: 'Central Mountain Range|Taiwan Central Range',
    continent: 'Oceania',
    polygon: [[120.5, 25.0], [121.2, 24.5], [121.5, 24.0], [121.5, 23.5], [121.3, 23.0], [121.0, 22.5], [120.5, 23.0], [120.3, 23.5], [120.3, 24.0], [120.3, 24.5]],
    latitude: 23.5,
    longitude: 121.0,
    peakElevationM: 3952,
    lengthKm: 340,
    areaKm2: 11000,
    highestPeak: 'Jade Mountain',
  },
];

// ------------------------------------------------------------------
// CSV generation
// ------------------------------------------------------------------

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('|') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rangeToCSVRow(range: MountainRange, refinedLat: number, refinedLng: number): string {
  const path = polygonToSvgPath(range.polygon);
  const fields = [
    range.id,
    escapeCSVField(range.name),
    escapeCSVField(range.nameAlternates),
    range.continent,
    escapeCSVField(path),
    refinedLat.toFixed(1),
    refinedLng.toFixed(1),
    String(range.peakElevationM),
    String(range.lengthKm),
    String(range.areaKm2),
    escapeCSVField(range.highestPeak),
  ];
  return fields.join(',');
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main(): Promise<void> {
  const sourcePath = resolve('scripts/source-data/ETOPO_2022_v1_60s_N90W180_surface.tif');
  console.log(`Reading DEM from ${sourcePath}...`);

  const tiff = await fromFile(sourcePath);
  const image = await tiff.getImage();
  const demWidth = image.getWidth();
  const demHeight = image.getHeight();
  console.log(`DEM size: ${demWidth} x ${demHeight}`);

  const header = 'id,name,name_alternates,continent,paths,latitude,longitude,peak_elevation_m,length_km,area_km2,highest_peak';
  const rows: Array<string> = [header];

  let lowElevationWarnings = 0;

  for (const range of RANGES) {
    const refined = await refineCentroid(image, demWidth, demHeight, range.longitude, range.latitude);

    // Use refined centroid if it found meaningfully higher elevation
    const useLat = refined.elevation > 100 ? refined.lat : range.latitude;
    const useLng = refined.elevation > 100 ? refined.lng : range.longitude;

    if (refined.elevation <= 0) {
      console.warn(`  WARNING: ${range.name} centroid appears to be at sea level or underwater (${refined.elevation.toFixed(0)}m)`);
      lowElevationWarnings++;
    } else {
      console.log(`  ${range.name}: centroid elevation ${refined.elevation.toFixed(0)}m at (${useLat.toFixed(1)}, ${useLng.toFixed(1)})`);
    }

    rows.push(rangeToCSVRow(range, useLat, useLng));
  }

  const csv = rows.join('\n') + '\n';

  const outPath = resolve('public/data/mountains/world-mountain-ranges.csv');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, csv, 'utf-8');

  console.log(`\nWrote ${RANGES.length} mountain ranges to ${outPath}`);
  console.log(`CSV size: ${csv.length} bytes`);
  if (lowElevationWarnings > 0) {
    console.warn(`${lowElevationWarnings} range(s) had low-elevation centroid warnings`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
