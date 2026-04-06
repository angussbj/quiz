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

interface HslStop {
  readonly t: number;
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

/**
 * Color stops defining the full HSL path from low to high elevation.
 * t is the normalized+scaled position (0–1).
 *
 * Low–mid elevations: hue rotation at fixed S=55%, L=48%
 *   purple → blue → cyan → green → yellow → orange → red
 * High elevations: red darkens, then transitions through pink to white
 *   dark red → dark pink → pink → light pink → near-white
 */
const HSL_STOPS: ReadonlyArray<HslStop> = [
  { t: 0.00, h: 280, s: 55, l: 48 },  // deep purple   (~-430m, Dead Sea)
  { t: 0.20, h: 240, s: 55, l: 48 },  // blue          (~-60m)
  { t: 0.27, h: 180, s: 55, l: 48 },  // cyan          (~250m)
  { t: 0.39, h: 120, s: 55, l: 48 },  // green         (~980m)
  { t: 0.52, h: 60,  s: 55, l: 48 },  // yellow        (~2080m)
  { t: 0.61, h: 30,  s: 55, l: 48 },  // orange        (~3020m)
  { t: 0.68, h: 5,   s: 55, l: 48 },  // red           (~3860m)
  { t: 0.74, h: 0,   s: 55, l: 30 },  // dark red      (~4650m, Tibetan Plateau)
  { t: 0.81, h: 340, s: 40, l: 50 },  // dark pink     (~5660m)
  { t: 0.87, h: 330, s: 35, l: 65 },  // pink          (~6590m)
  { t: 0.91, h: 320, s: 20, l: 80 },  // light pink    (~7250m)
  { t: 0.95, h: 320, s: 5,  l: 95 },  // near-white    (~7940m)
  { t: 1.00, h: 320, s: 5,  l: 100 }, // white         (8849m, Everest)
];

/**
 * Map elevation to RGB using an HSL hue rotation with varying
 * saturation and lightness at high elevations.
 *
 * Low elevations use a purple→blue→green→yellow→orange→red hue path.
 * High elevations (>5000m) darken through deep red, then transition
 * through pink to near-white for the highest Himalayan peaks.
 *
 * @param scaling - 'sqrt' compresses high elevations for better low-elevation
 *   differentiation. 'linear' distributes colors evenly across the range.
 */
export function elevationToRgb(elevation: number, scaling: ElevationScaling = 'sqrt'): RgbColor {
  const clamped = Math.max(MIN_ELEVATION, Math.min(elevation, MAX_ELEVATION));
  const normalized = (clamped - MIN_ELEVATION) / (MAX_ELEVATION - MIN_ELEVATION);
  const t = scaling === 'sqrt' ? Math.sqrt(normalized) : normalized;

  const { h, s, l } = interpolateHsl(t);
  return hslToRgb(h, s, l);
}

/**
 * Interpolate through HSL stops at position t (0–1).
 * Hue interpolation takes the shortest path around the wheel.
 */
function interpolateHsl(t: number): { readonly h: number; readonly s: number; readonly l: number } {
  if (t <= HSL_STOPS[0].t) return HSL_STOPS[0];
  if (t >= HSL_STOPS[HSL_STOPS.length - 1].t) return HSL_STOPS[HSL_STOPS.length - 1];

  for (let i = 1; i < HSL_STOPS.length; i++) {
    if (t <= HSL_STOPS[i].t) {
      const a = HSL_STOPS[i - 1];
      const b = HSL_STOPS[i];
      const frac = (t - a.t) / (b.t - a.t);

      // Interpolate hue via shortest path around the wheel
      let dh = b.h - a.h;
      if (dh > 180) dh -= 360;
      if (dh < -180) dh += 360;
      const h = ((a.h + frac * dh) % 360 + 360) % 360;

      return {
        h,
        s: a.s + frac * (b.s - a.s),
        l: a.l + frac * (b.l - a.l),
      };
    }
  }
  return HSL_STOPS[HSL_STOPS.length - 1];
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to RGB. */
function hslToRgb(h: number, s: number, l: number): RgbColor {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;

  let r1: number, g1: number, b1: number;
  if (h < 60)       { r1 = c; g1 = x; b1 = 0; }
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
