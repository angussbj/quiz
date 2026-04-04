import { countFilteredElementsFromElements } from '../countFilteredElements';
import type { VisualizationElement } from '@/visualizations/VisualizationElement';
import type { SortColumnDefinition } from '@/quiz-definitions/QuizDefinition';

function makeElement(id: string): VisualizationElement {
  return {
    id,
    label: id,
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    interactive: true,
  };
}

function makeRow(id: string, values: Record<string, string>): Readonly<Record<string, string>> {
  return { id, name: id, ...values };
}

const dischargeSortCol: SortColumnDefinition = {
  column: 'discharge',
  label: 'Discharge',
  rankDescending: true,
};

const lengthSortCol: SortColumnDefinition = {
  column: 'length',
  label: 'Length',
  mergeAggregation: 'sum',
  rankDescending: true,
};

describe('countFilteredElementsFromElements', () => {
  const elements = [
    makeElement('amazon'),
    makeElement('nile'),
    makeElement('yangtze'),
    makeElement('mississippi'),
  ];

  const dataRows = [
    makeRow('amazon', { discharge: '209000', length: '6400', continent: 'South America' }),
    makeRow('nile', { discharge: '2830', length: '6650', continent: 'Africa' }),
    makeRow('yangtze', { discharge: '30000', length: '6300', continent: 'Asia' }),
    makeRow('mississippi', { discharge: '16800', length: '3730', continent: 'North America' }),
  ];

  const noToggles: Record<string, boolean> = {};

  it('counts all elements when no range is set', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, dischargeSortCol,
      undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, true,
    );
    expect(count).toBe(4);
  });

  it('counts top N by discharge (descending: highest = rank 1)', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, dischargeSortCol,
      undefined, 2, undefined, undefined,
      undefined, undefined, undefined, true,
    );
    // Rank 1: Amazon (209000), Rank 2: Yangtze (30000)
    expect(count).toBe(2);
  });

  it('counts top N by length (descending: longest = rank 1)', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, lengthSortCol,
      undefined, 2, undefined, undefined,
      undefined, undefined, undefined, true,
    );
    // Rank 1: Nile (6650), Rank 2: Amazon (6400)
    expect(count).toBe(2);
  });

  it('applies group filter', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, dischargeSortCol,
      undefined, undefined,
      'continent', new Set(['Africa', 'Asia']),
      undefined, undefined, undefined, true,
    );
    // Only Nile and Yangtze
    expect(count).toBe(2);
  });

  it('combines group filter with range', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, dischargeSortCol,
      undefined, 1,
      'continent', new Set(['Africa', 'Asia']),
      undefined, undefined, undefined, true,
    );
    // Group filter: Nile, Yangtze. Rank by discharge: Yangtze (30000) > Nile (2830). Top 1 = Yangtze.
    expect(count).toBe(1);
  });

  it('returns 0 when no groups selected', () => {
    const count = countFilteredElementsFromElements(
      elements, dataRows, noToggles, dischargeSortCol,
      undefined, undefined,
      'continent', new Set(),
      undefined, undefined, undefined, true,
    );
    expect(count).toBe(0);
  });

  it('excludes elements without sort value data', () => {
    const sparseRows = [
      makeRow('amazon', { discharge: '209000', continent: 'South America' }),
      makeRow('nile', { discharge: '', continent: 'Africa' }),
      makeRow('yangtze', { discharge: '30000', continent: 'Asia' }),
      makeRow('mississippi', { discharge: '16800', continent: 'North America' }),
    ];
    const count = countFilteredElementsFromElements(
      elements, sparseRows, noToggles, dischargeSortCol,
      undefined, 2, undefined, undefined,
      undefined, undefined, undefined, true,
    );
    // Nile has no discharge → excluded from ranking. Top 2 from remaining 3.
    expect(count).toBe(2);
  });

  it('handles merge with sum aggregation for length', () => {
    const mergeElements = [
      makeElement('nile'),
      makeElement('albert-nile'),
    ];
    const mergeRows = [
      makeRow('nile', { length: '6000', tributary_of: '' }),
      makeRow('albert-nile', { length: '183', tributary_of: 'nile' }),
    ];
    const toggles = { mergeTributaries: true };
    const count = countFilteredElementsFromElements(
      mergeElements, mergeRows, toggles, lengthSortCol,
      undefined, undefined, undefined, undefined,
      'tributary_of', undefined, undefined, true,
    );
    // Albert Nile merged into Nile → 1 element (Nile with length 6183)
    expect(count).toBe(1);
  });
});
