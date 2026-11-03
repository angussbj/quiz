import type { MapProjection } from './MapProjection';
import { WRAP_LONGITUDE } from '../projectGeo';

/**
 * Number of samples used to trace each edge of the world boundary.
 * 73 longitude samples = one point every 5°; 37 latitude samples = one
 * point every 5°. Smooth enough for Equal Earth's curves at typical viewport
 * sizes without producing excessive path data.
 */
const LONGITUDE_SAMPLES = 73;
const LATITUDE_SAMPLES = 37;

/**
 * Build an SVG path that traces the world boundary in the projection's viewBox
 * space. The path is a closed shape suitable for filling as the ocean
 * background (or for clipping anything that should stay inside the map).
 *
 * Pseudocylindrical projections (Equal Earth) bulge outward at the equator
 * and narrow toward the poles, so the boundary must sample all four edges of
 * the (lng, lat) world rectangle — not just the parallels at min/max
 * latitude. For projections with straight meridians (equirectangular,
 * Mercator) the result collapses to a rectangle.
 */
export function computeOceanBoundary(projection: MapProjection): string {
  const { min: minLat, max: maxLat } = projection.latitudeRange;
  const startLng = WRAP_LONGITUDE;
  const endLng = WRAP_LONGITUDE + 360;

  const points: Array<{ x: number; y: number }> = [];

  // Top edge: sweep longitude west→east at the northern latitude limit.
  for (let i = 0; i <= LONGITUDE_SAMPLES; i++) {
    const lng = startLng + (endLng - startLng) * (i / LONGITUDE_SAMPLES);
    points.push(projection.project({ longitude: lng, latitude: maxLat }));
  }

  // Right edge: sweep latitude north→south at the eastern longitude limit.
  for (let i = 1; i <= LATITUDE_SAMPLES; i++) {
    const lat = maxLat - (maxLat - minLat) * (i / LATITUDE_SAMPLES);
    points.push(projection.project({ longitude: endLng, latitude: lat }));
  }

  // Bottom edge: sweep longitude east→west at the southern latitude limit.
  for (let i = 1; i <= LONGITUDE_SAMPLES; i++) {
    const lng = endLng - (endLng - startLng) * (i / LONGITUDE_SAMPLES);
    points.push(projection.project({ longitude: lng, latitude: minLat }));
  }

  // Left edge: sweep latitude south→north at the western longitude limit.
  for (let i = 1; i <= LATITUDE_SAMPLES; i++) {
    const lat = minLat + (maxLat - minLat) * (i / LATITUDE_SAMPLES);
    points.push(projection.project({ longitude: startLng, latitude: lat }));
  }

  let d = '';
  for (let i = 0; i < points.length; i++) {
    const command = i === 0 ? 'M' : 'L';
    d += `${command} ${formatCoord(points[i].x)} ${formatCoord(points[i].y)} `;
  }
  d += 'Z';
  return d;
}

function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(3);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}
