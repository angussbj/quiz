interface LabelHaloFilterProps {
  readonly id: string;
  /** Halo extent in viewBox units. */
  readonly radius: number;
}

/**
 * Renders an SVG <filter> that produces a uniform silhouette halo around text.
 *
 * Why not stroke? SVG `stroke` on text is applied per glyph contour and
 * centered on each contour's edge. On tiny isolated contours (umlaut dots,
 * `i` tittles) the inward half of the stroke flips into a degenerate offset
 * curve, leaving a visible hole between the fill and the halo ring.
 * `feMorphology dilate` operates on the rasterised silhouette as a single
 * shape, so small features render as solid blobs with a uniform outer halo.
 */
export function LabelHaloFilter({ id, radius }: LabelHaloFilterProps) {
  return (
    <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={radius} result="dilated" />
      <feFlood style={{ floodColor: 'var(--color-label-halo)' }} result="haloColor" />
      <feComposite in="haloColor" in2="dilated" operator="in" result="halo" />
      <feMerge>
        <feMergeNode in="halo" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

/**
 * Bin a halo radius to two significant figures. Labels whose radii round to
 * the same bin share one <filter> definition, so a world map with hundreds of
 * labels emits a handful of filters instead of one per label.
 */
export function haloBinKey(radius: number, prefix: string): { id: string; radius: number } {
  const magnitude = radius === 0 ? 0 : Math.pow(10, Math.floor(Math.log10(Math.abs(radius))) - 1);
  const binned = magnitude === 0 ? 0 : Math.round(radius / magnitude) * magnitude;
  const rounded = Number(binned.toPrecision(2));
  return { id: `${prefix}-${rounded.toString().replace(/\./g, '-')}`, radius: rounded };
}
