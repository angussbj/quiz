import { buildTimelineElements, UNITS_PER_YEAR } from '../buildTimelineElements';

describe('buildTimelineElements', () => {
  it('returns empty array for empty input', () => {
    expect(buildTimelineElements([])).toEqual([]);
  });

  it('computes viewBox positions from timestamps', () => {
    const elements = buildTimelineElements([
      {
        id: 'a',
        label: 'Test',
        start: [1900],
        end: [1950],
        category: 'cat',
      },
    ]);

    expect(elements).toHaveLength(1);
    const el = elements[0];
    expect(el.viewBoxBounds.minX).toBe(1900 * UNITS_PER_YEAR);
    expect(el.viewBoxBounds.maxX).toBe(1951 * UNITS_PER_YEAR); // end of 1950
    expect(el.viewBoxBounds.minY).toBe(0);
    // Track height is at least 40
    expect(el.viewBoxBounds.maxY).toBeGreaterThanOrEqual(40);
  });

  it('assigns auto-tracks to avoid overlaps', () => {
    const elements = buildTimelineElements([
      {
        id: 'a',
        label: 'A',
        start: [1900],
        end: [1950],
        category: 'cat',
      },
      {
        id: 'b',
        label: 'B',
        start: [1920],
        end: [1970],
        category: 'cat',
      },
    ]);

    expect(elements[0].track).toBe(0);
    expect(elements[1].track).toBe(1);
    // Second element on track 1 should be offset from track 0
    expect(elements[1].viewBoxBounds.minY).toBeGreaterThan(0);
  });

  it('applies minimum bar width for point events', () => {
    const elements = buildTimelineElements([
      {
        id: 'point',
        label: 'Point Event',
        start: [1969, 7, 20],
        category: 'science',
      },
    ]);

    const el = elements[0];
    const width = el.viewBoxBounds.maxX - el.viewBoxBounds.minX;
    expect(width).toBeGreaterThanOrEqual(UNITS_PER_YEAR * 0.5);
  });

  it('preserves element metadata', () => {
    const elements = buildTimelineElements([
      {
        id: 'test',
        label: 'Test Label',
        start: [2000],
        end: [2010],
        category: 'history',
        group: 'custom-group',
        interactive: false,
      },
    ]);

    const el = elements[0];
    expect(el.id).toBe('test');
    expect(el.label).toBe('Test Label');
    expect(el.category).toBe('history');
    expect(el.group).toBe('custom-group');
    expect(el.interactive).toBe(false);
  });

  it('defaults interactive to true and group to category', () => {
    const elements = buildTimelineElements([
      {
        id: 'test',
        label: 'Test',
        start: [2000],
        category: 'cat',
      },
    ]);

    expect(elements[0].interactive).toBe(true);
    expect(elements[0].group).toBe('cat');
  });
});
