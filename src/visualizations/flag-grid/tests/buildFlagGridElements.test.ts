import { buildFlagGridElements } from '../buildFlagGridElements';
import { FLAG_CELL_WIDTH, FLAG_CELL_HEIGHT, FLAG_CELL_STEP_X, FLAG_CELL_STEP_Y, FLAG_DEFAULT_COLUMNS } from '../flagGridLayout';
import { isFlagGridElement } from '../FlagGridElement';

const sampleRows = [
  { id: 'paris', city: 'Paris', country: 'France', country_code: 'fr', subregion: 'Western Europe' },
  { id: 'berlin', city: 'Berlin', country: 'Germany', country_code: 'de', subregion: 'Western Europe' },
  { id: 'rome', city: 'Rome', country: 'Italy', country_code: 'it', subregion: 'Southern Europe' },
  { id: 'madrid', city: 'Madrid', country: 'Spain', country_code: 'es', subregion: 'Southern Europe' },
  { id: 'lisbon', city: 'Lisbon', country: 'Portugal', country_code: 'pt', subregion: 'Southern Europe' },
  { id: 'vienna', city: 'Vienna', country: 'Austria', country_code: 'at', subregion: 'Central Europe' },
  { id: 'brussels', city: 'Brussels', country: 'Belgium', country_code: 'be', subregion: 'Western Europe' },
  { id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', country_code: 'nl', subregion: 'Western Europe' },
  { id: 'copenhagen', city: 'Copenhagen', country: 'Denmark', country_code: 'dk', subregion: 'Northern Europe' },
];

const columnMappings = {
  answer: 'country',
  label: 'country',
  flag: 'country_code',
  group: 'subregion',
};

describe('buildFlagGridElements', () => {
  it('returns elements for all rows', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    expect(elements).toHaveLength(sampleRows.length);
  });

  it('creates FlagGridElements', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    for (const element of elements) {
      expect(isFlagGridElement(element)).toBe(true);
    }
  });

  it('sets flag URLs from country_code column', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    const flagUrls = elements.map((e) => {
      if (isFlagGridElement(e)) return e.flagUrl;
      return '';
    });
    // All original country codes should be present (order is shuffled)
    const codes = sampleRows.map((r) => `/flags/${r.country_code}.svg`);
    expect(flagUrls.sort()).toEqual(codes.sort());
  });

  it('uses country as label from column mappings', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    const labels = elements.map((e) => e.label).sort();
    const expectedLabels = sampleRows.map((r) => r.country).sort();
    expect(labels).toEqual(expectedLabels);
  });

  it('sets group from subregion column', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    const groups = new Set(elements.map((e) => e.group));
    expect(groups).toContain('Western Europe');
    expect(groups).toContain('Southern Europe');
  });

  it('arranges elements in 8-column grid layout', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    for (const element of elements) {
      if (!isFlagGridElement(element)) continue;
      expect(element.column).toBeLessThan(FLAG_DEFAULT_COLUMNS);
      expect(element.row).toBeGreaterThanOrEqual(0);
    }
    // 9 elements = 8 in first row + 1 in second row
    const rows = elements.filter(isFlagGridElement).map((e) => e.row);
    expect(Math.max(...rows)).toBe(1);
  });

  it('computes correct viewBox positions', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    for (const element of elements) {
      if (!isFlagGridElement(element)) continue;
      const expectedX = element.column * FLAG_CELL_STEP_X;
      const expectedY = element.row * FLAG_CELL_STEP_Y;
      expect(element.viewBoxCenter.x).toBe(expectedX + FLAG_CELL_WIDTH / 2);
      expect(element.viewBoxCenter.y).toBe(expectedY + FLAG_CELL_HEIGHT / 2);
      expect(element.viewBoxBounds.minX).toBe(expectedX);
      expect(element.viewBoxBounds.minY).toBe(expectedY);
      expect(element.viewBoxBounds.maxX).toBe(expectedX + FLAG_CELL_WIDTH);
      expect(element.viewBoxBounds.maxY).toBe(expectedY + FLAG_CELL_HEIGHT);
    }
  });

  it('marks all elements as interactive', () => {
    const elements = buildFlagGridElements(sampleRows, columnMappings);
    for (const element of elements) {
      expect(element.interactive).toBe(true);
    }
  });

  it('preserves input order (renderer shuffles at mount)', () => {
    const inputIds = sampleRows.map((r) => r.id);
    for (let i = 0; i < 5; i++) {
      const elements = buildFlagGridElements(sampleRows, columnMappings);
      expect(elements.map((e) => e.id)).toEqual(inputIds);
    }
  });
});
