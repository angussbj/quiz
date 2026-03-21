"""
Recompute x, y, anchor_x, anchor_y, label_x, label_y for all bones in
human-bones.csv based on their current paths.

Run this after any changes to the paths column.
Usage:
    python3 scripts/recomputeBoneLabels.py
"""

import csv
import re
import math
import os

CSV_PATH = 'public/data/science/biology/human-bones.csv'


def extract_coords(d_attr):
    """Extract coordinate pairs from SVG path d attribute."""
    numbers = re.findall(r'[-+]?\d*\.?\d+', d_attr)
    coords = []
    for i in range(0, len(numbers) - 1, 2):
        try:
            coords.append((float(numbers[i]), float(numbers[i + 1])))
        except ValueError:
            continue
    return coords


def path_centroid(d_attr):
    coords = extract_coords(d_attr)
    if not coords:
        return 0.0, 0.0
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def multi_path_centroid(paths):
    """Centroid across all paths in a list."""
    all_x, all_y = [], []
    for p in paths:
        coords = extract_coords(p)
        all_x.extend(c[0] for c in coords)
        all_y.extend(c[1] for c in coords)
    if not all_x:
        return 0.0, 0.0
    return sum(all_x) / len(all_x), sum(all_y) / len(all_y)


def compute_label_positions(entries):
    """
    Compute label_x, label_y, anchor_x, anchor_y for all entries.
    Each entry is a dict with keys: id, name, paths (list of path strings).
    Sets label_x, label_y, anchor_x, anchor_y on each entry dict.
    """
    # Find overall bounds to determine margins
    all_xs = []
    for entry in entries:
        for p in entry['paths']:
            coords = extract_coords(p)
            all_xs.extend(c[0] for c in coords)

    if not all_xs:
        return

    global_min_x = min(all_xs)
    global_max_x = max(all_xs)
    midline_x = (global_min_x + global_max_x) / 2

    padding = 30
    left_margin_x = global_min_x - padding
    right_margin_x = global_max_x + padding

    class SideCandidate:
        def __init__(self, entry, anchor_x, anchor_y, side):
            self.entry = entry
            self.anchor_x = anchor_x
            self.anchor_y = anchor_y
            self.side = side

    left_candidates = []
    right_candidates = []

    for entry in entries:
        all_bounds = []
        for p in entry['paths']:
            coords = extract_coords(p)
            if not coords:
                continue
            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            cx = sum(xs) / len(xs)
            cy = sum(ys) / len(ys)
            all_bounds.append((min(xs), min(ys), max(xs), max(ys), cx, cy))

        if not all_bounds:
            left_candidates.append(SideCandidate(entry, entry['x'], entry['y'], 'left'))
            continue

        left_paths = [b for b in all_bounds if b[4] < midline_x]
        right_paths = [b for b in all_bounds if b[4] >= midline_x]

        # Try local midline split if all on one side
        if left_paths and not right_paths and len(all_bounds) >= 4:
            lm = (min(b[4] for b in all_bounds) + max(b[4] for b in all_bounds)) / 2
            ll = [b for b in all_bounds if b[4] < lm]
            lr = [b for b in all_bounds if b[4] >= lm]
            if ll and lr:
                left_paths, right_paths = ll, lr
        elif right_paths and not left_paths and len(all_bounds) >= 4:
            lm = (min(b[4] for b in all_bounds) + max(b[4] for b in all_bounds)) / 2
            ll = [b for b in all_bounds if b[4] < lm]
            lr = [b for b in all_bounds if b[4] >= lm]
            if ll and lr:
                left_paths, right_paths = ll, lr

        if left_paths:
            ax = sum(b[4] for b in left_paths) / len(left_paths)
            ay = sum(b[5] for b in left_paths) / len(left_paths)
            left_candidates.append(SideCandidate(entry, ax, ay, 'left'))

        if right_paths:
            ax = sum(b[4] for b in right_paths) / len(right_paths)
            ay = sum(b[5] for b in right_paths) / len(right_paths)
            right_candidates.append(SideCandidate(entry, ax, ay, 'right'))

        if not left_paths and not right_paths:
            left_candidates.append(SideCandidate(entry, entry['x'], entry['y'], 'left'))

    band_size = 30

    def count_in_band(candidates, y, band):
        return sum(1 for c in candidates if abs(c.anchor_y - y) < band)

    assigned = {}
    entries_with_both = []

    for entry in entries:
        lc = [c for c in left_candidates if c.entry is entry]
        rc = [c for c in right_candidates if c.entry is entry]
        if lc and rc:
            entries_with_both.append((entry, lc[0], rc[0]))
        elif lc:
            assigned[entry['id']] = lc[0]
        elif rc:
            assigned[entry['id']] = rc[0]

    entries_with_both.sort(key=lambda t: (t[1].anchor_y + t[2].anchor_y) / 2)

    for entry, lc, rc in entries_with_both:
        la = [c for c in assigned.values() if c.side == 'left']
        ra = [c for c in assigned.values() if c.side == 'right']
        ll = count_in_band(la, lc.anchor_y, band_size)
        rl = count_in_band(ra, rc.anchor_y, band_size)
        if ll != rl:
            assigned[entry['id']] = lc if ll < rl else rc
        else:
            assigned[entry['id']] = lc if len(la) <= len(ra) else rc

    # Force series (Rib 1-12, etc.) to same side
    series_groups = {}
    for eid, candidate in assigned.items():
        m = re.match(r'^(.+?)[\s-]?\d+$', candidate.entry['name'])
        if m:
            prefix = m.group(1).strip()
            series_groups.setdefault(prefix, []).append(eid)

    for prefix, eids in sorted(series_groups.items(), key=lambda kv: len(kv[1]), reverse=True):
        if len(eids) < 3:
            continue
        left_count = sum(1 for eid in eids if assigned[eid].side == 'left')
        right_count = len(eids) - left_count
        majority_side = 'left' if left_count >= right_count else 'right'
        total_left = sum(1 for c in assigned.values() if c.side == 'left')
        n = len(eids)
        left_after_left = total_left + (n - left_count)
        left_after_right = total_left - left_count
        balance_if_left = abs(2 * left_after_left - len(assigned))
        balance_if_right = abs(2 * left_after_right - len(assigned))
        if majority_side == 'left':
            target_side = 'right' if balance_if_right < balance_if_left - 2 else 'left'
        else:
            target_side = 'left' if balance_if_left < balance_if_right - 2 else 'right'
        for eid in eids:
            if assigned[eid].side != target_side:
                entry = assigned[eid].entry
                cands = ([c for c in left_candidates if c.entry is entry]
                         if target_side == 'left'
                         else [c for c in right_candidates if c.entry is entry])
                if cands:
                    assigned[eid] = cands[0]

    left_group = sorted([c for c in assigned.values() if c.side == 'left'], key=lambda c: c.anchor_y)
    right_group = sorted([c for c in assigned.values() if c.side == 'right'], key=lambda c: c.anchor_y)

    min_label_gap = 17

    def space_labels(group):
        n = len(group)
        if n == 0:
            return []
        if n == 1:
            return [group[0].anchor_y]
        anchor_ys = [c.anchor_y for c in group]
        total_span = (n - 1) * min_label_gap
        median_y = anchor_ys[n // 2]
        block_top = median_y - total_span / 2
        block_bottom = median_y + total_span / 2
        anchor_min = anchor_ys[0]
        anchor_max = anchor_ys[-1]
        if block_top > anchor_min:
            shift = block_top - anchor_min
            block_top -= shift
            block_bottom -= shift
        if block_bottom < anchor_max:
            block_bottom = anchor_max
        if n > 1:
            actual_span = block_bottom - block_top
            step = max(actual_span / (n - 1), min_label_gap)
            block_bottom = block_top + step * (n - 1)
        else:
            step = 0
        label_ys = [block_top + i * step for i in range(n)]
        for _ in range(10):
            changed = False
            for i in range(n):
                lb = label_ys[i - 1] + min_label_gap if i > 0 else -1e9
                ub = label_ys[i + 1] - min_label_gap if i < n - 1 else 1e9
                new_y = max(lb, min(ub, anchor_ys[i]))
                if abs(new_y - label_ys[i]) > 0.1:
                    label_ys[i] = new_y
                    changed = True
            if not changed:
                break
        return label_ys

    def segments_cross(ax1, ay1, lx1, ly1, ax2, ay2, lx2, ly2):
        def cp(ox, oy, ax, ay, bx, by):
            return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox)
        d1 = cp(ax2, ay2, lx2, ly2, ax1, ay1)
        d2 = cp(ax2, ay2, lx2, ly2, lx1, ly1)
        d3 = cp(ax1, ay1, lx1, ly1, ax2, ay2)
        d4 = cp(ax1, ay1, lx1, ly1, lx2, ly2)
        return ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
               ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0))

    def uncross(group, label_ys, margin_x):
        for _ in range(50):
            swapped = False
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    if segments_cross(
                        group[i].anchor_x, group[i].anchor_y, margin_x, label_ys[i],
                        group[j].anchor_x, group[j].anchor_y, margin_x, label_ys[j],
                    ):
                        label_ys[i], label_ys[j] = label_ys[j], label_ys[i]
                        swapped = True
            if not swapped:
                break

    def reorder_and_respace(group, label_ys):
        paired = sorted(zip(label_ys, group), key=lambda p: p[0])
        reordered = [p[1] for p in paired]
        return reordered, space_labels(reordered)

    left_label_ys = space_labels(left_group)
    right_label_ys = space_labels(right_group)

    for _ in range(5):
        uncross(left_group, left_label_ys, left_margin_x)
        uncross(right_group, right_label_ys, right_margin_x)
        left_group, left_label_ys = reorder_and_respace(left_group, left_label_ys)
        right_group, right_label_ys = reorder_and_respace(right_group, right_label_ys)

    # Write back to entries
    for candidate, label_y in zip(left_group, left_label_ys):
        candidate.entry['anchor_x'] = candidate.anchor_x
        candidate.entry['anchor_y'] = candidate.anchor_y
        candidate.entry['label_x'] = left_margin_x
        candidate.entry['label_y'] = label_y

    for candidate, label_y in zip(right_group, right_label_ys):
        candidate.entry['anchor_x'] = candidate.anchor_x
        candidate.entry['anchor_y'] = candidate.anchor_y
        candidate.entry['label_x'] = right_margin_x
        candidate.entry['label_y'] = label_y


def main():
    # Read CSV
    with open(CSV_PATH, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    # Build entry dicts for bones that have paths
    entries = []
    for row in rows:
        paths_raw = row.get('paths', '')
        paths = [p for p in paths_raw.split('|') if p.strip()]
        if not paths:
            continue
        cx, cy = multi_path_centroid(paths)
        entry = {
            'id': row['id'],
            'name': row['name'],
            'paths': paths,
            'x': cx,
            'y': cy,
            'anchor_x': cx,
            'anchor_y': cy,
            'label_x': cx,
            'label_y': cy,
            '_row': row,
        }
        entries.append(entry)

    # Compute label positions
    compute_label_positions(entries)

    # Write back to rows
    for entry in entries:
        row = entry['_row']
        row['x'] = f'{entry["x"]:.1f}'
        row['y'] = f'{entry["y"]:.1f}'
        row['label_x'] = f'{entry["label_x"]:.1f}'
        row['label_y'] = f'{entry["label_y"]:.1f}'
        row['anchor_x'] = f'{entry["anchor_x"]:.1f}'
        row['anchor_y'] = f'{entry["anchor_y"]:.1f}'

    # Write CSV back
    with open(CSV_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f'Updated {len(entries)} entries in {CSV_PATH}')


if __name__ == '__main__':
    main()
