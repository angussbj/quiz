"""
Fix rib path groupings in human-bones.csv by re-extracting from the source SVG.

The source SVG has style attributes distinguishing main rib outlines (#967348 stroke)
from shading/detail paths. This script re-clusters them properly and updates the CSV.

Usage: python3 scripts/fixRibPaths.py [/path/to/Human_skeleton_front_en.svg]
"""

import xml.etree.ElementTree as ET
import re
import csv
import sys
import io

CSV_PATH = 'public/data/science/biology/human-bones.csv'
SVG_PATH = sys.argv[1] if len(sys.argv) > 1 else '/tmp/Human_skeleton_front_en.svg'
SVG_NS = 'http://www.w3.org/2000/svg'
MIDLINE_X = 203.0
BONE_STROKE = '#967348'


def path_bbox(d):
    nums = re.findall(r'-?\d+(?:\.\d+)?', d)
    if len(nums) < 2:
        return None
    coords = []
    for i in range(0, len(nums) - 1, 2):
        coords.append((float(nums[i]), float(nums[i + 1])))
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return {
        'minX': min(xs), 'maxX': max(xs),
        'minY': min(ys), 'maxY': max(ys),
        'midX': (min(xs) + max(xs)) / 2,
        'midY': (min(ys) + max(ys)) / 2,
        'height': max(ys) - min(ys),
        'width': max(xs) - min(xs),
    }


def cluster_by_y_gaps(paths, num_clusters):
    if len(paths) <= num_clusters:
        return [[p] for p in paths]

    sorted_paths = sorted(paths, key=lambda p: p['bbox']['midY'])

    gaps = []
    for i in range(1, len(sorted_paths)):
        gap = sorted_paths[i]['bbox']['midY'] - sorted_paths[i - 1]['bbox']['midY']
        gaps.append((gap, i))

    gaps.sort(reverse=True)
    boundaries = sorted([g[1] for g in gaps[:num_clusters - 1]])

    clusters = []
    prev = 0
    for b in boundaries:
        clusters.append(sorted_paths[prev:b])
        prev = b
    clusters.append(sorted_paths[prev:])
    return clusters


def parse_csv_line(line):
    reader = csv.reader(io.StringIO(line))
    return next(reader)


def to_csv_line(fields):
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='')
    writer.writerow(fields)
    return output.getvalue()


# ---- Main ----

print(f"Reading SVG: {SVG_PATH}")
tree = ET.parse(SVG_PATH)
root = tree.getroot()

# Find g845
g845 = None
for g in root.iter(f'{{{SVG_NS}}}g'):
    if g.get('id') == 'g845':
        g845 = g
        break

if g845 is None:
    print("ERROR: Could not find g845 in SVG")
    sys.exit(1)

# Extract all paths from g845 (including nested groups)
all_paths = []
for p in g845.iter(f'{{{SVG_NS}}}path'):
    d = p.get('d', '')
    style = p.get('style', '')
    if not d:
        continue
    bbox = path_bbox(d)
    if bbox is None:
        continue
    is_main = BONE_STROKE in style
    side = 'L' if bbox['midX'] < MIDLINE_X else 'R'
    all_paths.append({
        'd': d,
        'style': style,
        'bbox': bbox,
        'is_main': is_main,
        'side': side,
    })

print(f"Found {len(all_paths)} paths in rib group")

main_paths = [p for p in all_paths if p['is_main']]
detail_paths = [p for p in all_paths if not p['is_main']]
print(f"Main outline paths: {len(main_paths)}")
print(f"Detail/shading paths: {len(detail_paths)}")

# Cluster main paths by side
left_main = [p for p in main_paths if p['side'] == 'L']
right_main = [p for p in main_paths if p['side'] == 'R']
print(f"Left main: {len(left_main)}, Right main: {len(right_main)}")

left_clusters = cluster_by_y_gaps(left_main, 12)
right_clusters = cluster_by_y_gaps(right_main, 12)
print(f"Left clusters: {len(left_clusters)}, Right clusters: {len(right_clusters)}")

# Build rib paths
rib_paths = {i: [] for i in range(1, 13)}

for i, cluster in enumerate(left_clusters):
    rib_num = i + 1
    center_y = sum(p['bbox']['midY'] for p in cluster) / len(cluster)
    print(f"Rib {rib_num} L: {len(cluster)} main paths, centerY={center_y:.1f}")
    for p in cluster:
        rib_paths[rib_num].append(p['d'])

for i, cluster in enumerate(right_clusters):
    rib_num = i + 1
    center_y = sum(p['bbox']['midY'] for p in cluster) / len(cluster)
    print(f"Rib {rib_num} R: {len(cluster)} main paths, centerY={center_y:.1f}")
    for p in cluster:
        rib_paths[rib_num].append(p['d'])

# Skip detail paths — they arc across ribs and cause visual noise
print(f"Excluding {len(detail_paths)} detail/shading paths (main outlines only)")

for i in range(1, 13):
    print(f"Rib {i}: {len(rib_paths[i])} total paths")

total = sum(len(v) for v in rib_paths.values())
print(f"Total: {total} (expected {len(all_paths)})")

# ---- Update CSV ----

with open(CSV_PATH, 'r') as f:
    csv_content = f.read()

lines = csv_content.split('\n')
header = parse_csv_line(lines[0])
id_idx = header.index('id')
paths_idx = header.index('paths')

update_count = 0
new_lines = list(lines)

for i in range(1, len(lines)):
    if not lines[i].strip():
        continue
    fields = parse_csv_line(lines[i])
    bone_id = fields[id_idx]
    m = re.match(r'^rib-(\d+)$', bone_id)
    if m:
        rib_num = int(m.group(1))
        fields[paths_idx] = '|'.join(rib_paths[rib_num])
        new_lines[i] = to_csv_line(fields)
        update_count += 1

with open(CSV_PATH, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"\nDone. Updated {update_count} rib rows.")
