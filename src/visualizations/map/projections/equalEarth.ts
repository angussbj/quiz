import type { MapProjection } from './MapProjection';
import { wrapLng } from '../projectGeo';

const DEG_TO_RAD = Math.PI / 180;

// Equal Earth coefficients (Šavrič, Patterson, Jenny 2018).
const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt(3) / 2;

/**
 * Scale so 1 degree of longitude at the equator maps to 1 viewBox unit,
 * matching the equirectangular projection's units. Derivation: at the
 * equator the raw x output is `lambda / (M * A1)` for longitude `lambda`
 * in radians, so multiplying by `M * A1 * 180/PI` produces degrees.
 */
const OUTPUT_SCALE = (M * A1 * 180) / Math.PI;

/**
 * Equal Earth projection (Šavrič, Patterson, Jenny 2018) — an equal-area
 * pseudocylindrical projection. Countries keep their true relative areas
 * while staying visually pleasant, with gently curved meridians.
 *
 * Reference: https://doi.org/10.1080/13658816.2018.1504949
 */
export const equalEarthProjection: MapProjection = {
  id: 'equal-earth',
  label: 'Equal Earth',
  project: (coordinates) => {
    const lambda = wrapLng(coordinates.longitude) * DEG_TO_RAD;
    const phi = coordinates.latitude * DEG_TO_RAD;
    const l = Math.asin(M * Math.sin(phi));
    const l2 = l * l;
    const l6 = l2 * l2 * l2;
    const denominator = M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2));
    const x = (lambda * Math.cos(l)) / denominator;
    const y = l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2));
    return {
      x: x * OUTPUT_SCALE,
      y: -y * OUTPUT_SCALE,
    };
  },
};
