import { fetchQuizData } from '../fetchQuizData';

describe('fetchQuizData', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses CSV response into QuizDataRow objects', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('id,city,country\nparis,Paris,France\nberlin,Berlin,Germany'),
    });

    const rows = await fetchQuizData('/data/test.csv');
    expect(rows).toEqual([
      { id: 'paris', city: 'Paris', country: 'France' },
      { id: 'berlin', city: 'Berlin', country: 'Germany' },
    ]);
    expect(globalThis.fetch).toHaveBeenCalledWith('/data/test.csv');
  });

  it('returns empty array for CSV with only headers', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('id,city,country'),
    });

    const rows = await fetchQuizData('/data/empty.csv');
    expect(rows).toEqual([]);
  });

  it('throws on HTTP error response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchQuizData('/data/missing.csv')).rejects.toThrow(
      'Failed to fetch quiz data from /data/missing.csv: 404 Not Found',
    );
  });

  it('throws on network error', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(fetchQuizData('/data/broken.csv')).rejects.toThrow('Failed to fetch');
  });
});
