import type { ViewBox } from './computeViewBox';

interface BBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

interface ContainerSize {
  readonly width: number;
  readonly height: number;
}

interface FocusFrameOptions {
  readonly padding: number;
  readonly maxScale: number;
  readonly minVisiblePixels: number;
  /** Cap focus's larger on-screen dimension at this fraction of the smaller viewport dimension. */
  readonly maxScreenFraction: number;
}

interface Transform {
  readonly scale: number;
  readonly posX: number;
  readonly posY: number;
}

/**
 * Compute the transform that frames a focus target plus context bboxes,
 * keeping the focus center at the viewport center.
 *
 * Picks the scale closest to currentScale that satisfies these constraints:
 *   1. Frame fit:      focus + neighbor bboxes fit on screen with padding (upper bound).
 *   2. Ceiling:        focus's larger on-screen dimension <= maxScreenFraction (upper bound),
 *                      but never below the scale that fits the full viewBox on screen.
 *   3. Floor:          focus's larger on-screen dimension >= minVisiblePixels (lower bound),
 *                      relaxed if it conflicts with the upper bounds (frame-fit wins).
 *   4. maxScale:       hard upper bound from the zoom-pan library.
 *
 * If currentScale is already within the resulting [lower, upper] range, returns
 * currentScale unchanged. Otherwise clamps to the nearest endpoint.
 */
export function computeFocusFrame(
  focusBBox: BBox,
  neighborBBoxes: ReadonlyArray<BBox>,
  containerSize: ContainerSize,
  viewBox: ViewBox,
  basePixelsPerViewBoxUnit: number,
  currentScale: number,
  options: FocusFrameOptions,
): Transform | undefined {
  if (containerSize.width === 0 || containerSize.height === 0) return undefined;

  const cx = (focusBBox.minX + focusBBox.maxX) / 2;
  const cy = (focusBBox.minY + focusBBox.maxY) / 2;

  let halfX = 0;
  let halfY = 0;
  for (const b of [focusBBox, ...neighborBBoxes]) {
    halfX = Math.max(halfX, Math.abs(b.maxX - cx), Math.abs(b.minX - cx));
    halfY = Math.max(halfY, Math.abs(b.maxY - cy), Math.abs(b.minY - cy));
  }

  const frameWidth = halfX * 2;
  const frameHeight = halfY * 2;
  const frameFitScale = (frameWidth > 0 && frameHeight > 0)
    ? options.padding * Math.min(
        containerSize.width / (frameWidth * basePixelsPerViewBoxUnit),
        containerSize.height / (frameHeight * basePixelsPerViewBoxUnit),
      )
    : Infinity;

  const focusMaxDim = Math.max(focusBBox.maxX - focusBBox.minX, focusBBox.maxY - focusBBox.minY);
  const minViewportDim = Math.min(containerSize.width, containerSize.height);

  // Don't zoom further out than full viewBox-fit scale, even when the ceiling
  // would otherwise pull us back further.
  const fullViewBoxFitScale = Math.min(
    containerSize.width / (viewBox.width * basePixelsPerViewBoxUnit),
    containerSize.height / (viewBox.height * basePixelsPerViewBoxUnit),
  );
  const ceilingScale = focusMaxDim > 0
    ? Math.max(
        fullViewBoxFitScale,
        (minViewportDim * options.maxScreenFraction) / (focusMaxDim * basePixelsPerViewBoxUnit),
      )
    : Infinity;

  const upperBound = Math.min(options.maxScale, frameFitScale, ceilingScale);

  const floorScale = focusMaxDim > 0
    ? options.minVisiblePixels / (focusMaxDim * basePixelsPerViewBoxUnit)
    : 0;
  // Relax the floor if it conflicts with the upper bound — frame-fit wins.
  const lowerBound = Math.min(floorScale, upperBound);

  const finalScale = Math.max(lowerBound, Math.min(upperBound, currentScale));

  const svgPixelWidth = viewBox.width * basePixelsPerViewBoxUnit;
  const svgPixelHeight = viewBox.height * basePixelsPerViewBoxUnit;
  const ox = (containerSize.width - svgPixelWidth) / 2;
  const oy = (containerSize.height - svgPixelHeight) / 2;
  const contentX = ox + (cx - viewBox.x) * basePixelsPerViewBoxUnit;
  const contentY = oy + (cy - viewBox.y) * basePixelsPerViewBoxUnit;

  return {
    scale: finalScale,
    posX: containerSize.width / 2 - contentX * finalScale,
    posY: containerSize.height / 2 - contentY * finalScale,
  };
}
