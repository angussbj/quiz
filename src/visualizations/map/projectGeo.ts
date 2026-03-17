import type { ViewBoxPosition, GeoCoordinates } from '../VisualizationElement';

/**
 * Equirectangular projection: longitude maps to x, latitude maps to -y.
 * Simple and adequate for regional maps. Distorts at extreme latitudes.
 */
export function projectGeo(coordinates: GeoCoordinates): ViewBoxPosition {
  return {
    x: coordinates.longitude,
    y: -coordinates.latitude,
  };
}
