import type { VisualizationElement } from './VisualizationElement';
import type { BackgroundPath } from './VisualizationRendererProps';

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const PADDING_FRACTION = 0.05;

/**
 * Extract bounding box from an SVG path d string by scanning numeric coordinates.
 */
function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } | undefined {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < numbers.length - 1; i += 2) {
    const x = parseFloat(numbers[i]);
    const y = parseFloat(numbers[i + 1]);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Compute an SVG viewBox that encompasses all elements and background paths.
 * The viewBox defines the SVG clip region, so it must include everything
 * that should be visible when panning around.
 */
export function computeViewBox(
  elements: ReadonlyArray<VisualizationElement>,
  backgroundPaths?: ReadonlyArray<BackgroundPath>,
): ViewBox {
  if (elements.length === 0 && (!backgroundPaths || backgroundPaths.length === 0)) {
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

  if (backgroundPaths) {
    for (const path of backgroundPaths) {
      const bounds = pathBounds(path.svgPathData);
      if (!bounds) continue;
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
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
