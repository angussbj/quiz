import type { MapProjection } from './MapProjection';
import { WRAP_LONGITUDE } from '../projectGeo';

/**
 * Re-project an SVG path string whose coordinates are stored in equirectangular
 * viewBox space `(x = wrapped longitude, y = -latitude)`.
 *
 * Paths like Antarctica span 360° of longitude and were originally cut at ±180°
 * (the date line). Our map's cut is at WRAP_LONGITUDE (-169°). This function:
 * 1. Splits the path at any large x-jumps (the data's own ±180 cuts)
 * 2. Within each piece, clips at WRAP_LONGITUDE and shifts below-wrap portions +360
 * 3. Projects all resulting pieces through the target projection
 *
 * The path is expected to use absolute M/L/Z commands.
 */
export function transformPathCoordinates(d: string, projection: MapProjection): string {
  if (projection.id === 'equirectangular') return d;

  // Parse the path into sub-paths (split at M commands).
  const subPaths = parseSubPaths(d);
  if (subPaths.length === 0) return d;

  const originallyClosed = /Z\s*$/i.test(d);
  const projectedPieces: Array<string> = [];

  for (const subPath of subPaths) {
    // Step 1: Split at large x-jumps (>180°). These are the data's own
    // antimeridian cuts (e.g. 180 → -180).
    const rawSegments: Array<Array<{ x: number; y: number }>> = [];
    let current: Array<{ x: number; y: number }> = [subPath[0]];
    for (let i = 1; i < subPath.length; i++) {
      if (Math.abs(subPath[i].x - subPath[i - 1].x) > 180) {
        rawSegments.push(current);
        current = [];
      }
      current.push(subPath[i]);
    }
    rawSegments.push(current);

    // Step 2: For each segment, clip at WRAP_LONGITUDE.
    const wasSplit = rawSegments.length > 1;
    for (const segment of rawSegments) {
      const { pieces, wasClipped } = clipSegmentAtWrap(segment);
      for (const piece of pieces) {
        const splitClosure = (wasClipped || wasSplit) && originallyClosed;
        projectedPieces.push(projectPiece(piece, projection, originallyClosed, splitClosure));
      }
    }
  }

  return projectedPieces.join(' ');
}

/**
 * Parse an SVG path string into sub-paths (each starting with M).
 * Returns an array of point arrays.
 */
function parseSubPaths(d: string): Array<Array<{ x: number; y: number }>> {
  const subPaths: Array<Array<{ x: number; y: number }>> = [];
  // Split on M commands (keeping the M with what follows)
  const parts = d.split(/(?=M\s)/i);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const nums = trimmed.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) continue;
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      points.push({ x: parseFloat(nums[i]), y: parseFloat(nums[i + 1]) });
    }
    if (points.length > 0) subPaths.push(points);
  }
  return subPaths;
}

/**
 * Clip a continuous segment at WRAP_LONGITUDE. Points below the cut get
 * shifted +360. Returns one or more pieces, each fully on one side,
 * plus whether clipping actually occurred.
 */
function clipSegmentAtWrap(
  segment: ReadonlyArray<{ x: number; y: number }>,
): { pieces: Array<Array<{ x: number; y: number }>>; wasClipped: boolean } {
  if (segment.length < 2) return { pieces: [segment.slice()], wasClipped: false };

  const hasBelow = segment.some((p) => p.x < WRAP_LONGITUDE);
  if (!hasBelow) return { pieces: [segment.slice()], wasClipped: false };

  const hasAbove = segment.some((p) => p.x >= WRAP_LONGITUDE);
  if (!hasAbove) {
    // Entirely below — just shift everything +360
    return { pieces: [segment.map((p) => ({ x: p.x + 360, y: p.y }))], wasClipped: false };
  }

  // The segment crosses WRAP_LONGITUDE one or more times.
  const pieces: Array<Array<{ x: number; y: number }>> = [];
  let currentPiece: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < segment.length; i++) {
    const p = segment[i];
    const isAbove = p.x >= WRAP_LONGITUDE;

    if (i === 0) {
      currentPiece.push(isAbove ? p : { x: p.x + 360, y: p.y });
      continue;
    }

    const prev = segment[i - 1];
    const prevAbove = prev.x >= WRAP_LONGITUDE;

    if (isAbove === prevAbove) {
      // Same side — continue current piece
      currentPiece.push(isAbove ? p : { x: p.x + 360, y: p.y });
    } else {
      // Crossing WRAP_LONGITUDE — interpolate the boundary point
      const t = (WRAP_LONGITUDE - prev.x) / (p.x - prev.x);
      const crossY = prev.y + t * (p.y - prev.y);

      if (prevAbove) {
        // Crossing from above to below
        currentPiece.push({ x: WRAP_LONGITUDE, y: crossY });
        if (currentPiece.length > 1) pieces.push(currentPiece);
        currentPiece = [{ x: WRAP_LONGITUDE + 360, y: crossY }, { x: p.x + 360, y: p.y }];
      } else {
        // Crossing from below to above
        currentPiece.push({ x: WRAP_LONGITUDE + 360, y: crossY });
        if (currentPiece.length > 1) pieces.push(currentPiece);
        currentPiece = [{ x: WRAP_LONGITUDE, y: crossY }, p];
      }
    }
  }

  if (currentPiece.length > 1) pieces.push(currentPiece);
  return { pieces, wasClipped: true };
}

/**
 * Project a piece of points and emit as an SVG sub-path.
 *
 * @param closed - whether the original path was closed (had Z)
 * @param splitClosure - whether this piece needs the bottom-of-map closure
 *   trick (because it was split by the ±180 data cut or WRAP_LONGITUDE clip)
 */
function projectPiece(
  piece: ReadonlyArray<{ x: number; y: number }>,
  projection: MapProjection,
  closed: boolean,
  splitClosure: boolean,
): string {
  let segment = '';
  for (let i = 0; i < piece.length; i++) {
    const projected = projection.project({ latitude: -piece[i].y, longitude: piece[i].x });
    const cmd = i === 0 ? 'M' : 'L';
    segment += `${cmd} ${formatCoord(projected.x)} ${formatCoord(projected.y)} `;
  }

  if (!splitClosure) {
    return closed ? segment.trim() + ' Z' : segment.trim();
  }

  const first = piece[0];
  const last = piece[piece.length - 1];
  const sameEdge = Math.abs(first.x - last.x) < 1;

  if (sameEdge) {
    return segment.trim() + ' Z';
  }

  // Different edges — close via the bottom of the map.
  const southLat = projection.latitudeRange.min;
  const lastProjected = projection.project({ latitude: southLat, longitude: last.x });
  const firstProjected = projection.project({ latitude: southLat, longitude: first.x });
  segment += `L ${formatCoord(lastProjected.x)} ${formatCoord(lastProjected.y)} `;
  segment += `L ${formatCoord(firstProjected.x)} ${formatCoord(firstProjected.y)} `;

  return segment.trim() + ' Z';
}

function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(4);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}
