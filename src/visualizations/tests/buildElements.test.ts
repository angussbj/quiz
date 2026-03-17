import type { QuizDataRow } from '@/quiz-definitions/QuizDataRow';
import { buildElements } from '../buildElements';
import { isMapElement } from '../map/MapElement';
import { isGridElement } from '../periodic-table/GridElement';
import { isTimelineElement } from '../timeline/TimelineElement';

function makeMapRow(): QuizDataRow {
  return { id: 'map-1', label: 'France', latitude: '48', longitude: '2' };
}

function makeGridRow(): QuizDataRow {
  return { id: 'grid-1', label: 'Hydrogen', row: '0', column: '0', symbol: 'H' };
}

function makeTimelineRow(): QuizDataRow {
  return { id: 'tl-1', label: 'WW1', start_year: '1914', end_year: '1918', category: 'war' };
}

describe('buildElements', () => {
  it('dispatches to buildMapElements for map type', () => {
    const elements = buildElements('map', [makeMapRow()], {});
    expect(elements).toHaveLength(1);
    expect(isMapElement(elements[0])).toBe(true);
  });

  it('dispatches to buildGridElements for grid type', () => {
    const elements = buildElements('grid', [makeGridRow()], {});
    expect(elements).toHaveLength(1);
    expect(isGridElement(elements[0])).toBe(true);
  });

  it('dispatches to buildTimelineElementsFromRows for timeline type', () => {
    const elements = buildElements('timeline', [makeTimelineRow()], {});
    // Timeline may include spacer elements
    const interactive = elements.filter((e) => e.interactive);
    expect(interactive).toHaveLength(1);
    expect(isTimelineElement(interactive[0])).toBe(true);
  });

  it('returns empty array for empty rows across all types', () => {
    expect(buildElements('map', [], {})).toEqual([]);
    expect(buildElements('grid', [], {})).toEqual([]);
    expect(buildElements('timeline', [], {})).toEqual([]);
  });

  it('passes columnMappings through to the builder', () => {
    const row: QuizDataRow = {
      id: 'test',
      name: 'CustomLabel',
      latitude: '10',
      longitude: '20',
    };
    const elements = buildElements('map', [row], { label: 'name' });
    expect(elements[0].label).toBe('CustomLabel');
  });
});
