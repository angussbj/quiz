import type { MapElement } from '../MapElement';
import type { BackgroundPath } from '../../VisualizationRendererProps';
import type { BackgroundLabel } from '../BackgroundLabel';
import { projectGeo } from '../projectGeo';
import { computeBackgroundLabels } from '../computeBackgroundLabels';

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
 * Non-overlapping tiles in equirectangular viewBox coordinates (lng, -lat).
 * Arranged as a rough grid covering western/central Europe.
 */
export const sampleBackgroundPaths: ReadonlyArray<BackgroundPath> = [
  {
    id: 'border-france',
    svgPathData: 'M -5 -42 L 5 -42 L 5 -50 L -5 -50 L -5 -42 Z',
    group: 'Western Europe',
    name: 'France',
  },
  {
    id: 'border-germany',
    svgPathData: 'M 5 -42 L 16 -42 L 16 -50 L 5 -50 L 5 -42 Z',
    group: 'Central Europe',
    name: 'Germany',
  },
  {
    id: 'border-spain',
    svgPathData: 'M -10 -34 L -1 -34 L -1 -42 L -10 -42 L -10 -34 Z',
    group: 'Southern Europe',
    name: 'Spain',
  },
  {
    id: 'border-italy',
    svgPathData: 'M 5 -34 L 16 -34 L 16 -42 L 5 -42 L 5 -34 Z',
    group: 'Southern Europe',
    name: 'Italy',
  },
];

/**
 * Extended set of country borders for stories that need all 8 element states.
 * 8 non-overlapping tiles arranged in a 4x2 grid.
 */
/**
 * 8 tiles in a 4x2 grid with shared/touching borders.
 * Wide cells (10 units) so "correct-second" etc. fit without label collision.
 * Grid: 4 columns spanning x=-20..20, 2 rows spanning y=-34..-50.
 */
export const extendedBackgroundPaths: ReadonlyArray<BackgroundPath> = [
  {
    id: 'border-france',
    svgPathData: 'M -20 -34 L -10 -34 L -10 -42 L -20 -42 L -20 -34 Z',
    group: 'Western Europe',
    name: 'correct',
  },
  {
    id: 'border-germany',
    svgPathData: 'M -10 -34 L 0 -34 L 0 -42 L -10 -42 L -10 -34 Z',
    group: 'Central Europe',
    name: 'highlighted',
  },
  {
    id: 'border-spain',
    svgPathData: 'M 0 -34 L 10 -34 L 10 -42 L 0 -42 L 0 -34 Z',
    group: 'Southern Europe',
    name: 'incorrect',
  },
  {
    id: 'border-italy',
    svgPathData: 'M 10 -34 L 20 -34 L 20 -42 L 10 -42 L 10 -34 Z',
    group: 'Southern Europe',
    name: 'missed',
  },
  {
    id: 'border-portugal',
    svgPathData: 'M -20 -42 L -10 -42 L -10 -50 L -20 -50 L -20 -42 Z',
    group: 'Southern Europe',
    name: 'correct-second',
  },
  {
    id: 'border-uk',
    svgPathData: 'M -10 -42 L 0 -42 L 0 -50 L -10 -50 L -10 -42 Z',
    group: 'Western Europe',
    name: 'correct-third',
  },
  {
    id: 'border-switzerland',
    svgPathData: 'M 0 -42 L 10 -42 L 10 -50 L 0 -50 L 0 -42 Z',
    group: 'Central Europe',
    name: 'context',
  },
  {
    id: 'border-belgium',
    svgPathData: 'M 10 -42 L 20 -42 L 20 -50 L 10 -50 L 10 -42 Z',
    group: 'Western Europe',
    name: 'default',
  },
];

/** Background labels computed from the sample border paths. */
export const sampleBackgroundLabels: ReadonlyArray<BackgroundLabel> =
  computeBackgroundLabels(sampleBackgroundPaths);
