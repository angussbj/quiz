import type { VisualizationElement } from '@/visualizations/VisualizationElement';

/**
 * Computes 1-based ranks for elements by their sortValue.
 * Elements without a sortValue are excluded from ranking.
 * Ties receive the same rank; the next rank skips accordingly
 * (e.g. two elements tied at rank 3 → next rank is 5).
 *
 * @param ascending - If true, smallest sortValue gets rank 1.
 *   If false, largest sortValue gets rank 1.
 */
export function computeSortRanks(
  elements: ReadonlyArray<VisualizationElement>,
  ascending: boolean = true,
): ReadonlyMap<string, number> {
  const withValue = elements.flatMap((el) =>
    el.sortValue !== undefined ? [{ id: el.id, value: el.sortValue }] : [],
  );

  withValue.sort((a, b) => ascending ? a.value - b.value : b.value - a.value);

  const ranks = new Map<string, number>();
  let rank = 1;
  for (let i = 0; i < withValue.length; i++) {
    // Tied elements share the same rank
    if (i > 0 && withValue[i].value !== withValue[i - 1].value) {
      rank = i + 1;
    }
    ranks.set(withValue[i].id, rank);
  }
  return ranks;
}
