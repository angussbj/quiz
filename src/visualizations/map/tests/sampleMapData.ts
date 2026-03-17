import type { MapElement } from '../MapElement';
import type { BackgroundPath } from '../../VisualizationRendererProps';
import { projectGeo } from '../projectGeo';

/**
 * Sample map elements for testing: 4 European capital cities.
 * ViewBox positions are computed from lat/lng via equirectangular projection.
 */
export const sampleCityElements: ReadonlyArray<MapElement> = [
  {
    id: 'paris',
    label: 'Paris',
    geoCoordinates: { latitude: 48.8566, longitude: 2.3522 },
    viewBoxCenter: projectGeo({ latitude: 48.8566, longitude: 2.3522 }),
    viewBoxBounds: { minX: 2.0522, minY: -49.1566, maxX: 2.6522, maxY: -48.5566 },
    interactive: true,
    group: 'France',
    svgPathData: '',
    code: 'FR',
  },
  {
    id: 'berlin',
    label: 'Berlin',
    geoCoordinates: { latitude: 52.52, longitude: 13.405 },
    viewBoxCenter: projectGeo({ latitude: 52.52, longitude: 13.405 }),
    viewBoxBounds: { minX: 13.105, minY: -52.82, maxX: 13.705, maxY: -52.22 },
    interactive: true,
    group: 'Germany',
    svgPathData: '',
    code: 'DE',
  },
  {
    id: 'madrid',
    label: 'Madrid',
    geoCoordinates: { latitude: 40.4168, longitude: -3.7038 },
    viewBoxCenter: projectGeo({ latitude: 40.4168, longitude: -3.7038 }),
    viewBoxBounds: { minX: -4.0038, minY: -40.7168, maxX: -3.4038, maxY: -40.1168 },
    interactive: true,
    group: 'Spain',
    svgPathData: '',
    code: 'ES',
  },
  {
    id: 'rome',
    label: 'Rome',
    geoCoordinates: { latitude: 41.9028, longitude: 12.4964 },
    viewBoxCenter: projectGeo({ latitude: 41.9028, longitude: 12.4964 }),
    viewBoxBounds: { minX: 12.1964, minY: -42.2028, maxX: 12.7964, maxY: -41.6028 },
    interactive: true,
    group: 'Italy',
    svgPathData: '',
    code: 'IT',
  },
];

/**
 * Simplified country border paths for testing.
 * These are rough outlines in equirectangular viewBox coordinates (lng, -lat).
 */
export const sampleBackgroundPaths: ReadonlyArray<BackgroundPath> = [
  {
    id: 'border-france',
    svgPathData:
      'M -1.8,-48.5 L 2.5,-51.1 L 8.2,-49 L 7.7,-47.4 L 6.2,-43.3 L 3,-42.4 L -1.8,-43.4 L -1.8,-48.5 Z',
    group: 'France',
  },
  {
    id: 'border-germany',
    svgPathData:
      'M 6,-47.3 L 6,-54.8 L 14.7,-54.3 L 15.1,-51 L 13.8,-47.5 L 10.5,-47.3 L 6,-47.3 Z',
    group: 'Germany',
  },
  {
    id: 'border-spain',
    svgPathData:
      'M -9.3,-43.8 L -1.8,-43.4 L 3.3,-42.4 L 4.3,-40.5 L 0.3,-36.2 L -6,-36.7 L -9.5,-37 L -9.3,-43.8 Z',
    group: 'Spain',
  },
  {
    id: 'border-italy',
    svgPathData:
      'M 6.6,-46.7 L 12.3,-47 L 18.5,-40 L 15.5,-38 L 12.4,-37.5 L 9,-40.8 L 7,-43.8 L 6.6,-46.7 Z',
    group: 'Italy',
  },
];
