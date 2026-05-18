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

function isMapProjectionId(id: string): id is MapProjectionId {
  return id === 'equirectangular' || id === 'web-mercator' || id === 'equal-earth';
}

/**
 * Look up a projection by id. Falls back to equirectangular for unknown ids
 * (e.g. stale persisted state from before a projection was added/removed).
 */
export function getMapProjection(id: string | undefined): MapProjection {
  if (id === undefined || !isMapProjectionId(id)) return equirectangularProjection;
  return PROJECTION_BY_ID[id];
}
