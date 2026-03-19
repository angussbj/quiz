import type { ViewBoxPosition } from '../VisualizationElement';
import type { BackgroundLabel } from './BackgroundLabel';

const BASE_FONT_SIZE = 0.8;
const MIN_VIEWBOX_FONT_SIZE = 0.3;
const MAX_VIEWBOX_FONT_SIZE = 1.2;

const FLAG_HEIGHT_FACTOR = 1.4;
const MAX_DISTANCE_FACTOR = 1.2;
const REDUCED_SIZE_FACTORS = [1, 2 / 3, 1 / 2];
const HIGH_ZOOM_THRESHOLD = 8;

export interface PlacedLabel {
  readonly label: BackgroundLabel;
  readonly fontSize: number;
  readonly flagHeight: number;
  readonly gapSize: number;
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
}

interface LabelDimensions {
  readonly fontSize: number;
  readonly flagHeight: number;
  readonly flagWidth: number;
  readonly hasFlag: boolean;
  readonly textHeight: number;
  readonly gapSize: number;
  readonly width: number;
  readonly height: number;
}

type Rect = { x: number; y: number; w: number; h: number };

/** Build the collision rects (flag + text separately) for a label at a given center position. */
function buildLabelRects(
  cx: number, cy: number, dims: LabelDimensions,
): ReadonlyArray<Rect> {
  const rects: Rect[] = [];
  const lx = cx - dims.width / 2;
  let curY = cy - dims.height / 2;
  if (dims.hasFlag) {
    rects.push({ x: cx - dims.flagWidth / 2, y: curY, w: dims.flagWidth, h: dims.flagHeight });
    curY += dims.flagHeight + dims.gapSize;
  }
  if (dims.textHeight > 0) {
    rects.push({ x: lx, y: curY, w: dims.width, h: dims.textHeight });
  }
  return rects;
}

/** Check if any rect overlaps with any placed rect. */
function hasOverlap(rects: ReadonlyArray<Rect>, placed: ReadonlyArray<Rect>): boolean {
  return rects.some((r) =>
    placed.some((p) =>
      r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y,
    ),
  );
}

/**
 * Try to place a label at (cx, cy). Returns true if placed.
 * If maxDistFromCenters is set, rejects positions where the center (cx, cy)
 * is further than that distance from ALL of the label's center candidates.
 * This prevents labels from drifting far outside their country.
 */
function tryPlace(
  cx: number, cy: number, dims: LabelDimensions, label: BackgroundLabel,
  placed: Rect[], visible: PlacedLabel[],
  maxDistFromCenters?: number,
): boolean {
  if (maxDistFromCenters !== undefined) {
    const withinRange = label.centers.some((center) => {
      const dist = Math.sqrt((cx - center.x) ** 2 + (cy - center.y) ** 2);
      return dist <= maxDistFromCenters;
    });
    if (!withinRange) return false;
  }
  const rects = buildLabelRects(cx, cy, dims);
  if (!hasOverlap(rects, placed)) {
    for (const r of rects) placed.push(r);
    visible.push({
      label, fontSize: dims.fontSize, flagHeight: dims.flagHeight,
      gapSize: dims.gapSize, width: dims.width, height: dims.height,
      x: cx - dims.width / 2, y: cy - dims.height / 2,
    });
    return true;
  }
  return false;
}

/**
 * Step 1: Follow a straight line from centroid away from the closest dot.
 * Tries three directions: away from dot, 90° CW, 90° CCW.
 */
function buildAwayFromDotCandidates(
  centroidX: number, centroidY: number,
  avoidPoints: ReadonlyArray<ViewBoxPosition>,
  stepSize: number, maxDist: number,
): ReadonlyArray<readonly [number, number]> {
  let closestDist = Infinity;
  let closestPoint: ViewBoxPosition | null = null;
  for (const point of avoidPoints) {
    const dist = Math.sqrt((point.x - centroidX) ** 2 + (point.y - centroidY) ** 2);
    if (dist < closestDist) {
      closestDist = dist;
      closestPoint = point;
    }
  }

  if (!closestPoint || closestDist === 0) {
    const candidates: Array<readonly [number, number]> = [];
    for (let d = stepSize; d <= maxDist; d += stepSize) {
      candidates.push([centroidX, centroidY - d]);
    }
    return candidates;
  }

  const dx = centroidX - closestPoint.x;
  const dy = centroidY - closestPoint.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;

  const directions: ReadonlyArray<readonly [number, number]> = [
    [ux, uy],
    [uy, -ux],
    [-uy, ux],
  ];

  const candidates: Array<readonly [number, number]> = [];
  for (const [dirX, dirY] of directions) {
    for (let d = 0; d <= maxDist; d += stepSize) {
      candidates.push([centroidX + dirX * d, centroidY + dirY * d]);
    }
  }
  return candidates;
}

/** Step 2: Spiral grid search around centroid. */
function buildSpiralCandidates(
  cx: number, cy: number,
  stepX: number, stepY: number,
  maxRadius: number,
): ReadonlyArray<readonly [number, number]> {
  const candidates: Array<{ readonly x: number; readonly y: number; readonly dist: number }> = [];
  candidates.push({ x: cx, y: cy, dist: 0 });

  const stepsX = Math.ceil(maxRadius / stepX);
  const stepsY = Math.ceil(maxRadius / stepY);

  for (let ix = -stepsX; ix <= stepsX; ix++) {
    for (let iy = -stepsY; iy <= stepsY; iy++) {
      if (ix === 0 && iy === 0) continue;
      const x = cx + ix * stepX;
      const y = cy + iy * stepY;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= maxRadius) {
        candidates.push({ x, y, dist });
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.map((c) => [c.x, c.y]);
}

function computeDimensions(
  label: BackgroundLabel, fontSize: number, showNames: boolean, showFlags: boolean,
): LabelDimensions {
  const flagHeight = fontSize * FLAG_HEIGHT_FACTOR;
  const flagWidth = flagHeight * 4 / 3;
  const hasFlag = showFlags && !!label.code;
  const textWidthEstimate = showNames ? label.name.length * fontSize * 0.6 : 0;
  const contentWidth = Math.max(textWidthEstimate, hasFlag ? flagWidth : 0);
  const width = showNames || hasFlag ? Math.max(contentWidth, fontSize * 3) : 0;
  const textHeight = showNames ? fontSize * 1.5 : 0;
  const gapSize = (hasFlag && showNames) ? fontSize * 0.3 : 0;
  const flagPartHeight = hasFlag ? flagHeight : 0;
  const height = flagPartHeight + gapSize + textHeight;
  return { fontSize, flagHeight, flagWidth, hasFlag, textHeight, gapSize, width, height };
}

function sortCentersByDistanceFromDots(
  centers: ReadonlyArray<ViewBoxPosition>,
  avoidPoints: ReadonlyArray<ViewBoxPosition>,
): ReadonlyArray<ViewBoxPosition> {
  if (avoidPoints.length === 0) return centers;
  return [...centers].sort((a, b) => {
    const distA = minDistanceToPoints(a, avoidPoints);
    const distB = minDistanceToPoints(b, avoidPoints);
    return distB - distA;
  });
}

function minDistanceToPoints(point: ViewBoxPosition, points: ReadonlyArray<ViewBoxPosition>): number {
  let minDist = Infinity;
  for (const p of points) {
    const dist = Math.sqrt((point.x - p.x) ** 2 + (point.y - p.y) ** 2);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

export interface ComputeLabelPlacementsOptions {
  readonly labels: ReadonlyArray<BackgroundLabel>;
  readonly scale: number;
  readonly showNames: boolean;
  readonly showFlags: boolean;
  readonly avoidPoints: ReadonlyArray<ViewBoxPosition>;
}

export interface ComputeLabelPlacementsResult {
  readonly placements: ReadonlyArray<PlacedLabel>;
}

/**
 * Pure function that computes label placements given the current state.
 * Extracted from the MapCountryLabels component's useMemo for testability.
 */
export function computeLabelPlacements(options: ComputeLabelPlacementsOptions): ComputeLabelPlacementsResult {
  const { labels, scale, showNames, showFlags, avoidPoints } = options;
  const baseFontSize = Math.min(MAX_VIEWBOX_FONT_SIZE, Math.max(MIN_VIEWBOX_FONT_SIZE, BASE_FONT_SIZE / scale));
  const isHighZoom = scale >= HIGH_ZOOM_THRESHOLD;
  const sizesToTry = isHighZoom ? REDUCED_SIZE_FACTORS : [1];

  const sorted = [...labels].sort((a, b) => b.area - a.area);

  const dotAvoidRadius = Math.max(0.1, 0.35 / scale);
  const placed: Rect[] = [];
  for (const point of avoidPoints) {
    placed.push({
      x: point.x - dotAvoidRadius, y: point.y - dotAvoidRadius,
      w: dotAvoidRadius * 2, h: dotAvoidRadius * 2,
    });
  }
  const visible: PlacedLabel[] = [];

  for (const label of sorted) {
    const sqrtArea = Math.sqrt(label.area);
    const countryRadius = sqrtArea * 0.6;

    const centersToTry = sortCentersByDistanceFromDots(label.centers, avoidPoints);

    let didPlace = false;

    // At high zoom, prevent labels from drifting far outside their country.
    // At low zoom, labels are large relative to countries and drifting is expected.
    const maxDriftFromCountry = isHighZoom ? countryRadius * 2 : undefined;

    for (const sizeFactor of sizesToTry) {
      const fontSize = baseFontSize * sizeFactor;
      const dims = computeDimensions(label, fontSize, showNames, showFlags);
      if (dims.width === 0) continue;

      const minStep = Math.max(dims.height * 0.4, dims.width * 0.2);
      const stepSize = Math.max(countryRadius * 0.2, minStep);
      const maxDist = Math.max(countryRadius * MAX_DISTANCE_FACTOR, dims.height * 2);

      for (const center of centersToTry) {
        if (tryPlace(center.x, center.y, dims, label, placed, visible)) {
          didPlace = true;
          break;
        }

        if (avoidPoints.length > 0) {
          const linearStep = Math.max(dotAvoidRadius * 0.5, dims.height * 0.15);
          const linearMaxDist = Math.max(dotAvoidRadius * 3, dims.height);
          const awayCandidates = buildAwayFromDotCandidates(
            center.x, center.y, avoidPoints, linearStep, linearMaxDist,
          );
          for (const [cx, cy] of awayCandidates) {
            if (tryPlace(cx, cy, dims, label, placed, visible, maxDriftFromCountry)) {
              didPlace = true;
              break;
            }
          }
          if (didPlace) break;
        }

        const spiralCandidates = buildSpiralCandidates(
          center.x, center.y,
          Math.max(stepSize, dims.width * 0.3), Math.max(stepSize, dims.height * 0.3),
          maxDist,
        );
        for (const [cx, cy] of spiralCandidates) {
          if (tryPlace(cx, cy, dims, label, placed, visible, maxDriftFromCountry)) {
            didPlace = true;
            break;
          }
        }
        if (didPlace) break;
      }
      if (didPlace) break;
    }

    if (!didPlace && isHighZoom) {
      const fontSize = baseFontSize * REDUCED_SIZE_FACTORS[REDUCED_SIZE_FACTORS.length - 1];
      const dims = computeDimensions(label, fontSize, showNames, showFlags);
      const bestCenter = centersToTry[0] ?? label.center;
      if (dims.width > 0) {
        visible.push({
          label, fontSize: dims.fontSize, flagHeight: dims.flagHeight,
          gapSize: dims.gapSize, width: dims.width, height: dims.height,
          x: bestCenter.x - dims.width / 2, y: bestCenter.y - dims.height / 2,
        });
      }
    }
  }

  return { placements: visible };
}
