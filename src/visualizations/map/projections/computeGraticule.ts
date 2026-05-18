import type { MapProjection } from './MapProjection';
import { WRAP_LONGITUDE } from '../projectGeo';

/** Spacing in degrees between graticule lines. */
const GRID_SPACING_DEG = 15;

/**
 * Number of points used to trace each graticule line. 37 samples = one point
 * every 10° of arc — enough for smooth curves on Equal Earth without
 * producing excessive path data.
 */
const SAMPLES_PER_LINE = 37;

/**
 * Build a single SVG path string with all graticule (latitude/longitude grid)
 * lines for a projection. Latitude lines are drawn as horizontal arcs
 * sweeping the full longitude range; longitude lines as vertical arcs from
 * the projection's southern to northern latitude limit.
 *
 * Lines are sampled and connected with `L` commands, so projections that
 * curve meridians (Equal Earth) get smooth curved meridians, while linear
 * projections (equirectangular, Mercator) collapse to straight lines.
 */
export function computeGraticule(projection: MapProjection): string {
  const { min: minLat, max: maxLat } = projection.latitudeRange;
  const startLng = WRAP_LONGITUDE;
  const endLng = WRAP_LONGITUDE + 360;

  const segments: string[] = [];

  // Latitude lines (parallels) — sweep longitude at each fixed latitude.
  for (let lat = -90; lat <= 90; lat += GRID_SPACING_DEG) {
    if (lat < minLat || lat > maxLat) continue;
    segments.push(traceLine(projection, (t) => ({
      longitude: startLng + (endLng - startLng) * t,
      latitude: lat,
    })));
  }

  // Longitude lines (meridians) — sweep latitude at each fixed longitude.
  for (let lng = startLng; lng <= endLng; lng += GRID_SPACING_DEG) {
    segments.push(traceLine(projection, (t) => ({
      longitude: lng,
      latitude: minLat + (maxLat - minLat) * t,
    })));
  }

  return segments.join(' ');
}

function traceLine(
  projection: MapProjection,
  pointAt: (t: number) => { longitude: number; latitude: number },
): string {
  let d = '';
  for (let i = 0; i <= SAMPLES_PER_LINE; i++) {
    const t = i / SAMPLES_PER_LINE;
    const projected = projection.project(pointAt(t));
    d += `${i === 0 ? 'M' : 'L'} ${formatCoord(projected.x)} ${formatCoord(projected.y)} `;
  }
  return d.trim();
}

function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(3);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}
