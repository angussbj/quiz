/**
 * Fetch the first paragraph of a Wikipedia article via the REST API.
 * Returns the extract text and the canonical page URL.
 */

export interface WikipediaExtract {
  readonly extract: string;
  readonly pageUrl: string;
}

/**
 * Fetch Wikipedia summary for a given page slug (the last part of the URL,
 * e.g. "General_relativity" for https://en.wikipedia.org/wiki/General_relativity).
 *
 * Returns null if the page doesn't exist or is a disambiguation page.
 */
export async function fetchWikipediaExtract(
  slug: string,
  signal?: AbortSignal,
): Promise<WikipediaExtract> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'QuizApp/1.0 (educational)' },
    signal,
  });

  if (!res.ok) {
    throw new Error(`Wikipedia API returned ${res.status}`);
  }

  const data: { type: string; extract: string; content_urls: { desktop: { page: string } } } =
    await res.json();

  if (data.type === 'disambiguation') {
    throw new Error('Disambiguation page');
  }

  return {
    extract: data.extract,
    pageUrl: data.content_urls.desktop.page,
  };
}
