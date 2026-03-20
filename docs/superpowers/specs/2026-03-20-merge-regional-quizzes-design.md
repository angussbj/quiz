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

"Common" and "Rib Cage" bone sub-quizzes are dropped. Users can still see bones by region via chips.

Countries retains `dataFilter: { column: 'is_sovereign', values: ['true'] }` as a base filter. Chips filter on top of that.

Rivers retains the `scalerank` data filter. Chips filter on top of that.

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
- Camera positions are optional per group -- groups without a position are ignored in the bounding box calculation (the camera just includes whatever the other selected groups need).

Camera position values come from the current regional definitions' `initialCameraPosition` fields, plus reasonable defaults for regions that currently auto-fit.

### 4. Navigation Changes

Each merged quiz becomes one entry in the nav tree. Paths shorten:
- `['Geography', 'Capitals', 'Europe']` -> `['Geography', 'Capitals']`
- `['Geography', 'Countries', 'Europe']` -> `['Geography', 'Countries']`
- `['Geography', 'Flags', 'Europe']` -> `['Geography', 'Flags']`
- `['Geography', 'Rivers', 'European Rivers']` -> `['Geography', 'Rivers']`
- `['Science', 'Biology', 'Human Bones', 'Head Bones']` -> `['Science', 'Biology', 'Human Bones']`

Quiz IDs: keep the "world" variant IDs (`geo-capitals-world`, `geo-countries-world`, `geo-flags-world`, `geo-rivers-world`, `sci-human-bones-all`). Old IDs are simply removed.

### 5. Background Labels Filtering

`QuizPage.tsx` currently uses `dataFilter` to determine which background labels (country names) to show. After merging, this logic needs to consider the active chip selection instead -- when only "Europe" chips are selected, only European country labels should appear.

This requires passing the active group filter state down to the background labels computation, or recomputing labels when chip selection changes.

## What Doesn't Change

- `groupFilterColumn` chip UI in `QuizSetupPanel` -- already works
- `countFilteredElements`, `ActiveQuiz` filtering logic -- unchanged
- All quiz modes, visualizations, data loading pipelines -- unchanged
- Timeline quizzes, Periodic Table, Largest Cities -- already use chips, untouched
- Supporting data paths, toggle definitions, presets, mode constraints -- carried over from existing base objects

## Implementation Order

1. CSV data changes (split Americas into North/South America)
2. Add `groupFilterCameraPositions` to `QuizDefinition` type
3. Implement camera bounding box logic for chip selection
4. Merge quiz registry definitions
5. Update background labels filtering to respect chip selection
6. Update tests
7. Manual verification of all 5 merged quizzes
