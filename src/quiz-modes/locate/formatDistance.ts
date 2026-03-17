/** Format a distance in km for display (e.g., "<1 km", "3.2 km", "147 km"). */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return '<1 km';
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}
