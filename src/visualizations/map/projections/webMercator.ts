import type { MapProjection } from './MapProjection';
import { wrapLng } from '../projectGeo';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** Latitudes near the poles approach infinite y under Mercator. Clip them. */
const MAX_MERCATOR_LATITUDE = 85;

/**
 * Web Mercator projection: x stays linear in longitude; y is the standard
 * Mercator log-tangent latitude transform. Output is scaled so that 1° of
 * longitude at the equator equals 1 viewBox unit, matching the equirectangular
 * projection's units.
 */
export const webMercatorProjection: MapProjection = {
  id: 'web-mercator',
  label: 'Mercator',
  project: (coordinates) => {
    const lat = Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, coordinates.latitude));
    const phi = lat * DEG_TO_RAD;
    const yRad = Math.log(Math.tan(Math.PI / 4 + phi / 2));
    return {
      x: wrapLng(coordinates.longitude),
      y: -yRad * RAD_TO_DEG,
    };
  },
  latitudeRange: { min: -MAX_MERCATOR_LATITUDE, max: MAX_MERCATOR_LATITUDE },
};
