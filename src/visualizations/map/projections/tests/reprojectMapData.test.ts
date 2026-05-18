import {
  reprojectElements,
  reprojectBackgroundPaths,
  reprojectLakePaths,
  reprojectBackgroundLabels,
  reprojectCameraRect,
} from '../reprojectMapData';
import { equirectangularProjection } from '../equirectangular';
import { webMercatorProjection } from '../webMercator';
import { equalEarthProjection } from '../equalEarth';
import type { MapElement } from '../../MapElement';
import { isMapElement } from '../../MapElement';
import type { BackgroundLabel } from '../../BackgroundLabel';

const cityElement = (overrides: Partial<MapElement> = {}): MapElement => ({
  id: 'paris',
  label: 'Paris',
  geoCoordinates: { latitude: 48.8566, longitude: 2.3522 },
  viewBoxCenter: { x: 2.3522, y: -48.8566 },
  viewBoxBounds: { minX: 2, minY: -49, maxX: 2.7, maxY: -48.7 },
  interactive: true,
  svgPathData: '',
  code: 'fr',
  ...overrides,
});

const polygonElement = (overrides: Partial<MapElement> = {}): MapElement => ({
  id: 'small-country',
  label: 'Smallcountry',
  geoCoordinates: { latitude: 0, longitude: 0 },
  viewBoxCenter: { x: 0, y: 0 },
  viewBoxBounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
  interactive: true,
  svgPathData: 'M -1 -1 L 1 -1 L 1 1 L -1 1 Z',
  code: 'sc',
  ...overrides,
});

describe('reprojectElements', () => {
  it('returns the same array reference for equirectangular', () => {
    const elements = [cityElement()];
    expect(reprojectElements(elements, equirectangularProjection)).toBe(elements);
  });

  it('updates viewBoxCenter for non-equirectangular projections', () => {
    const elements = [cityElement()];
    const result = reprojectElements(elements, webMercatorProjection);
    const projected = result[0];
    if (!isMapElement(projected)) throw new Error('expected map element');
    expect(projected.viewBoxCenter.x).toBeCloseTo(2.3522, 4);
    // y differs from -48.8566 because Mercator stretches latitudes
    expect(projected.viewBoxCenter.y).not.toBeCloseTo(-48.8566, 1);
  });

  it('shifts viewBoxBounds to follow re-projected centers for dot-only elements', () => {
    const elements = [cityElement()];
    const result = reprojectElements(elements, webMercatorProjection);
    const projected = result[0];
    if (!isMapElement(projected)) throw new Error('expected map element');
    // The bounds are translated by the same delta as the center shift.
    const dy = projected.viewBoxCenter.y - (-48.8566);
    expect(projected.viewBoxBounds.minY).toBeCloseTo(-49 + dy, 4);
    expect(projected.viewBoxBounds.maxY).toBeCloseTo(-48.7 + dy, 4);
  });

  it('recomputes viewBoxBounds from re-projected path for polygon elements', () => {
    const elements = [polygonElement()];
    const result = reprojectElements(elements, equalEarthProjection);
    const projected = result[0];
    if (!isMapElement(projected)) throw new Error('expected map element');
    // The new bounds are computed from the re-projected path coordinates,
    // not derived from the equirectangular bounds.
    expect(projected.viewBoxBounds.maxX).toBeGreaterThan(projected.viewBoxBounds.minX);
    expect(projected.viewBoxBounds.maxY).toBeGreaterThan(projected.viewBoxBounds.minY);
    expect(projected.svgPathData).not.toBe(elements[0].svgPathData);
  });

  it('re-projects labelAnchor when present', () => {
    const elements = [polygonElement({ labelAnchor: { x: 90, y: -45 } })];
    const result = reprojectElements(elements, webMercatorProjection);
    const projected = result[0];
    if (!isMapElement(projected)) throw new Error('expected map element');
    expect(projected.labelAnchor?.x).toBeCloseTo(90, 4);
    // y differs because the label anchor was at lat 45 (Mercator stretches it)
    expect(projected.labelAnchor?.y).not.toBeCloseTo(-45, 1);
  });

  it('passes through non-map elements unchanged', () => {
    const nonMap = {
      id: 'cell',
      label: 'Cell',
      viewBoxCenter: { x: 0, y: 0 },
      viewBoxBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      interactive: true,
    };
    const result = reprojectElements([nonMap], webMercatorProjection);
    expect(result[0]).toBe(nonMap);
  });
});

describe('reprojectBackgroundPaths', () => {
  it('returns the same reference for equirectangular', () => {
    const paths = [{ id: 'fr', svgPathData: 'M 0 0 L 10 0 Z' }];
    expect(reprojectBackgroundPaths(paths, equirectangularProjection)).toBe(paths);
  });

  it('returns undefined when input is undefined', () => {
    expect(reprojectBackgroundPaths(undefined, webMercatorProjection)).toBeUndefined();
  });

  it('transforms path data for non-equirectangular projections', () => {
    const paths = [{ id: 'fr', svgPathData: 'M 0 -45 L 10 -45 Z' }];
    const result = reprojectBackgroundPaths(paths, webMercatorProjection);
    expect(result?.[0].svgPathData).not.toBe(paths[0].svgPathData);
    expect(result?.[0].id).toBe('fr');
  });
});

describe('reprojectLakePaths', () => {
  it('returns the same reference for equirectangular', () => {
    const paths = [{ id: 'caspian', svgPathData: 'M 50 -40 L 55 -40 Z' }];
    expect(reprojectLakePaths(paths, equirectangularProjection)).toBe(paths);
  });

  it('transforms path data for non-equirectangular projections', () => {
    const paths = [{ id: 'caspian', svgPathData: 'M 50 -40 L 55 -40 Z' }];
    const result = reprojectLakePaths(paths, equalEarthProjection);
    expect(result?.[0].svgPathData).not.toBe(paths[0].svgPathData);
  });
});

describe('reprojectBackgroundLabels', () => {
  const sampleLabel = (): BackgroundLabel => ({
    id: 'fr',
    name: 'France',
    center: { x: 2, y: -47 },
    centers: [{ x: 2, y: -47 }, { x: 2.5, y: -46 }],
    area: 100,
  });

  it('returns the same reference for equirectangular', () => {
    const labels = [sampleLabel()];
    expect(reprojectBackgroundLabels(labels, equirectangularProjection)).toBe(labels);
  });

  it('re-projects all candidate centers', () => {
    const labels = [sampleLabel()];
    const result = reprojectBackgroundLabels(labels, webMercatorProjection);
    const projected = result?.[0];
    expect(projected?.centers).toHaveLength(2);
    // x stays linear in Mercator at fixed longitude
    expect(projected?.center.x).toBeCloseTo(2, 4);
    expect(projected?.centers[1].x).toBeCloseTo(2.5, 4);
    // y is stretched by Mercator
    expect(projected?.center.y).not.toBeCloseTo(-47, 1);
  });
});

describe('reprojectCameraRect', () => {
  it('returns the same reference for equirectangular', () => {
    const rect = { x: -180, y: -90, width: 360, height: 180 };
    expect(reprojectCameraRect(rect, equirectangularProjection)).toBe(rect);
  });

  it('returns undefined for undefined input', () => {
    expect(reprojectCameraRect(undefined, webMercatorProjection)).toBeUndefined();
  });

  it('produces a bounding box that contains the projected corners', () => {
    const rect = { x: -100, y: -50, width: 200, height: 100 };
    const result = reprojectCameraRect(rect, equalEarthProjection);
    if (!result) throw new Error('expected result');
    const corners = [
      equalEarthProjection.project({ longitude: rect.x, latitude: -rect.y }),
      equalEarthProjection.project({ longitude: rect.x + rect.width, latitude: -rect.y }),
      equalEarthProjection.project({ longitude: rect.x, latitude: -(rect.y + rect.height) }),
      equalEarthProjection.project({ longitude: rect.x + rect.width, latitude: -(rect.y + rect.height) }),
    ];
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(result.x - 1e-6);
      expect(corner.x).toBeLessThanOrEqual(result.x + result.width + 1e-6);
      expect(corner.y).toBeGreaterThanOrEqual(result.y - 1e-6);
      expect(corner.y).toBeLessThanOrEqual(result.y + result.height + 1e-6);
    }
  });
});
