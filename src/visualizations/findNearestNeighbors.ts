import type { VisualizationElement } from './VisualizationElement';

/**
 * Find the n nearest non-focus elements to the focus target's combined-bbox
 * centroid, by Euclidean distance in viewBox coordinates.
 *
 * Distances are measured between viewBoxBounds centers — the same coordinate
 * the framing pass uses. Measuring from viewBoxCenter (e.g. the capital's
 * lat/lng) would pick up e.g. Kiribati as a Marshall Islands neighbor because
 * Tarawa is close, even though Kiribati's polygon extends to the Line Islands
 * on the far side of the map and would blow the framing zoom out.
 *
 * Hidden elements are intentionally included: in modes like locate where most
 * quiz elements start hidden, those hidden elements still mark where the user
 * will eventually need to navigate, so they provide useful framing context.
 *
 * Tie-breaks deterministically by ascending element ID so consecutive calls
 * with identical inputs return identical results.
 */
export function findNearestNeighbors(
  focusIds: ReadonlySet<string>,
  elements: ReadonlyArray<VisualizationElement>,
  n: number,
): ReadonlyArray<string> {
  if (n <= 0 || elements.length === 0) return [];

  const center = focusCentroid(focusIds, elements);
  if (!center) return [];

  const candidates: { id: string; distance: number }[] = [];
  for (const el of elements) {
    if (focusIds.has(el.id)) continue;
    const bx = (el.viewBoxBounds.minX + el.viewBoxBounds.maxX) / 2;
    const by = (el.viewBoxBounds.minY + el.viewBoxBounds.maxY) / 2;
    const dx = bx - center.x;
    const dy = by - center.y;
    candidates.push({ id: el.id, distance: Math.sqrt(dx * dx + dy * dy) });
  }

  candidates.sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return candidates.slice(0, n).map((c) => c.id);
}

function focusCentroid(
  focusIds: ReadonlySet<string>,
  elements: ReadonlyArray<VisualizationElement>,
): { x: number; y: number } | undefined {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const el of elements) {
    if (!focusIds.has(el.id)) continue;
    found = true;
    minX = Math.min(minX, el.viewBoxBounds.minX);
    minY = Math.min(minY, el.viewBoxBounds.minY);
    maxX = Math.max(maxX, el.viewBoxBounds.maxX);
    maxY = Math.max(maxY, el.viewBoxBounds.maxY);
  }
  if (!found) return undefined;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}
