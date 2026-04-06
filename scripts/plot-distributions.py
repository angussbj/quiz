#!/usr/bin/env python3
"""
Plot raw and all candidate curve distributions for every numeric field
in the periodic table and country datasets.

Each row = one field. Columns = raw, linear, log, centered-log, centered-sqrt.
The chosen curve is highlighted with a green border and checkmark.
Gap variance (the decision metric) is shown on each curve's title.
Outliers are shown in purple (low) and pink (high).

Setup (one-time):
    python3 -m venv scripts/.venv
    scripts/.venv/bin/pip install matplotlib numpy

Usage:
    scripts/.venv/bin/python3 scripts/plot-distributions.py

Output: scripts/distributions.png

Calls scripts/adaptive-scale-helper.ts (via npx tsx) per field to get
transformed values using the same algorithm as the production code.
"""

import csv
import json
import math
import os
import subprocess

import matplotlib.pyplot as plt
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)

ELEMENT_CSV = os.path.join(ROOT_DIR, "public/data/science/chemistry/periodic-table.csv")
COUNTRY_CSV = os.path.join(ROOT_DIR, "public/data/borders/world-borders.csv")

ELEMENT_FIELDS = [
    "density",
    "electronegativity",
    "melting_point",
    "boiling_point",
    "year_discovered",
    "half_life",
    "cost_usd_per_kg",
]

COUNTRY_SKIP = {
    "id", "name", "name_alternates", "region", "group", "paths",
    "is_sovereign", "sovereign_parent", "wikipedia",
}

CURVES = ["linear", "log", "centered-log", "centered-sqrt"]


def parse_numeric(value: str) -> float | None:
    if not value or value == "-":
        return None
    cleaned = value.replace("~", "").replace("?", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def load_field(csv_path: str, field: str) -> list[float]:
    values = []
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            v = parse_numeric(row.get(field, ""))
            if v is not None:
                values.append(v)
    return values


def discover_numeric_fields(csv_path: str, skip: set[str]) -> list[str]:
    with open(csv_path, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    fields = []
    for col in reader.fieldnames or []:
        if col in skip:
            continue
        count = sum(1 for r in rows if parse_numeric(r.get(col, "")) is not None)
        if count >= 10:
            fields.append(col)
    return fields


def compute_all_curves(values: list[float]) -> dict:
    """Call the TypeScript helper to get all curve results at once."""
    result = subprocess.run(
        ["npx", "tsx", os.path.join(SCRIPT_DIR, "adaptive-scale-helper.ts")],
        input=json.dumps(values),
        capture_output=True,
        text=True,
        cwd=ROOT_DIR,
    )
    if result.returncode != 0:
        print(f"Error: {result.stderr}", flush=True)
        return {}
    return json.loads(result.stdout)


def plot_raw(ax: plt.Axes, values: list[float], label: str) -> None:
    if not values:
        ax.set_title(f"{label}\n(no data)", fontsize=7)
        return
    arr = np.array(values)
    bins = min(50, max(10, len(arr) // 3))
    ax.hist(arr, bins=bins, density=True, alpha=0.6, color="steelblue", edgecolor="none")
    ax.plot(arr, np.zeros_like(arr), "|", color="black", alpha=0.3, markersize=4)
    ax.set_title(f"{label} (raw, n={len(arr)})", fontsize=7)
    ax.tick_params(labelsize=5)


def plot_curve(ax: plt.Axes, transformed: list[float], curve: str, is_chosen: bool,
               gap_variance: float | None) -> None:
    if not transformed:
        ax.set_title(f"{curve}\n(no data)", fontsize=7)
        return
    arr = np.array(transformed)
    n_outlier_low = int(np.sum(arr < 0))
    n_outlier_high = int(np.sum(arr > 1))

    normal = arr[(arr >= 0) & (arr <= 1)]
    if len(normal) > 0:
        bins = min(30, max(8, len(normal) // 3))
        ax.hist(normal, bins=bins, range=(0, 1), density=False, alpha=0.6,
                color="steelblue", edgecolor="none")

    low_outliers = arr[arr < 0]
    high_outliers = arr[arr > 1]
    if len(low_outliers) > 0:
        ax.hist(low_outliers, bins=max(3, len(low_outliers)), density=False, alpha=0.6,
                color="mediumpurple", edgecolor="none")
    if len(high_outliers) > 0:
        ax.hist(high_outliers, bins=max(3, len(high_outliers)), density=False, alpha=0.6,
                color="hotpink", edgecolor="none")

    gv_str = f"\ngap var: {gap_variance:.5f}" if gap_variance is not None else ""
    outlier_str = ""
    if n_outlier_low > 0 or n_outlier_high > 0:
        parts = []
        if n_outlier_low > 0:
            parts.append(f"{n_outlier_low} low")
        if n_outlier_high > 0:
            parts.append(f"{n_outlier_high} high")
        outlier_str = f"\noutliers: {', '.join(parts)}"

    color = "green" if is_chosen else "black"
    weight = "bold" if is_chosen else "normal"
    marker = " ✓" if is_chosen else ""
    ax.set_title(f"{curve}{marker}{gv_str}{outlier_str}", fontsize=6, color=color, fontweight=weight)
    ax.tick_params(labelsize=5)

    if is_chosen:
        for spine in ax.spines.values():
            spine.set_edgecolor("green")
            spine.set_linewidth(2)


def main():
    country_fields = discover_numeric_fields(COUNTRY_CSV, COUNTRY_SKIP)

    all_fields: list[tuple[str, list[float]]] = []
    for f in ELEMENT_FIELDS:
        all_fields.append((f"Element: {f}", load_field(ELEMENT_CSV, f)))
    for f in country_fields:
        all_fields.append((f"Country: {f}", load_field(COUNTRY_CSV, f)))

    n_cols = 1 + len(CURVES)  # raw + one per curve
    n_rows = len(all_fields)

    fig, axes = plt.subplots(n_rows, n_cols, figsize=(n_cols * 3.5, n_rows * 2))
    if n_rows == 1:
        axes = axes.reshape(1, -1)

    for row_idx, (label, values) in enumerate(all_fields):
        plot_raw(axes[row_idx, 0], values, label)

        if not values:
            for col_idx in range(1, n_cols):
                axes[row_idx, col_idx].set_visible(False)
            continue

        result = compute_all_curves(values)
        chosen = result.get("chosen", "linear")

        for col_idx, curve in enumerate(CURVES):
            ax = axes[row_idx, col_idx + 1]
            curve_data = result.get("curves", {}).get(curve, {})
            transformed = curve_data.get("transformed", [])
            gap_var = curve_data.get("gapVariance")
            plot_curve(ax, transformed, curve, curve == chosen, gap_var)

    fig.suptitle("Adaptive Colour Scale: Raw + All Candidate Curves", fontsize=14, y=1.002)
    fig.tight_layout()

    output_path = os.path.join(SCRIPT_DIR, "distributions.png")
    fig.savefig(output_path, dpi=150, bbox_inches="tight")
    print(f"Saved to {output_path}")


if __name__ == "__main__":
    main()
