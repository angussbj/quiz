import { buildStarMap3DElements } from '../buildStarMap3DElements';
import { isStarMap3DElement } from '../StarMap3DElement';

const sampleRows: ReadonlyArray<Readonly<Record<string, string>>> = [
  {
    id: 'proxima-centauri',
    rank: '1',
    name: 'Proxima Centauri',
    name_alternates: 'Gl 551',
    distance_ly: '4.23',
    x: '-1.54',
    y: '-1.18',
    z: '-3.75',
    spectral_class: 'M',
    spectral_type: 'M5Ve',
    luminosity: '0.0000577',
    magnitude: '11.01',
    star_count: '1',
    wikipedia: 'Proxima_Centauri',
  },
  {
    id: 'sirius-a-and-b',
    rank: '7',
    name: 'Sirius A and B',
    name_alternates: 'Gl 244|9Alp CMa',
    distance_ly: '8.6',
    x: '-1.61',
    y: '8.08',
    z: '-2.47',
    spectral_class: 'A',
    spectral_type: 'A0m...',
    luminosity: '22.827',
    magnitude: '-1.44',
    star_count: '2',
    wikipedia: 'Sirius',
  },
];

const columnMappings = { answer: 'name', label: 'name', group: 'spectral_class' };

describe('buildStarMap3DElements', () => {
  it('builds elements from CSV rows', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(elements).toHaveLength(2);
  });

  it('uses row id as element id', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(elements[0].id).toBe('proxima-centauri');
    expect(elements[1].id).toBe('sirius-a-and-b');
  });

  it('sets 3D coordinates from x, y, z columns', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    const el = elements[0];
    expect(el.viewBoxCenter.x).toBe(-1.54);
    expect(el.viewBoxCenter.y).toBe(-1.18);
    expect(el.viewBoxCenter.z).toBe(-3.75);
  });

  it('sets spectral class as group', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(elements[0].group).toBe('M');
    expect(elements[1].group).toBe('A');
  });

  it('elements pass isStarMap3DElement type guard', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(isStarMap3DElement(elements[0])).toBe(true);
  });

  it('parses star-specific numeric fields', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    const el = elements[0];
    if (!isStarMap3DElement(el)) throw new Error('Expected StarMap3DElement');
    expect(el.luminosity).toBeCloseTo(0.0000577, 5);
    expect(el.magnitude).toBe(11.01);
    expect(el.distanceLy).toBe(4.23);
    expect(el.starCount).toBe(1);
  });

  it('includes alternates in promptSubtitle', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(elements[0].promptSubtitle).toBe('(also: Gl 551)');
    expect(elements[1].promptSubtitle).toBe('(also: Gl 244, 9Alp CMa)');
  });

  it('sets wikipedia slug', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    expect(elements[0].wikipediaSlug).toBe('Proxima_Centauri');
    expect(elements[1].wikipediaSlug).toBe('Sirius');
  });

  it('handles missing optional fields gracefully', () => {
    const minimal: ReadonlyArray<Readonly<Record<string, string>>> = [
      {
        id: 'test-star',
        rank: '999',
        name: 'Test Star',
        name_alternates: '',
        distance_ly: '10',
        x: '1',
        y: '2',
        z: '3',
        spectral_class: '',
        spectral_type: '',
        luminosity: '',
        magnitude: '',
        star_count: '',
        wikipedia: '',
      },
    ];
    const elements = buildStarMap3DElements(minimal, columnMappings);
    expect(elements).toHaveLength(1);
    const el = elements[0];
    if (!isStarMap3DElement(el)) throw new Error('Expected StarMap3DElement');
    expect(el.group).toBe('Unknown');
    expect(el.luminosity).toBe(0);
    expect(el.promptSubtitle).toBeUndefined();
    expect(el.wikipediaSlug).toBe('');
  });

  it('marks all elements as interactive', () => {
    const elements = buildStarMap3DElements(sampleRows, columnMappings);
    for (const el of elements) {
      expect(el.interactive).toBe(true);
    }
  });
});
