/**
 * Diagnostic test for label placement using real Portugal data.
 * Traces which positions are tried and why they're rejected.
 */

// Import the internals we need to test — we'll call the placement logic directly
// For now, test via the exported component's useMemo logic by extracting key functions

import { computePathCentroid, computePathArea } from '../computePathCentroid';
import { computeBackgroundLabels } from '../computeBackgroundLabels';
import type { BackgroundPath } from '../../VisualizationRendererProps';

// Real Portugal mainland path (simplified first/last points for readability, full path for accuracy)
const PORTUGAL_PATH = 'M -7.1 -38.83 L -7.27 -38.74 L -7.36 -38.45 L -7.14 -38.18 L -7.41 -37.82 L -7.49 -37.56 L -7.87 -37.11 L -8.16 -37.1 L -8.63 -37.41 L -8.77 -37.48 L -8.8 -37.77 L -8.97 -37.83 L -8.91 -38.28 L -9.4 -38.61 L -9.49 -38.83 L -9.3 -39.02 L -9.34 -39.54 L -8.91 -40.03 L -8.65 -40.78 L -8.76 -41.33 L -8.78 -41.5 L -8.66 -41.58 L -8.2 -41.77 L -8.07 -41.81 L -7.51 -41.87 L -7.18 -41.96 L -6.57 -41.92 L -6.21 -41.6 L -6.51 -41.04 L -6.86 -40.89 L -6.95 -40.22 L -7.01 -40.2 L -6.95 -39.99 L -7.54 -39.65 L -7.53 -39.49 L -7.17 -39.15 L -7.01 -39.04 L -7.1 -38.83 Z';

describe('Portugal label placement diagnostics', () => {
  it('computes correct centroid and area for Portugal', () => {
    const centroid = computePathCentroid(PORTUGAL_PATH);
    const area = computePathArea(PORTUGAL_PATH);

    console.log('Portugal centroid:', centroid);
    console.log('Portugal area:', area);
    console.log('sqrtArea:', Math.sqrt(area));
    console.log('countryRadius:', Math.sqrt(area) * 0.6);

    // Centroid should be roughly in central Portugal
    expect(centroid.x).toBeCloseTo(-7.98, 0);
    expect(centroid.y).toBeCloseTo(-39.68, 0);
    expect(area).toBeGreaterThan(5);
  });

  it('Lisbon dot is within country radius of centroid', () => {
    const centroid = computePathCentroid(PORTUGAL_PATH);
    const area = computePathArea(PORTUGAL_PATH);
    const countryRadius = Math.sqrt(area) * 0.6;

    const lisbon = { x: -9.15, y: -38.73 };
    const dist = Math.sqrt((centroid.x - lisbon.x) ** 2 + (centroid.y - lisbon.y) ** 2);

    console.log('Distance centroid to Lisbon:', dist);
    console.log('Country radius:', countryRadius);
    console.log('Ratio:', dist / countryRadius);

    expect(dist).toBeLessThan(countryRadius);
  });

  it('traces away-from-dot direction for Portugal', () => {
    const centroid = computePathCentroid(PORTUGAL_PATH);
    const lisbon = { x: -9.15, y: -38.73 };

    // Direction from Lisbon toward centroid (away from dot)
    const dx = centroid.x - lisbon.x;
    const dy = centroid.y - lisbon.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    console.log('Away-from-dot direction (unit vector):', { ux, uy });
    console.log('Direction: moving', ux > 0 ? 'east' : 'west', 'and', uy < 0 ? 'south' : 'north');

    // At various step distances, where would the label center be?
    const area = computePathArea(PORTUGAL_PATH);
    const countryRadius = Math.sqrt(area) * 0.6;
    const maxDist = Math.max(countryRadius * 1.2, 2);

    console.log('\nCandidate positions along away-from-dot line:');
    const stepSize = 0.1; // fine steps
    for (let d = 0; d <= maxDist; d += stepSize) {
      const cx = centroid.x + ux * d;
      const cy = centroid.y + uy * d;
      const distFromCentroid = Math.sqrt((cx - centroid.x) ** 2 + (cy - centroid.y) ** 2);
      if (d < 0.5 || d % 0.5 < stepSize) {
        console.log(`  d=${d.toFixed(1)}: (${cx.toFixed(2)}, ${cy.toFixed(2)}) dist_from_centroid=${distFromCentroid.toFixed(2)}`);
      }
    }

    // The direction should be roughly NE (positive x, negative y in viewBox)
    expect(ux).toBeGreaterThan(0); // east
    expect(uy).toBeLessThan(0); // south in viewBox = north geographically... wait
    // viewBox y = -latitude, so more negative y = further south
    // centroid.y = -39.68, lisbon.y = -38.73
    // dy = -39.68 - (-38.73) = -0.95 (moving south in viewBox = south geographically)
    // So direction is east and south — away from Lisbon toward interior Portugal
  });

  it('computeBackgroundLabels produces correct label for Portugal', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'portugal', svgPathData: PORTUGAL_PATH, name: 'Portugal', group: 'Southern Europe', code: 'pt', sovereign: 'Portugal' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(1);
    expect(labels[0].name).toBe('Portugal');
    expect(labels[0].area).toBeGreaterThan(5);
    console.log('Label:', labels[0]);
  });
});
