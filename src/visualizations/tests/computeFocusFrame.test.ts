import { computeFocusFrame } from '../computeFocusFrame';

interface BBox { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number; }
const bbox = (minX: number, minY: number, maxX: number, maxY: number): BBox => ({ minX, minY, maxX, maxY });

const VIEWBOX = { x: -50, y: -50, width: 100, height: 100 };
const CONTAINER = { width: 200, height: 200 };
const BPPU = 2; // 200px / 100 viewBox units

const OPTIONS = {
  padding: 0.7,
  maxScale: 500,
  minVisiblePixels: 8,
  maxScreenFraction: 0.5,
};

describe('computeFocusFrame', () => {
  it('centers focus center at viewport center', () => {
    const focus = bbox(10, 10, 12, 12);
    const result = computeFocusFrame(focus, [bbox(20, 20, 22, 22)], CONTAINER, VIEWBOX, BPPU, 1, OPTIONS);
    if (!result) throw new Error('expected result');

    const cx = 11, cy = 11;
    const ox = (CONTAINER.width - VIEWBOX.width * BPPU) / 2;
    const oy = (CONTAINER.height - VIEWBOX.height * BPPU) / 2;
    const contentX = ox + (cx - VIEWBOX.x) * BPPU;
    const contentY = oy + (cy - VIEWBOX.y) * BPPU;
    expect(contentX * result.scale + result.posX).toBeCloseTo(100, 5);
    expect(contentY * result.scale + result.posY).toBeCloseTo(100, 5);
  });

  it('preserves current zoom when in the acceptable range', () => {
    // Focus 5x5 viewBox units, neighbors out to 20 from center.
    // At scale 1: focus = 10px on screen (>=8, <50% of 200=100), frame extent = 40px (fits in 200).
    // Current scale 1 should be preserved.
    const focus = bbox(-2.5, -2.5, 2.5, 2.5);
    const neighbors = [bbox(15, 15, 20, 20), bbox(-20, -15, -15, -10)];
    const result = computeFocusFrame(focus, neighbors, CONTAINER, VIEWBOX, BPPU, 1, OPTIONS);
    if (!result) throw new Error('expected result');
    expect(result.scale).toBeCloseTo(1, 5);
  });

  it('zooms out when current zoom does not fit the frame', () => {
    // Focus 2x2 at origin, far neighbor at (40,0) — frame width = 80 viewBox units.
    // At BPPU=2, frame on screen at scale 1 is 160px. Padded fit: 200*0.7 / (80*2) = 0.875.
    // Current scale 5 is way above fit; result should be 0.875.
    const focus = bbox(-1, -1, 1, 1);
    const neighbors = [bbox(38, -1, 40, 1)];
    const result = computeFocusFrame(focus, neighbors, CONTAINER, VIEWBOX, BPPU, 5, OPTIONS);
    if (!result) throw new Error('expected result');
    expect(result.scale).toBeCloseTo(0.875, 3);
  });

  it('zooms in when current zoom puts focus below 8px floor', () => {
    // Focus 0.5x0.5 viewBox; at scale 1 on screen = 1px (below floor).
    // Floor scale = 8 / (0.5 * 2) = 8.
    // Frame extent (with neighbors) is small, fits at high scale, so floor is the binding constraint.
    const focus = bbox(-0.25, -0.25, 0.25, 0.25);
    const neighbors = [bbox(0.5, 0.5, 1, 1)];
    const result = computeFocusFrame(focus, neighbors, CONTAINER, VIEWBOX, BPPU, 1, OPTIONS);
    if (!result) throw new Error('expected result');
    expect(result.scale).toBeCloseTo(8, 3);
  });

  it('zooms out when current zoom puts focus above 50% ceiling', () => {
    // Focus 30x30 viewBox at origin; at scale 5 on screen = 300px (>50% of 200=100).
    // Ceiling scale = (0.5 * 200) / (30 * 2) = 1.667.
    // Frame fit (no neighbors, focus only): 0.7 * 200 / (30 * 2) = 2.333.
    // U = min(maxScale=500, frameFit=2.333, ceiling=1.667) = 1.667.
    const focus = bbox(-15, -15, 15, 15);
    const result = computeFocusFrame(focus, [], CONTAINER, VIEWBOX, BPPU, 5, OPTIONS);
    if (!result) throw new Error('expected result');
    expect(result.scale).toBeCloseTo(5 / 3, 3);
  });

  it('lets focus be smaller than 8px when frame-fit and floor conflict', () => {
    // Tiny focus (1x1) with one very distant neighbor (1000 units away).
    // Floor scale = 8 / (sqrt(2)*2) ≈ 2.83.
    // Frame fit: extent = 2000, fit = 200*0.7/(2000*2) = 0.035. Floor > fit, so frame wins.
    const focus = bbox(-0.5, -0.5, 0.5, 0.5);
    const neighbors = [bbox(999, -0.5, 1000, 0.5)];
    const result = computeFocusFrame(focus, neighbors, CONTAINER, VIEWBOX, BPPU, 1, OPTIONS);
    if (!result) throw new Error('expected result');
    // Frame fit dominates; focus on screen is much less than 8px.
    expect(result.scale).toBeCloseTo(0.035, 3);
  });

  it('does not let the 50% ceiling push zoom further out than the full viewBox', () => {
    // Focus is small relative to viewBox, but at currentScale it's >50% of screen.
    // We compare two configurations to verify the floor-on-ceiling kicks in.
    // Focus 60x60, no neighbors. Ceiling-from-fraction = 100/(60*2) = 0.833.
    // frameFit = 0.7 * 200/(60*2) = 1.167.
    // fullViewBoxFitScale = min(200/(100*2)) = 1.
    // ceilingScale = max(fullViewBoxFitScale=1, 0.833) = 1.
    // upperBound = min(500, 1.167, 1) = 1.
    const focus = bbox(-30, -30, 30, 30);
    const result = computeFocusFrame(focus, [], CONTAINER, VIEWBOX, BPPU, 5, OPTIONS);
    if (!result) throw new Error('expected result');
    // Without the floor: would land at ceiling-from-fraction = 0.833. With it: 1.
    expect(result.scale).toBeCloseTo(1, 3);
  });

  it('caps at maxScale', () => {
    const focus = bbox(0, 0, 0.0001, 0.0001);
    const result = computeFocusFrame(focus, [bbox(0.1, 0.1, 0.2, 0.2)], CONTAINER, VIEWBOX, BPPU, 1, { ...OPTIONS, maxScale: 100 });
    if (!result) throw new Error('expected result');
    expect(result.scale).toBeLessThanOrEqual(100);
  });

  it('returns undefined when container is unsized', () => {
    const result = computeFocusFrame(bbox(0, 0, 1, 1), [], { width: 0, height: 0 }, VIEWBOX, BPPU, 1, OPTIONS);
    expect(result).toBeUndefined();
  });
});
