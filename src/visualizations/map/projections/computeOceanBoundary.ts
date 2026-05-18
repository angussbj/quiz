import type { MapProjection } from './MapProjection';
import { WRAP_LONGITUDE } from '../projectGeo';

/**
 * Number of longitude samples used to trace the top and bottom edges of the
 * world boundary. 73 samples = one point every 5° across 360°, smooth enough
 * for Equal Earth's gentle curve at typical viewport sizes.
 */
const LONGITUDE_SAMPLES = 73;

/**
 * Build an SVG path that traces the world boundary in the projection's viewBox
 * space. The path is a closed shape suitable for filling as the ocean
 * background (or for clipping anything that should stay inside the map).
 *
 * The boundary is sampled at the projection's `latitudeRange` extremes for a
 * range of longitudes, producing the curved top and bottom edges that some
 * pseudocylindrical projections require. For projections with straight
 * meridians (equirectangular, Mercator) this collapses to a rectangle.
 */
export function computeOceanBoundary(projection: MapProjection): string {
  const { min: minLat, max: maxLat } = projection.latitudeRange;
  const startLng = WRAP_LONGITUDE;
  const endLng = WRAP_LONGITUDE + 360;
  const samples = LONGITUDE_SAMPLES;

  const points: Array<{ x: number; y: number }> = [];

  // Top edge: from startLng to endLng at maxLat
  for (let i = 0; i <= samples; i++) {
    const lng = startLng + (endLng - startLng) * (i / samples);
    points.push(projection.project({ longitude: lng, latitude: maxLat }));
  }

  // Bottom edge: from endLng back to startLng at minLat
  for (let i = 0; i <= samples; i++) {
    const lng = endLng - (endLng - startLng) * (i / samples);
    points.push(projection.project({ longitude: lng, latitude: minLat }));
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
