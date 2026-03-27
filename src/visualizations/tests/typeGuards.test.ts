import type { VisualizationElement } from '../VisualizationElement';
import { isMapElement } from '../map/MapElement';
import { isTimelineElement } from '../timeline/TimelineElement';
import { isGridElement } from '../periodic-table/GridElement';

const baseElement: VisualizationElement = {
  id: 'test',
  label: 'Test',
  viewBoxCenter: { x: 0, y: 0 },
  viewBoxBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
  interactive: true,
};

describe('isMapElement', () => {
  it('returns true for map elements', () => {
    const mapElement = {
      ...baseElement,
      geoCoordinates: { latitude: 48.85, longitude: 2.35 },
      svgPathData: 'M0 0 L10 10',
      code: 'FR',
    };
    expect(isMapElement(mapElement)).toBe(true);
  });

  it('returns false for non-map elements', () => {
    expect(isMapElement(baseElement)).toBe(false);
  });
});

describe('isTimelineElement', () => {
  it('returns true for timeline elements', () => {
    const timelineElement = {
      ...baseElement,
      start: [1900] as const,
      end: [2000] as const,
      category: 'science',
    };
    expect(isTimelineElement(timelineElement)).toBe(true);
  });

  it('returns false for non-timeline elements', () => {
    expect(isTimelineElement(baseElement)).toBe(false);
  });
});

describe('isGridElement', () => {
  it('returns true for grid elements', () => {
    const gridElement = {
      ...baseElement,
      row: 1,
      column: 1,
      symbol: 'Fe',
      atomicNumber: 26,
      trueRow: 3,
      trueColumn: 21,
      atomicWeight: '55.845',
    };
    expect(isGridElement(gridElement)).toBe(true);
  });

  it('returns false for non-grid elements', () => {
    expect(isGridElement(baseElement)).toBe(false);
  });
});
