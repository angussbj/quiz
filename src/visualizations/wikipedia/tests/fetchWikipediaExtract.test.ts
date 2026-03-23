import { fetchWikipediaExtract } from '../fetchWikipediaExtract';

describe('fetchWikipediaExtract', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns extract and pageUrl for a valid page', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        type: 'standard',
        extract: 'Paris is the capital of France.',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Paris' } },
      }),
    });

    const result = await fetchWikipediaExtract('Paris');
    expect(result.extract).toBe('Paris is the capital of France.');
    expect(result.pageUrl).toBe('https://en.wikipedia.org/wiki/Paris');
  });

  it('throws for disambiguation pages', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        type: 'disambiguation',
        extract: '',
        content_urls: { desktop: { page: '' } },
      }),
    });

    await expect(fetchWikipediaExtract('Paris')).rejects.toThrow('Disambiguation page');
  });

  it('throws for non-ok responses', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchWikipediaExtract('NonexistentPage')).rejects.toThrow('Wikipedia API returned 404');
  });

  it('passes AbortSignal to fetch', async () => {
    const controller = new AbortController();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        type: 'standard',
        extract: 'Test',
        content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Test' } },
      }),
    });

    await fetchWikipediaExtract('Test', controller.signal);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
