import { computeClusters } from '../computeClusters';

function element(id: string, x: number, y: number) {
  return { id, viewBoxCenter: { x, y } };
}

describe('computeClusters', () => {
  it('returns no clusters when all elements are far apart', () => {
    const elements = [element('a', 0, 0), element('b', 100, 0), element('c', 200, 0)];
    const clusters = computeClusters(elements, 30, 1);
    expect(clusters).toHaveLength(0);
  });

  it('clusters two nearby elements', () => {
    const elements = [element('a', 0, 0), element('b', 10, 0)];
    const clusters = computeClusters(elements, 30, 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].elementIds).toEqual(['a', 'b']);
    expect(clusters[0].count).toBe(2);
    expect(clusters[0].center.x).toBeCloseTo(5);
    expect(clusters[0].center.y).toBeCloseTo(0);
  });

  it('forms multiple clusters from distinct groups', () => {
    const elements = [
      element('a', 0, 0),
      element('b', 5, 0),
      element('c', 100, 0),
      element('d', 105, 0),
    ];
    const clusters = computeClusters(elements, 30, 1);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].elementIds).toContain('a');
    expect(clusters[0].elementIds).toContain('b');
    expect(clusters[1].elementIds).toContain('c');
    expect(clusters[1].elementIds).toContain('d');
  });

  it('does not cluster singletons', () => {
    const elements = [element('a', 0, 0), element('b', 100, 0)];
    const clusters = computeClusters(elements, 10, 1);
    expect(clusters).toHaveLength(0);
  });

  it('respects screenPixelsPerViewBoxUnit scaling', () => {
    const elements = [element('a', 0, 0), element('b', 10, 0)];
    // At 1 px/unit, distance = 10px < 30px threshold → cluster
    expect(computeClusters(elements, 30, 1)).toHaveLength(1);
    // At 0.1 px/unit, distance = 1px < 30px → still cluster
    expect(computeClusters(elements, 30, 0.1)).toHaveLength(1);
    // At 1 px/unit, distance = 10px > 5px threshold → no cluster
    expect(computeClusters(elements, 5, 1)).toHaveLength(0);
  });

  it('splits a chain of closely-spaced elements into multiple clusters', () => {
    // 10 elements spaced 8 units apart along a line: 0, 8, 16, ..., 72
    // With threshold 30px at 1px/unit, two elements 8 apart are within range,
    // but the centroid-based approach prevents the chain from merging into one.
    const elements = Array.from({ length: 10 }, (_, i) => element(`e${i}`, i * 8, 0));
    const clusters = computeClusters(elements, 30, 1);

    // Must produce more than one cluster — a single giant cluster would be wrong
    expect(clusters.length).toBeGreaterThan(1);

    // Every element should appear in exactly one cluster or remain unclustered
    const clusteredIds = clusters.flatMap((c) => [...c.elementIds]);
    const uniqueIds = new Set(clusteredIds);
    expect(uniqueIds.size).toBe(clusteredIds.length);
  });

  it('handles empty input', () => {
    expect(computeClusters([], 30, 1)).toHaveLength(0);
  });

  it('handles single element', () => {
    expect(computeClusters([element('a', 0, 0)], 30, 1)).toHaveLength(0);
  });

  it('clusters in 2D, not just on one axis', () => {
    const elements = [
      element('a', 0, 0),
      element('b', 15, 15), // distance ~21.2
      element('c', 50, 0),
    ];
    const clusters = computeClusters(elements, 25, 1);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].elementIds).toContain('a');
    expect(clusters[0].elementIds).toContain('b');
  });
});
