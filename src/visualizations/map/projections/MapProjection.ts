import type { GeoCoordinates, ViewBoxPosition } from '../../VisualizationElement';

/**
 * Identifier for a supported map projection. The default is `equirectangular`,
 * which maps `(longitude, -latitude)` directly to `(x, y)` in viewBox space.
 *
 * `web-mercator` keeps x linear in longitude but stretches y near the poles
 * (clipped to ±85° to avoid singularities). It is the projection used by
 * almost every web map tile service, so it is visually familiar.
 *
 * `equal-earth` is the Šavrič et al. (2018) projection — an equal-area
 * pseudocylindrical projection where countries keep their relative size.
 */
export type MapProjectionId = 'equirectangular' | 'web-mercator' | 'equal-earth';

/**
 * A map projection converts geographic coordinates (lat/lng degrees) into
 * SVG viewBox coordinates. Implementations should be pure: same input → same
 * output, no shared state.
 *
 * All projections in this app use a y-down convention (north is at smaller y)
 * so they are compatible with SVG's coordinate system.
 */
export interface MapProjection {
  readonly id: MapProjectionId;
  /** Human-readable label shown in the projection dropdown. */
  readonly label: string;
  /** Project a geographic point to a viewBox position. */
  readonly project: (coordinates: GeoCoordinates) => ViewBoxPosition;
}
