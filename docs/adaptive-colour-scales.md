# Adaptive Colour Scales

Automatic curve selection for mapping numeric data to colour gradients. Used by the periodic table renderer and designed for reuse by any visualization.

## Core Module

**`src/utilities/adaptiveScale.ts`** — standalone utility, no domain dependencies.

### API

```typescript
type ScaleCurve = 'linear' | 'log' | 'centered-log' | 'centered-sqrt';

interface AdaptiveScale {
  readonly transform: (value: number) => number;  // raw → normalized
  readonly curve: ScaleCurve;
  readonly center: number | undefined;
}

function computeAdaptiveScale(values: ReadonlyArray<number>): AdaptiveScale;
```

Call with raw numeric values. Returns a `transform` function that maps values to a normalized range:
- **[0, 1]** for non-outlier values (the main gradient)
- **(1, 2]** for high outliers
- **[-1, 0)** for low outliers

### Algorithm

1. **Find the densest region** — sort values, compute MAD (median absolute deviation), slide a window of width 1.4826×MAD across sorted values, pick the center of the window with the most points.

2. **Evaluate four candidate curves**, each applied to the sorted values:
   - **Linear**: identity `x`
   - **Log**: `log(x − min + 1)` — pure logarithmic, ideal for data spanning many orders of magnitude
   - **Centered-log**: `sign(x−c)·log(|x−c|+1)` — logarithmic expansion around the densest point `c`
   - **Centered-sqrt**: `sign(x−c)·√|x−c|` — mild expansion around `c`

3. **Score each by outlier-aware gap variance**:
   - Apply Tukey fences (0.75×IQR) on the transformed values to split into low outliers, normal, and high outliers
   - Normalize each group independently to [0, 1]
   - Compute gap variance per group (variance of gaps between consecutive sorted values — lower = more even)
   - Weighted average by group size × visual resolution weight (hue-angle ratio)

4. **Detect outliers** on the winning curve via the same Tukey fences.

5. **Normalize** non-outlier values to [0, 1]. Outliers get a secondary range: high outliers to [1, 2], low outliers to [-1, 0].

### Visual Resolution Weights

The gap variance weighting accounts for how much visual space each range occupies in the output gradient. Default weights match a blue→red HSL gradient:

| Range | Hue span | Weight |
|-------|----------|--------|
| Normal [0, 1] | 240° (blue → red) | 1.0 |
| High outlier [1, 2] | 25° (red-pink → magenta) | 25/240 ≈ 0.104 |
| Low outlier [-1, 0] | 15° (blue-purple → deep purple) | 15/240 ≈ 0.063 |

Custom weights can be passed to `outlierAwareGapVariance()` for different gradient designs.

## Integration: Periodic Table

**`src/visualizations/periodic-table/elementColorScale.ts`** uses `computeAdaptiveScale` in `computeGradientColors()`. Raw numeric values (density, electronegativity, cost, etc.) are passed directly — no manual log/sqrt transforms needed.

The `gradientColor()` function maps the three ranges to HSL colours:
- `[0, 1]` → blue (240°) through green to red (0°)
- `(1, 2]` → red-pink (345°) to magenta (320°)
- `[-1, 0)` → blue-purple (255°) to deep purple (270°)

### Current Curve Selections (Periodic Table)

| Field | Curve | Outliers | Why |
|-------|-------|----------|-----|
| Density | centered-log | 0 | Clustered 1–10 g/cm³, outliers to 22 |
| Electronegativity | centered-log | 2 | Clustered 1.0–2.5, Oxygen and Fluorine as outliers |
| Melting point | centered-sqrt | 0 | Mild cluster in mid-range |
| Boiling point | centered-sqrt | 0 | Similar to melting point |
| Year discovered | linear | 1 | Fairly even; Phosphorus (1669) as low outlier |
| Half-life | log | 2 | Spans μs to Gy; Bismuth and Thorium as outliers |
| Cost | log | 24 | Spans $0.09 to $10³¹; synthetic elements as outliers |

## Diagnostic Scripts

**`scripts/plot-distributions.py`** — generates a comparison chart of all candidate curves for every numeric field in both element and country datasets.

**`scripts/adaptive-scale-helper.ts`** — Node helper called by the Python script; applies all four curves to input data and returns transformed values + gap variances using the same algorithm as production code.

Setup and usage:
```bash
python3 -m venv scripts/.venv
scripts/.venv/bin/pip install matplotlib numpy
scripts/.venv/bin/python3 scripts/plot-distributions.py
open scripts/distributions.png
```

## Reuse in Other Visualizations

To add adaptive colour scales to a new visualization:

1. Collect raw numeric values (skip undefined/missing)
2. Call `computeAdaptiveScale(values)`
3. For each element, call `scale.transform(rawValue)` to get a normalized position
4. Map the position to a colour:
   - `[0, 1]` → your main gradient
   - `> 1` → high outlier colour (or gradient within [1, 2])
   - `< 0` → low outlier colour (or gradient within [-1, 0])
