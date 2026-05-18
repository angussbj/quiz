import type { MapProjection, MapProjectionId } from './MapProjection';
import { equirectangularProjection } from './equirectangular';
import { webMercatorProjection } from './webMercator';
import { equalEarthProjection } from './equalEarth';

const ALL_PROJECTIONS: ReadonlyArray<MapProjection> = [
  equirectangularProjection,
  webMercatorProjection,
  equalEarthProjection,
];

const PROJECTION_BY_ID: Readonly<Record<MapProjectionId, MapProjection>> = {
  'equirectangular': equirectangularProjection,
  'web-mercator': webMercatorProjection,
  'equal-earth': equalEarthProjection,
};

/** All projections in the order they should appear in the dropdown. */
export const ALL_MAP_PROJECTIONS = ALL_PROJECTIONS;

/**
 * Look up a projection by id. Falls back to equirectangular for unknown ids
 * (e.g. stale persisted state from before a projection was added/removed).
 */
export function getMapProjection(id: string | undefined): MapProjection {
  if (id === undefined) return equirectangularProjection;
  if (id in PROJECTION_BY_ID) {
    return PROJECTION_BY_ID[id as MapProjectionId];
  }
  return equirectangularProjection;
}
