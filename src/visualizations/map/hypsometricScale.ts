export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Minimum land elevation (Dead Sea shore, −430m). */
const MIN_ELEVATION = -430;
/** Maximum elevation (Everest). */
const MAX_ELEVATION = 8849;

export type ElevationScaling = 'sqrt' | 'linear';

/**
 * Hue rotation color scale matching the periodic table's continuous gradient.
 * Maps elevation from MIN_ELEVATION to MAX_ELEVATION through:
 *   deep purple (280°) → blue (240°) → cyan (180°) → green (120°)
 *   → yellow (60°) → orange (30°) → red (0°) → pink/magenta (320°)
 *
 * Supports negative elevations (below-sea-level land like Dead Sea, Death Valley).
 *
 * @param scaling - 'sqrt' compresses high elevations for better low-elevation
 *   differentiation. 'linear' distributes colors evenly across the range.
 */
export function elevationToRgb(elevation: number, scaling: ElevationScaling = 'sqrt'): RgbColor {
  const clamped = Math.max(MIN_ELEVATION, Math.min(elevation, MAX_ELEVATION));
  const normalized = (clamped - MIN_ELEVATION) / (MAX_ELEVATION - MIN_ELEVATION);

  const t = scaling === 'sqrt' ? Math.sqrt(normalized) : normalized;

  const hue = hueForT(t);
  const saturation = 55;
  const lightness = 48;

  return hslToRgb(hue, saturation, lightness);
}

/**
 * Map normalized t (0–1) to a hue value along the color path.
 * Piecewise linear through defined hue stops.
 */
function hueForT(t: number): number {
  const stops: ReadonlyArray<readonly [number, number]> = [
    [0.0, 280],   // deep purple
    [0.15, 240],  // blue
    [0.3, 180],   // cyan
    [0.45, 120],  // green
    [0.6, 60],    // yellow
    [0.72, 30],   // orange
    [0.85, 0],    // red
    [1.0, 320],   // pink/magenta (wrap around)
  ];

  if (t <= stops[0][0]) return stops[0][1];
  if (t >= stops[stops.length - 1][0]) return stops[stops.length - 1][1];

  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, h0] = stops[i - 1];
      const [t1, h1] = stops[i];
      const frac = (t - t0) / (t1 - t0);

      // For the red→magenta segment, go through 360 (0→320 the short way)
      if (h0 === 0 && h1 === 320) {
        return (360 + frac * (320 - 360)) % 360;
      }

      return h0 + frac * (h1 - h0);
    }
  }
  return stops[stops.length - 1][1];
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to RGB. */
function hslToRgb(h: number, s: number, l: number): RgbColor {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;

  let r1: number, g1: number, b1: number;
  if (h < 60)      { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else              { r1 = c; g1 = 0; b1 = x; }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}
