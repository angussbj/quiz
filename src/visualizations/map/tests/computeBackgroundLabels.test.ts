import type { BackgroundPath } from '../../VisualizationRendererProps';
import { computeBackgroundLabels } from '../computeBackgroundLabels';

const squarePath = 'M 0 0 L 10 0 L 10 10 L 0 10 Z';

describe('computeBackgroundLabels', () => {
  it('computes one label per unique country name', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'fr-0', svgPathData: squarePath, group: 'Western Europe', name: 'France' },
      { id: 'fr-1', svgPathData: 'M 20 0 L 30 0 L 30 10 L 20 10 Z', group: 'Western Europe', name: 'France' },
      { id: 'de', svgPathData: 'M 40 0 L 50 0 L 50 10 L 40 10 Z', group: 'Central Europe', name: 'Germany' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(2);
    expect(labels.map((l) => l.name)).toContain('France');
    expect(labels.map((l) => l.name)).toContain('Germany');
  });

  it('picks the largest path segment for multi-path countries', () => {
    const smallSquare = 'M 0 0 L 2 0 L 2 2 L 0 2 Z';
    const bigSquare = 'M 10 10 L 30 10 L 30 30 L 10 30 Z';
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'fr-0', svgPathData: smallSquare, name: 'France' },
      { id: 'fr-1', svgPathData: bigSquare, name: 'France' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(1);
    expect(labels[0].center.x).toBeCloseTo(20, 0);
    expect(labels[0].center.y).toBeCloseTo(20, 0);
  });

  it('skips paths without a group', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'unknown', svgPathData: squarePath },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels).toHaveLength(0);
  });

  it('passes through code from the largest path', () => {
    const paths: ReadonlyArray<BackgroundPath> = [
      { id: 'fr', svgPathData: squarePath, name: 'France', code: 'fr' },
    ];
    const labels = computeBackgroundLabels(paths);
    expect(labels[0].code).toBe('fr');
  });
});
