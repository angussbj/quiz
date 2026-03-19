import type { ViewBoxPosition, GeoCoordinates } from '../VisualizationElement';

/**
 * Default longitude where the map wraps. Everything west of this is
 * shifted +360° so the Pacific Ocean is continuous and Oceania appears
 * together. Set just east of Samoa/Tonga (the easternmost Oceanian capitals).
 */
export const WRAP_LONGITUDE = -169;

/**
 * Normalize a longitude so it falls in the range [wrapAt, wrapAt + 360).
 */
export function wrapLng(longitude: number, wrapAt: number = WRAP_LONGITUDE): number {
  if (longitude < wrapAt) return longitude + 360;
  return longitude;
}

/**
 * Equirectangular projection: longitude maps to x, latitude maps to -y.
 * Longitudes are wrapped so the map cut falls at WRAP_LONGITUDE.
 */
export function projectGeo(coordinates: GeoCoordinates): ViewBoxPosition {
  return {
    x: wrapLng(coordinates.longitude),
    y: -coordinates.latitude,
  };
}

/**
 * Transform x coordinates in an SVG path d string to use the wrapped longitude.
 * Our border paths use only M, L, and Z commands with absolute coordinates.
 * Numbers alternate x, y, x, y... so every even-indexed number is an x value.
 *
 * To avoid horizontal lines from points on opposite sides of the wrap,
 * we first count how many x values in the path would be wrapped vs not.
 * The majority decides: either ALL x values get +360 or NONE do.
 * This means some shapes may span > 360° of longitude, which is fine.
 */
export function wrapPathCoordinates(d: string, wrapAt: number = WRAP_LONGITUDE): string {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers) return d;

  let wrapCount = 0;
  let noWrapCount = 0;
  for (let i = 0; i < numbers.length; i += 2) {
    const x = parseFloat(numbers[i]);
    if (x < wrapAt) {
      wrapCount++;
    } else {
      noWrapCount++;
    }
  }

  if (wrapCount === 0) return d;

  const shouldWrap = wrapCount > noWrapCount;
  if (!shouldWrap) return d;

  let index = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (match) => {
    const isX = index % 2 === 0;
    index++;
    if (isX) {
      const x = parseFloat(match);
      return String(x + 360);
    }
    return match;
  });
}
