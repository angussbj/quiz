import { renderHook, act } from '@testing-library/react';
import { useWikipediaPreview } from '../useWikipediaPreview';
import * as fetchModule from '../fetchWikipediaExtract';

jest.useFakeTimers();

jest.mock('../fetchWikipediaExtract', () => ({
  fetchWikipediaExtract: jest.fn(),
}));

const mockFetch = fetchModule.fetchWikipediaExtract as jest.MockedFunction<typeof fetchModule.fetchWikipediaExtract>;

describe('useWikipediaPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useWikipediaPreview());
    expect(result.current.previewState.status).toBe('idle');
  });

  it('shows loading state after 1s if fetch is slow', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useWikipediaPreview());

    act(() => result.current.onHoverStart('el-1', 'Paris'));

    // At 400ms: fetch starts (but hasn't resolved)
    act(() => jest.advanceTimersByTime(400));
    expect(result.current.previewState.status).toBe('idle');

    // At 1000ms: show loading
    act(() => jest.advanceTimersByTime(600));
    expect(result.current.previewState.status).toBe('loading');
  });

  it('shows loaded state when fetch completes before 1s', async () => {
    mockFetch.mockResolvedValue({
      extract: 'Paris is the capital.',
      pageUrl: 'https://en.wikipedia.org/wiki/Paris',
    });

    const { result } = renderHook(() => useWikipediaPreview());

    act(() => result.current.onHoverStart('el-1', 'Paris'));

    // Advance past fetch delay (400ms) to trigger the fetch
    act(() => jest.advanceTimersByTime(400));

    // Wait for the fetch promise to resolve
    await act(async () => { await Promise.resolve(); });

    expect(result.current.previewState.status).toBe('loaded');
    if (result.current.previewState.status === 'loaded') {
      expect(result.current.previewState.data.extract).toBe('Paris is the capital.');
    }
  });

  it('returns to idle on hover end', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useWikipediaPreview());

    act(() => result.current.onHoverStart('el-1', 'Paris'));
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.previewState.status).toBe('loading');

    act(() => result.current.onHoverEnd());
    expect(result.current.previewState.status).toBe('idle');
  });

  it('caches successful fetches', async () => {
    mockFetch.mockResolvedValue({
      extract: 'Paris is the capital.',
      pageUrl: 'https://en.wikipedia.org/wiki/Paris',
    });

    const { result } = renderHook(() => useWikipediaPreview());

    // First hover
    act(() => result.current.onHoverStart('el-1', 'Paris'));
    act(() => jest.advanceTimersByTime(400));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.previewState.status).toBe('loaded');

    // Unhover
    act(() => result.current.onHoverEnd());

    // Second hover — should use cache (no new fetch call)
    act(() => result.current.onHoverStart('el-1', 'Paris'));

    // Should show loaded after the show delay from cache
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.previewState.status).toBe('loaded');
    expect(mockFetch).toHaveBeenCalledTimes(1); // only called once
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWikipediaPreview());

    act(() => result.current.onHoverStart('el-1', 'BadPage'));
    act(() => jest.advanceTimersByTime(400));
    await act(async () => { await Promise.resolve(); });

    expect(result.current.previewState.status).toBe('error');
  });

  it('does not cache failed fetches (allows retry)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    mockFetch.mockResolvedValueOnce({
      extract: 'Success on retry.',
      pageUrl: 'https://en.wikipedia.org/wiki/Test',
    });

    const { result } = renderHook(() => useWikipediaPreview());

    // First attempt: fails
    act(() => result.current.onHoverStart('el-1', 'Test'));
    act(() => jest.advanceTimersByTime(400));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.previewState.status).toBe('error');

    // Unhover
    act(() => result.current.onHoverEnd());

    // Retry: should succeed
    act(() => result.current.onHoverStart('el-1', 'Test'));
    act(() => jest.advanceTimersByTime(400));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.previewState.status).toBe('loaded');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
