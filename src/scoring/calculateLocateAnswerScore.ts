const FULL_MARKS_RADIUS_KM = 100;
const ZERO_MARKS_RADIUS_KM = 500;

/**
 * Calculate a score (0–1) for a single locate-mode answer based on distance
 * from the correct position. Linear decay from 1.0 at ≤100km to 0.0 at ≥500km.
 */
export function calculateLocateAnswerScore(distanceKm: number): number {
  if (distanceKm <= FULL_MARKS_RADIUS_KM) {
    return 1;
  }
  if (distanceKm >= ZERO_MARKS_RADIUS_KM) {
    return 0;
  }
  return (
    (ZERO_MARKS_RADIUS_KM - distanceKm) /
    (ZERO_MARKS_RADIUS_KM - FULL_MARKS_RADIUS_KM)
  );
}

/**
 * Whether a locate answer counts as "correct" (within the full-marks radius).
 */
export function isLocateAnswerCorrect(distanceKm: number): boolean {
  return distanceKm <= FULL_MARKS_RADIUS_KM;
}
