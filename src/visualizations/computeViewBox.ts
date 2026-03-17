import type { VisualizationElement } from './VisualizationElement';

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const PADDING_FRACTION = 0.05;

/**
 * Compute an SVG viewBox that encompasses all elements with a small margin.
 * Uses each element's viewBoxBounds to find the total extent.
 */
export function computeViewBox(elements: ReadonlyArray<VisualizationElement>): ViewBox {
  if (elements.length === 0) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    minX = Math.min(minX, element.viewBoxBounds.minX);
    minY = Math.min(minY, element.viewBoxBounds.minY);
    maxX = Math.max(maxX, element.viewBoxBounds.maxX);
    maxY = Math.max(maxY, element.viewBoxBounds.maxY);
  }

  const rawWidth = maxX - minX;
  const rawHeight = maxY - minY;
  const paddingX = rawWidth * PADDING_FRACTION;
  const paddingY = rawHeight * PADDING_FRACTION;

  return {
    x: minX - paddingX,
    y: minY - paddingY,
    width: rawWidth + 2 * paddingX,
    height: rawHeight + 2 * paddingY,
  };
}
