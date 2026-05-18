import type { VisualizationElement } from '../../VisualizationElement';
import type { BackgroundPath, LakePath } from '../../VisualizationRendererProps';
import type { BackgroundLabel } from '../BackgroundLabel';
import { isMapElement } from '../MapElement';
import type { MapProjection } from './MapProjection';
import { transformPathCoordinates } from './transformPathCoordinates';

/**
 * Stored coordinates use equirectangular space (`x = longitude, y = -latitude`).
 * This module re-projects them into a different projection's viewBox space at
 * render time.
 *
 * The pipeline is one-way: caller passes equirectangular elements/paths and
 * gets back the same data with viewBox positions re-projected. For
 * `equirectangular`, every helper is an identity pass-through.
 */

/** Re-compute the bounding box from a re-projected path. Returns zeros for empty input. */
function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function reprojectElements(
  elements: ReadonlyArray<VisualizationElement>,
  projection: MapProjection,
): ReadonlyArray<VisualizationElement> {
  if (projection.id === 'equirectangular') return elements;
  return elements.map((el) => {
    if (!isMapElement(el)) return el;
    const center = projection.project(el.geoCoordinates);
    const newPathData = el.svgPathData ? transformPathCoordinates(el.svgPathData, projection) : el.svgPathData;
    const newBounds = el.svgPathData
      ? pathBounds(newPathData)
      : {
          minX: el.viewBoxBounds.minX - el.viewBoxCenter.x + center.x,
          minY: el.viewBoxBounds.minY - el.viewBoxCenter.y + center.y,
          maxX: el.viewBoxBounds.maxX - el.viewBoxCenter.x + center.x,
          maxY: el.viewBoxBounds.maxY - el.viewBoxCenter.y + center.y,
        };
    const newLabelAnchor = el.labelAnchor !== undefined
      ? projection.project({
          longitude: el.labelAnchor.x,
          latitude: -el.labelAnchor.y,
        })
      : undefined;
    return {
      ...el,
      viewBoxCenter: center,
      viewBoxBounds: newBounds,
      svgPathData: newPathData,
      ...(newLabelAnchor ? { labelAnchor: newLabelAnchor } : {}),
    };
  });
}

export function reprojectBackgroundPaths(
  paths: ReadonlyArray<BackgroundPath> | undefined,
  projection: MapProjection,
): ReadonlyArray<BackgroundPath> | undefined {
  if (!paths || projection.id === 'equirectangular') return paths;
  return paths.map((path) => ({
    ...path,
    svgPathData: transformPathCoordinates(path.svgPathData, projection),
  }));
}

export function reprojectLakePaths(
  paths: ReadonlyArray<LakePath> | undefined,
  projection: MapProjection,
): ReadonlyArray<LakePath> | undefined {
  if (!paths || projection.id === 'equirectangular') return paths;
  return paths.map((path) => ({
    ...path,
    svgPathData: transformPathCoordinates(path.svgPathData, projection),
  }));
}

/**
 * Re-project an equirectangular camera rect by projecting the four corners
 * and returning the bounding box of the result. Quiz definitions specify
 * `initialCameraPosition` and `groupFilterCameraPositions` in equirectangular
 * viewBox space; non-equirectangular projections need an equivalent box.
 */
export function reprojectCameraRect(
  rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | undefined,
  projection: MapProjection,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } | undefined {
  if (!rect || projection.id === 'equirectangular') return rect;
  const corners: ReadonlyArray<{ x: number; y: number }> = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const corner of corners) {
    const projected = projection.project({ longitude: corner.x, latitude: -corner.y });
    if (projected.x < minX) minX = projected.x;
    if (projected.y < minY) minY = projected.y;
    if (projected.x > maxX) maxX = projected.x;
    if (projected.y > maxY) maxY = projected.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function reprojectBackgroundLabels(
  labels: ReadonlyArray<BackgroundLabel> | undefined,
  projection: MapProjection,
): ReadonlyArray<BackgroundLabel> | undefined {
  if (!labels || projection.id === 'equirectangular') return labels;
  const reproject = (p: { x: number; y: number }) =>
    projection.project({ longitude: p.x, latitude: -p.y });
  return labels.map((label) => ({
    ...label,
    center: reproject(label.center),
    centers: label.centers.map(reproject),
  }));
}
