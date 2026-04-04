# Ordered Recall Mode

Elements must be named in a specific order (by default, CSV row order). The current element(s) are highlighted on the visualization.

## Sort Columns

`QuizDefinition.orderedRecallSortColumns` declares numeric columns available for sorting. When present, `QuizPage` auto-generates three select toggles and a boolean toggle:

- **Order by** (dropdown) — which numeric column to sort by
- **Sort order** (segmented) — ascending or descending
- **Missing values** (segmented) — exclude, put first, or put last
- **Highlight next** (boolean toggle in display group) — whether to highlight the current element(s)

These are built by `buildOrderedRecallSelectToggles()` and `buildOrderedRecallToggle()` in `src/quiz-modes/ordered-recall/buildOrderedRecallSelectToggles.ts`, and merged into the quiz's toggle arrays in `QuizPage.tsx`.

The select toggles use `group: 'ordering'`, which gets special treatment in `QuizSetupPanel` — rendered in a dedicated section right below the mode selector, not inside `TogglePanel`. The `SelectToggleControl` and `togglePanelStyles` are exported from `TogglePanel` for reuse.

## Tie Groups

When sorting by a column with duplicate values (e.g., year discovered), elements with the same value form a **tie group**. Tie group behavior:

- All elements in the group are highlighted simultaneously
- They can be answered in any order within the group
- Skip marks all remaining elements in the group as missed and advances to the next group
- The prompt shows a range format: "5–11 of 118" (shrinks as elements are answered)
- Missing values (when placed first or last) are all treated as one tie group

`groupByTiedValue()` in `src/quiz-modes/ordered-recall/groupByTiedValue.ts` computes groups from sorted data rows. The session hook (`useOrderedRecallSession`) tracks group index and remaining elements within the current group.

## Range Sort Dropdown

When `orderedRecallSortColumns` has multiple entries, the range filter section shows a "by [Column ▾]" dropdown. This lets users select e.g. "top 10 by length" vs "top 10 by discharge". The same column list drives both the range dropdown and the ordered recall "Order by" dropdown — they're independent selections from the same list.

Range filtering uses runtime rank computation via `computeSortRanks()`. For merged elements (e.g. rivers with tributaries), sort values are aggregated per `SortColumnDefinition.mergeAggregation`:
- `'parent'` (default): use the parent element's CSV value (e.g. discharge at the mouth)
- `'sum'`: sum parent + all merged children (e.g. total length of river system)

The `rankDescending` flag controls ranking direction:
- `true`: highest value = rank 1 ("top N by discharge/length")
- `false` (default): lowest value = rank 1 (sequential index like atomic number)

## Adding Sort Columns to a Quiz

Add `orderedRecallSortColumns` to the quiz definition:

```ts
orderedRecallSortColumns: [
  { column: 'atomic_number', label: 'Atomic number' },
  { column: 'density', label: 'Density', rankDescending: true },
],
```

The first column is the default. The quiz must include `'free-recall-ordered'` in `availableModes`.

For quizzes with element merging (e.g. rivers), specify `mergeAggregation` to control how merged elements' sort values are computed:

```ts
orderedRecallSortColumns: [
  { column: 'discharge_m3s', label: 'Discharge', rankDescending: true },
  { column: 'length_km', label: 'Length', mergeAggregation: 'sum', rankDescending: true },
],
```
