import type { MapProjection } from './MapProjection';
import { wrapLng } from '../projectGeo';

/**
 * Equirectangular projection: x = wrapped longitude, y = -latitude.
 * Distance along each axis is proportional to degrees, so this is the
 * canonical "raw" projection used to store path data on disk.
 */
export const equirectangularProjection: MapProjection = {
  id: 'equirectangular',
  label: 'Equirectangular',
  project: (coordinates) => ({
    x: wrapLng(coordinates.longitude),
    y: -coordinates.latitude,
  }),
  latitudeRange: { min: -90, max: 90 },
};
