import { z } from 'zod';
import { loadQuizData } from '../loadQuizData';

const citySchema = z.object({
  id: z.string(),
  city: z.string(),
  country: z.string(),
});

/** Fail the test if any console.warn calls were made. */
function expectNoWarnings(warnSpy: jest.SpyInstance): void {
  if (warnSpy.mock.calls.length > 0) {
    const warnings = warnSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    throw new Error(`Expected no warnings but got:\n${warnings}`);
  }
}

describe('loadQuizData', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('parses CSV into typed rows', () => {
    const csv = 'id,city,country\nparis,Paris,France\nberlin,Berlin,Germany';
    const rows = loadQuizData(csv, citySchema);

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('paris');
    expect(rows[0].city).toBe('Paris');
    expect(rows[0].country).toBe('France');
    expect(rows[1].id).toBe('berlin');
    expect(rows[1].city).toBe('Berlin');
    expect(rows[1].country).toBe('Germany');
    expectNoWarnings(warnSpy);
  });

  it('returns empty array for empty CSV', () => {
    expect(loadQuizData('', citySchema)).toEqual([]);
    expectNoWarnings(warnSpy);
  });

  it('returns empty array for header-only CSV', () => {
    expect(loadQuizData('id,city\n', citySchema)).toEqual([]);
    expectNoWarnings(warnSpy);
  });

  it('throws if CSV has no id column', () => {
    const csv = 'city,country\nParis,France';
    expect(() => loadQuizData(csv, citySchema)).toThrow('CSV must have an "id" column');
  });

  it('handles quoted fields with commas', () => {
    const csv = 'id,city,country\nparis,"Paris, City of Light",France';
    const rows = loadQuizData(csv, citySchema);
    expect(rows[0].city).toBe('Paris, City of Light');
    expectNoWarnings(warnSpy);
  });

  it('handles empty fields', () => {
    const csv = 'id,city,country\nparis,,France';
    const rows = loadQuizData(csv, citySchema);
    expect(rows[0].city).toBe('');
    expect(rows[0].country).toBe('France');
    expectNoWarnings(warnSpy);
  });

  it('preserves id in both the id property and as a column', () => {
    const csv = 'id,name\nabc,Test';
    const schema = z.object({ id: z.string(), name: z.string() });
    const rows = loadQuizData(csv, schema);
    expect(rows[0].id).toBe('abc');
    expectNoWarnings(warnSpy);
  });

  it('omits rows that fail validation and warns for each', () => {
    const strictSchema = z.object({
      id: z.string(),
      value: z.string().min(1, 'must not be empty'),
    });
    const csv = 'id,value\na,good\nb,\nc,also good';
    const rows = loadQuizData(csv, strictSchema);

    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe('a');
    expect(rows[1].id).toBe('c');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('CSV row 3'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('must not be empty'),
    );
  });

  it('supports schema transforms like coercing to number', () => {
    const numericSchema = z.object({
      id: z.string(),
      latitude: z.coerce.number(),
      longitude: z.coerce.number(),
    });
    const csv = 'id,latitude,longitude\nparis,48.856,2.352';
    const rows = loadQuizData(csv, numericSchema);

    expect(rows[0].latitude).toBe(48.856);
    expect(rows[0].longitude).toBe(2.352);
    expectNoWarnings(warnSpy);
  });

  it('warns with correct row numbers for multiple invalid rows', () => {
    const strictSchema = z.object({
      id: z.string().min(1, 'id required'),
      name: z.string(),
    });
    const csv = 'id,name\n,Alice\nb,Bob\n,Charlie';
    const rows = loadQuizData(csv, strictSchema);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('b');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CSV row 2'));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('CSV row 4'));
  });
});
