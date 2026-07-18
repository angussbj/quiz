import type { MapElement } from '../MapElement';
import { computeElementLabels } from '../computeElementLabels';

function makeElement(overrides: Partial<MapElement>): MapElement {
  return {
    id: 'e',
    label: 'Element',
    geoCoordinates: { latitude: 0, longitude: 0 },
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
    interactive: true,
    svgPathData: '',
    code: '',
    ...overrides,
  };
}

describe('computeElementLabels', () => {
  it('uses the largest subpath when there are multiple subpaths and no mainland data', () => {
    const small = 'M 0 0 L 2 0 L 2 2 L 0 2 Z';
    const big = 'M 100 100 L 130 100 L 130 130 L 100 130 Z';
    const element = makeElement({
      svgPathData: `${small} ${big}`,
    });

    const [label] = computeElementLabels([element]);

    expect(label.center.x).toBeGreaterThan(50);
    expect(label.center.y).toBeGreaterThan(50);
  });

  it('uses mainlandSvgPathData to pick the label subpath, ignoring merged territories', () => {
    // Models Denmark + Greenland: Greenland (huge) was merged into svgPathData,
    // but mainlandSvgPathData holds only Denmark's own paths. The label should
    // sit on the Denmark mainland, not the Greenland-shaped subpath.
    const denmarkMainland = 'M 0 0 L 5 0 L 5 5 L 0 5 Z';
    const denmarkIsland = 'M 6 0 L 8 0 L 8 2 L 6 2 Z';
    const greenland = 'M 100 100 L 200 100 L 200 200 L 100 200 Z';
    const element = makeElement({
      svgPathData: `${denmarkMainland} ${denmarkIsland} ${greenland}`,
      mainlandSvgPathData: `${denmarkMainland} ${denmarkIsland}`,
    });

    const [label] = computeElementLabels([element]);

    expect(label.center.x).toBeLessThan(10);
    expect(label.center.y).toBeLessThan(10);
  });

  it('uses single-subpath centroid when there is only one subpath', () => {
    const element = makeElement({
      svgPathData: 'M 0 0 L 10 0 L 10 10 L 0 10 Z',
    });

    const [label] = computeElementLabels([element]);

    expect(label.center.x).toBeCloseTo(5, 0);
    expect(label.center.y).toBeCloseTo(5, 0);
  });

  it('sizes the label by the chosen mainland subpath, not the merged total', () => {
    // Without mainland filtering, label area would be dominated by the huge
    // territory and the rendered font would be far too large for Denmark.
    const mainland = 'M 0 0 L 2 0 L 2 2 L 0 2 Z'; // area 4
    const territory = 'M 10 10 L 30 10 L 30 30 L 10 30 Z'; // area 400
    const element = makeElement({
      svgPathData: `${mainland} ${territory}`,
      mainlandSvgPathData: mainland,
    });

    const [label] = computeElementLabels([element]);

    expect(label.area).toBeCloseTo(4, 0);
  });
});
