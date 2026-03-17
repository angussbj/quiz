import { assignTracks } from '../assignTracks';
import type { TimelineTimestamp } from '../TimelineTimestamp';

function makeElement(
  id: string,
  start: TimelineTimestamp,
  end?: TimelineTimestamp,
  track?: number,
) {
  return { id, start, end, track };
}

describe('assignTracks', () => {
  it('assigns single element to track 0', () => {
    const elements = [makeElement('a', [1900], [1950])];
    expect(assignTracks(elements)).toEqual({ a: 0 });
  });

  it('assigns non-overlapping elements to the same track', () => {
    // [1900]-[1919] occupies 1900 to end-of-1919 (=1920.0)
    // [1920]-[1939] occupies 1920 to end-of-1939 — no overlap
    const elements = [
      makeElement('a', [1900], [1919]),
      makeElement('b', [1920], [1939]),
    ];
    const result = assignTracks(elements);
    expect(result.a).toBe(0);
    expect(result.b).toBe(0);
  });

  it('assigns overlapping elements to different tracks', () => {
    const elements = [
      makeElement('a', [1900], [1950]),
      makeElement('b', [1920], [1970]),
    ];
    const result = assignTracks(elements);
    expect(result.a).toBe(0);
    expect(result.b).toBe(1);
  });

  it('reuses tracks when space is available', () => {
    const elements = [
      makeElement('a', [1900], [1920]),
      makeElement('b', [1910], [1930]),
      makeElement('c', [1925], [1940]),
    ];
    const result = assignTracks(elements);
    expect(result.a).toBe(0);
    expect(result.b).toBe(1);
    // c starts after a ends, so it can reuse track 0
    expect(result.c).toBe(0);
  });

  it('respects explicit track assignments', () => {
    const elements = [
      makeElement('a', [1900], [1950], 2),
      makeElement('b', [1900], [1950]),
    ];
    const result = assignTracks(elements);
    expect(result.a).toBe(2);
    expect(result.b).toBe(0);
  });

  it('handles point events (no end) at same time on same track', () => {
    const elements = [
      makeElement('a', [1900]),
      makeElement('b', [1900]),
    ];
    const result = assignTracks(elements);
    // Point events have zero duration, so they both fit on track 0
    expect(result.a).toBe(0);
    expect(result.b).toBe(0);
  });

  it('separates overlapping year-range events', () => {
    const elements = [
      makeElement('a', [1900], [1950]),
      makeElement('b', [1900], [1910]),
    ];
    const result = assignTracks(elements);
    expect(result.a).not.toBe(result.b);
  });

  it('handles empty input', () => {
    expect(assignTracks([])).toEqual({});
  });

  it('respects minimum gap', () => {
    const elements = [
      makeElement('a', [1900], [1920]),
      makeElement('b', [1921], [1940]),
    ];
    // With a 5-year gap, b can't reuse track 0
    const result = assignTracks(elements, 5);
    expect(result.a).toBe(0);
    expect(result.b).toBe(1);
  });

  it('handles many overlapping elements', () => {
    const elements = Array.from({ length: 10 }, (_, i) =>
      makeElement(`e${i}`, [1900], [2000]),
    );
    const result = assignTracks(elements);
    // Each element should get a unique track
    const tracks = new Set(Object.values(result));
    expect(tracks.size).toBe(10);
  });
});
