import { useMemo, useRef } from 'react';
import type { VisualizationElement } from '../VisualizationElement';
import { isMapElement } from './MapElement';
import { parsePathPoints } from './closestPointOnPath';
import type { ParsedStrokePath } from './findClosestStrokeElement';

interface CacheEntry {
  readonly path: string;
  readonly parsed: ParsedStrokePath;
}

/**
 * Maintains an incrementally-updated cache of pre-parsed SVG path points
 * for stroke-style map elements.
 *
 * Only re-parses paths that have changed (different svgPathData) or are new.
 * Removes entries for elements no longer in the array.
 * The cache is stored in a ref and updated via useMemo when elements change.
 */
export function useStrokePathCache(
  elements: ReadonlyArray<VisualizationElement>,
): ReadonlyArray<ParsedStrokePath> {
  const cacheRef = useRef(new Map<string, CacheEntry>());

  return useMemo(() => {
    const prevCache = cacheRef.current;
    const nextCache = new Map<string, CacheEntry>();

    for (const element of elements) {
      if (!isMapElement(element) || element.pathRenderStyle !== 'stroke') continue;
      const pathData = element.svgPathData;
      if (!pathData) continue;

      const existing = prevCache.get(element.id);
      if (existing && existing.path === pathData) {
        // Path unchanged — reuse cached parsed data
        nextCache.set(element.id, existing);
      } else {
        // New or changed — parse the path
        const points = parsePathPoints(pathData);
        const parsed: ParsedStrokePath = { elementId: element.id, points };
        nextCache.set(element.id, { path: pathData, parsed });
      }
    }

    cacheRef.current = nextCache;
    return [...nextCache.values()].map((entry) => entry.parsed);
  }, [elements]);
}
