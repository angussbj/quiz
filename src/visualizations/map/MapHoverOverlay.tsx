/**
 * Renders a semi-transparent overlay shape on top of the currently hovered
 * map element. This avoids modifying the original element's styles on hover,
 * which would trigger an SVG-wide repaint and cause visible flicker on all
 * sibling elements.
 *
 * The overlay is theme-aware: white wash in light mode, dark wash in dark mode
 * (controlled by --color-hover-overlay CSS variable).
 */
import { memo } from 'react';
import type { VisualizationElement } from '../VisualizationElement';
import { isMapElement } from './MapElement';

const RIVER_STROKE_WIDTH = 0.15;

/** Find a map element by ID, returning undefined for non-map or missing elements. */
function findMapElement(elements: ReadonlyArray<VisualizationElement>, id: string) {
  const el = elements.find((e) => e.id === id);
  if (!el || !isMapElement(el) || !el.svgPathData) return undefined;
  return el;
}

/** Split a combined SVG path `d` string into individual subpaths, keeping only open strokes. */
function extractStrokePaths(d: string): string {
  const parts: Array<string> = [];
  const indices: Array<number> = [];
  for (const m of d.matchAll(/M\s/g)) {
    if (m.index !== undefined) indices.push(m.index);
  }
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i < indices.length - 1 ? indices[i + 1] : d.length;
    const sub = d.slice(start, end).trim();
    if (sub && !sub.endsWith('Z')) parts.push(sub);
  }
  return parts.join(' ');
}

interface MapHoverOverlayProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly hoveredElementId: string | null;
}

export const MapHoverOverlay = memo(function MapHoverOverlay({
  elements,
  hoveredElementId,
}: MapHoverOverlayProps) {
  if (!hoveredElementId) return null;

  const element = findMapElement(elements, hoveredElementId);
  if (!element) return null;

  const isStroke = element.pathRenderStyle === 'stroke';

  if (isStroke) {
    const strokeD = extractStrokePaths(element.svgPathData ?? '');
    if (!strokeD) return null;
    return (
      <path
        d={strokeD}
        style={{
          fill: 'none',
          stroke: 'var(--color-hover-overlay)',
          strokeWidth: RIVER_STROKE_WIDTH,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
        pointerEvents="none"
      />
    );
  }

  return (
    <path
      d={element.svgPathData ?? ''}
      fillRule="evenodd"
      style={{
        fill: 'var(--color-hover-overlay)',
        stroke: 'var(--color-hover-overlay)',
        strokeWidth: 0.075,
      }}
      pointerEvents="none"
    />
  );
});
