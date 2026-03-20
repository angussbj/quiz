# Merge Regional Quiz Definitions into Single Quizzes with Chip Filters

## Problem

The quiz registry has ~28 separate definitions for regional variants of 5 quiz types (Capitals, Countries, Flags, Rivers, Bones). Each regional variant is nearly identical except for a `dataFilter`. This creates maintenance burden and clutters the navigation tree.

The `groupFilterColumn` chip filter mechanism already exists and works well for Largest Cities, Periodic Table, and timeline quizzes. Regional quizzes should use the same pattern.

## Changes

### 1. CSV Data Changes

**`world-capitals.csv`** and **`world-borders.csv`**: Change the `region` column so that entries currently under "Americas" are split into "North America" and "South America" as top-level region values. Currently:
- `region=Americas, subregion=North America|Central America|Caribbean`
- `region=Americas, subregion=South America`

After:
- `region=North America` (covers North America, Central America, Caribbean subregions)
- `region=South America`

The borders CSV uses a `group` column that currently has values like "Caribbean", "Central America", "South America" -- these are the sub-group equivalents. After the split, countries that had `group=Caribbean` or `group=Central America` will have `region=North America`. The `group` column itself does not need to change (it remains the sub-grouping for visual display).

Rivers CSV (`world-rivers.csv`) already uses a `continent` column with separate "North America" and "South America" values -- no change needed.

Bones CSV (`human-bones.csv`) already has a `region` column with Head, Torso, Arm, Hand, Leg, Foot -- no change needed.

### 2. Quiz Registry Consolidation

Merge regional variants into single definitions:

| Before | After | Chip column | `hideFilteredElements` |
|--------|-------|-------------|----------------------|
| 7 Capitals (Europe, Asia, Africa, N. America, S. America, Oceania, World) | 1 "World Capitals" | `region` | no (show as context) |
| 7 Countries (same regions) | 1 "World Countries" | `region` | no |
| 7 Flags (same regions) | 1 "World Flags" | `region` | yes (grid has no spatial context) |
| 7 Rivers (6 continents + World) | 1 "World Rivers" | `continent` | no |
| 9 Bones (Common, All, Head, Torso, Rib Cage, Arm, Hand, Leg, Foot) | 1 "Human Bones" | `region` | yes (anatomy has clear regions) |

"Common" and "Rib Cage" bone sub-quizzes are deliberately dropped. Users see bones by region via chips.

Countries retains `dataFilter: { column: 'is_sovereign', values: ['true'] }` as a base filter. Chips filter on top of that.

Rivers retains a `scalerank` data filter with values `['0','1','2','3','4','5','6']` (the broader regional range, not the narrower world-only range). With chip filters, users viewing a single continent will see the same detail level as before.

**Column mapping note:** For Flags, `columnMappings.group` stays as `subregion` for visual sub-grouping within the flag grid. This is independent of `groupFilterColumn` which is `region` for chip filtering. For Countries, `columnMappings.group` stays as `group` (borders CSV sub-grouping) while `groupFilterColumn` is `region`.

### 3. Per-Group Camera Positions

Add a new optional field to `QuizDefinition`:

```ts
readonly groupFilterCameraPositions?: Readonly<Record<string, {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}>>;
```

Behavior:
- When a subset of chips are selected, compute the smallest bounding rectangle containing all selected groups' camera rects.
- When all chips are selected (or none deselected), use the quiz-level `initialCameraPosition` or auto-fit.
- Camera positions are optional per group -- groups without a position are ignored in the bounding box calculation.
- If all selected groups lack camera positions, fall back to `initialCameraPosition` or auto-fit.

Camera position values come from the current regional definitions' `initialCameraPosition` fields, plus reasonable defaults for regions that currently auto-fit (compute from data bounding boxes during implementation).

### 4. Navigation Changes

Each merged quiz becomes one entry in the nav tree. Paths shorten:
- `['Geography', 'Capitals', 'Europe']` -> `['Geography', 'Capitals']`
- `['Geography', 'Countries', 'Europe']` -> `['Geography', 'Countries']`
- `['Geography', 'Flags', 'Europe']` -> `['Geography', 'Flags']`
- `['Geography', 'Rivers', 'European Rivers']` -> `['Geography', 'Rivers']`
- `['Science', 'Biology', 'Human Bones', 'Head Bones']` -> `['Science', 'Biology', 'Human Bones']`

Quiz IDs: keep the "world" variant IDs (`geo-capitals-world`, `geo-countries-world`, `geo-flags-world`, `geo-rivers-world`, `sci-human-bones-all`). Old IDs are simply removed -- no redirects (personal project, no external consumers).

### 5. Background Labels Filtering

`QuizPage.tsx` currently computes background labels in `QuizPageLoaded` using `definition.dataFilter` to filter by region. After merging, the `dataFilter` no longer contains region info (it's now handled by chips).

**Solution:** Move the region-filtering of background labels into `ActiveQuiz`, which already has access to `config.selectedGroups`. `QuizPage` passes unfiltered (sovereign-only) labels. `ActiveQuiz` filters them by matching the label's `region` field against the selected groups from chip state.

For this to work cleanly, the background labels' `region` field (from `world-borders.csv`) must use the same region values as the quiz data's `groupFilterColumn`. This is already ensured by step 1 (both CSVs get the same Americas split).

## What Doesn't Change

- `groupFilterColumn` chip UI in `QuizSetupPanel` -- already works
- `countFilteredElements`, `ActiveQuiz` filtering logic -- unchanged
- All quiz modes, visualizations, data loading pipelines -- unchanged
- Timeline quizzes, Periodic Table, Largest Cities -- already use chips, untouched
- Supporting data paths, toggle definitions, presets, mode constraints -- carried over from existing base objects

## Implementation Order

1. CSV data changes (split Americas into North/South America in both `world-capitals.csv` and `world-borders.csv`)
2. Add `groupFilterCameraPositions` to `QuizDefinition` type
3. Implement camera bounding box logic for chip selection
4. Merge quiz registry definitions
5. Verify existing `groupFilterColumn` consumers handle new definitions correctly
6. Move background labels filtering into `ActiveQuiz` to respect chip selection
7. Update tests
8. Manual verification of all 5 merged quizzes
