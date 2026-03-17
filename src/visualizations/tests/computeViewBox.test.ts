import { computeViewBox } from '../computeViewBox';
import type { VisualizationElement } from '../VisualizationElement';

function element(id: string, minX: number, minY: number, maxX: number, maxY: number): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    viewBoxBounds: { minX, minY, maxX, maxY },
    interactive: true,
  };
}

describe('computeViewBox', () => {
  it('returns a default viewBox for empty elements', () => {
    const vb = computeViewBox([]);
    expect(vb).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('computes a viewBox from a single element with padding', () => {
    const vb = computeViewBox([element('a', 10, 20, 30, 40)]);
    // Raw: x=10..30 (w=20), y=20..40 (h=20)
    // Padding: 5% each side → 1 unit
    expect(vb.x).toBeCloseTo(9);
    expect(vb.y).toBeCloseTo(19);
    expect(vb.width).toBeCloseTo(22);
    expect(vb.height).toBeCloseTo(22);
  });

  it('encompasses all elements', () => {
    const elements = [
      element('a', 0, 0, 10, 10),
      element('b', 90, 90, 100, 100),
    ];
    const vb = computeViewBox(elements);
    // Raw: x=0..100 (w=100), y=0..100 (h=100)
    expect(vb.x).toBeLessThan(0);
    expect(vb.y).toBeLessThan(0);
    expect(vb.x + vb.width).toBeGreaterThan(100);
    expect(vb.y + vb.height).toBeGreaterThan(100);
  });

  it('handles elements with different sizes', () => {
    const elements = [
      element('tiny', 50, 50, 51, 51),
      element('big', 0, 0, 200, 100),
    ];
    const vb = computeViewBox(elements);
    expect(vb.x).toBeLessThanOrEqual(0);
    expect(vb.y).toBeLessThanOrEqual(0);
    expect(vb.x + vb.width).toBeGreaterThanOrEqual(200);
    expect(vb.y + vb.height).toBeGreaterThanOrEqual(100);
  });
});
