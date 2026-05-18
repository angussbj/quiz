# Map Projections

Map quizzes can render data using one of several projections. The default is
`equirectangular`; users can switch to `web-mercator` or `equal-earth` from
the **Map projection** dropdown in the Advanced setup panel.

## Storage convention

All map data on disk (border paths, lake paths, river paths, capital
coordinates, etc.) is stored in the **equirectangular** viewBox space:

- `x = wrapLng(longitude)` — degrees east, optionally shifted by +360 to keep
  the Pacific continuous (see `WRAP_LONGITUDE` in `projectGeo.ts`).
- `y = -latitude` — negated so north is up in SVG.

This is a deliberate choice: equirectangular is the canonical "raw" form
because every other projection can be derived from it without lossy
inversion. SVG path strings only contain absolute `M`/`L`/`Z` commands, so a
re-projection pass can decode each `(x, y)` coordinate pair back to lat/lng
and project through any other projection.

## Re-projection pipeline

Re-projection happens in `ActiveQuiz` once per session — it's a memoised
transformation of `elements`, `backgroundPaths`, `lakePaths`,
`backgroundLabels`, and `initialCameraPosition`/`groupFilterCameraPositions`.
For the default equirectangular projection, every helper is an identity
pass-through.

```
QuizPage → buildElements (equirectangular)
        → useBackgroundPaths (equirectangular)
        → useLakePaths (equirectangular)
        ↓
QuizShell (selectValues['mapProjection'] live state)
        ↓
ActiveQuiz
   reprojectElements()             ─┐
   reprojectBackgroundPaths()       ├─→ projected viewBox space
   reprojectLakePaths()             │
   reprojectBackgroundLabels()      │
   reprojectCameraRect()           ─┘
        ↓
Mode → MapRenderer
```

The renderer never sees the original equirectangular data when a non-default
projection is active. All downstream code (`computeViewBox`, clustering,
`findClosestStrokeElement`, `RevealPulse`, label placement) works in the
projected viewBox coordinates without modification — it just consumes
whatever positions and bounds the elements carry.

## Available projections

| Id                | Label             | Use                                           |
| ----------------- | ----------------- | --------------------------------------------- |
| `equirectangular` | Equirectangular   | Default. Lat/lng map directly to (x, y).      |
| `web-mercator`    | Web Mercator      | Familiar tile-style stretch; clipped to ±85°. |
| `equal-earth`     | Equal Earth       | Šavrič 2018 equal-area pseudocylindrical.     |

All three projections produce viewBox output where 1° of longitude at the
equator equals 1 viewBox unit. This means the projection switch never causes
a wholesale change of unit scale — dot sizes, label sizes, and stroke widths
read consistently across projections.

## Adding a projection

1. Add a new file in `src/visualizations/map/projections/` (e.g.
   `mollweide.ts`) exporting a `MapProjection` with a unique id and a `project`
   function. Match the equirectangular x scale at the equator (1° = 1 unit).
2. Register it in `getMapProjection.ts` and `ALL_MAP_PROJECTIONS`.
3. Add an option entry in `mapProjectionSelectToggle` in `quizRegistry.ts`.
4. Add a unit test under `tests/`.

## Enabling on a quiz

Map quizzes inherit the projection toggle from one of the shared bases
(`capitalsQuizBase`, `countriesQuizBase`, `riversQuizBase`). Each base
includes `mapProjectionSelectToggle` in its `selectToggles` and lists
`'mapProjection'` in its `advancedPanel.selectToggleKeys`. New map quizzes
that extend these bases get the dropdown automatically.

For a brand-new map quiz that doesn't extend a base, copy these two entries:

```ts
selectToggles: [
  // ...
  mapProjectionSelectToggle,
],
advancedPanel: {
  selectToggleKeys: ['mapProjection'],
  // ...
},
```

## Limitations

- Path coordinates that contain anything other than `M`/`L`/`Z` commands (e.g.
  bezier curves) are not re-projected accurately. The current data pipeline
  never produces such paths.
- For projections that wrap the antimeridian non-trivially (Mollweide,
  globe-like), the existing `wrapPathCoordinates` shift may produce
  discontinuities if the data spans more than 360° of longitude. Equal Earth
  and Web Mercator behave well because they keep x linear in longitude.
- Topographic tile rendering (if added later) is currently equirectangular
  only — the tile system would need its own projection awareness.
