/** Map luminosity (solar luminosities) to sphere radius in light-year units.
 *  Log scale clamped to reasonable range:
 *  - Sirius (lum ~23) -> ~0.7
 *  - Sun (lum 1) -> ~0.5
 *  - dim M-dwarfs (lum ~0.00005) -> ~0.15
 */
export function starRadius(luminosity: number): number {
  const logLum = Math.log10(Math.max(luminosity, 0.00001));
  // logLum range: ~-5 to ~1.5 -> radius range: 0.15 to 0.8
  const t = (logLum + 5) / 6.5; // 0..1
  return 0.15 + Math.max(0, Math.min(1, t)) * 0.65;
}
