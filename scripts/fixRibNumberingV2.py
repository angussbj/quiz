"""
Fix rib numbering and separate cartilage paths in human-bones.csv.

The correct mapping (confirmed by visual inspection):
- Hyoid entry's 10 paths = actually rib 1
- SVG g845 cluster 1 (4 paths) = rib 2
- SVG g845 cluster 2 (4 paths) = rib 3
- SVG g845 cluster 3 (4 paths) = rib 4
- SVG g845 cluster 4 (4 paths) = rib 5
- SVG g845 cluster 5 (2 paths) = rib 6
- SVG g845 cluster 6 (2 paths) = rib 7
- SVG g845 cluster 7 (2 paths) = rib 8
- SVG g845 cluster 8 (2 paths) = costal cartilage
- SVG g845 clusters 9-12 = ribs 9-12

Clusters 1-4 each have 2 paths per side: one wide (rib bone) and one narrow
(cartilage). Narrow paths (width < 20) are separated into the costal-cartilage entry.

Usage: python3 scripts/fixRibNumberingV2.py [/path/to/Human_skeleton_front_en.svg]
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
CARTILAGE_WIDTH_THRESHOLD = 20.0  # paths narrower than this are cartilage


def path_bbox(d):
    nums = re.findall(r'-?\d+(?:\.\d+)?', d)
    if len(nums) < 2:
        return None
    coords = [(float(nums[i]), float(nums[i + 1])) for i in range(0, len(nums) - 1, 2)]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return {
        'minX': min(xs), 'maxX': max(xs),
        'minY': min(ys), 'maxY': max(ys),
        'midX': (min(xs) + max(xs)) / 2,
        'midY': (min(ys) + max(ys)) / 2,
        'width': max(xs) - min(xs),
        'height': max(ys) - min(ys),
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


# ---- Extract from SVG ----

print(f"Reading SVG: {SVG_PATH}")
tree = ET.parse(SVG_PATH)
root = tree.getroot()

g845 = None
for g in root.iter(f'{{{SVG_NS}}}g'):
    if g.get('id') == 'g845':
        g845 = g
        break

if g845 is None:
    print("ERROR: Could not find g845 in SVG")
    sys.exit(1)

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
    all_paths.append({'d': d, 'bbox': bbox, 'is_main': is_main, 'side': side})

main_paths = [p for p in all_paths if p['is_main']]
left_main = [p for p in main_paths if p['side'] == 'L']
right_main = [p for p in main_paths if p['side'] == 'R']
print(f"Main outline paths: {len(main_paths)} ({len(left_main)}L + {len(right_main)}R)")

left_clusters = cluster_by_y_gaps(left_main, 12)
right_clusters = cluster_by_y_gaps(right_main, 12)
print(f"Left clusters: {len(left_clusters)}, Right clusters: {len(right_clusters)}")

# ---- Build rib assignments ----
# Cluster indices 0-11 from the SVG. The correct mapping:
# cluster 0 = rib 2, cluster 1 = rib 3, ..., cluster 6 = rib 8
# cluster 7 = costal cartilage
# cluster 8 = rib 9, cluster 9 = rib 10, cluster 10 = rib 11, cluster 11 = rib 12

CLUSTER_TO_RIB = {
    0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8,
    7: None,  # costal cartilage
    8: 9, 9: 10, 10: 11, 11: 12,
}

rib_paths = {i: [] for i in range(1, 13)}
cartilage_paths = []

for side_label, clusters in [('L', left_clusters), ('R', right_clusters)]:
    for ci, cluster in enumerate(clusters):
        rib_num = CLUSTER_TO_RIB.get(ci)
        center_y = sum(p['bbox']['midY'] for p in cluster) / len(cluster)

        if rib_num is None:
            # Costal cartilage cluster
            for p in cluster:
                cartilage_paths.append(p['d'])
            print(f"Cluster {ci} {side_label}: {len(cluster)} paths → costal cartilage (centerY={center_y:.1f})")
            continue

        for p in cluster:
            if p['bbox']['width'] < CARTILAGE_WIDTH_THRESHOLD:
                cartilage_paths.append(p['d'])
                print(f"  Cluster {ci} {side_label}: narrow path (w={p['bbox']['width']:.1f}) → cartilage")
            else:
                rib_paths[rib_num].append(p['d'])

        bone_count = sum(1 for p in cluster if p['bbox']['width'] >= CARTILAGE_WIDTH_THRESHOLD)
        cart_count = sum(1 for p in cluster if p['bbox']['width'] < CARTILAGE_WIDTH_THRESHOLD)
        print(f"Cluster {ci} {side_label}: {len(cluster)} paths → rib {rib_num} ({bone_count} bone + {cart_count} cartilage, centerY={center_y:.1f})")

# ---- Read current CSV ----

with open(CSV_PATH, 'r') as f:
    csv_content = f.read()

lines = csv_content.split('\n')
header = lines[0]
header_fields = next(csv.reader(io.StringIO(header)))
id_idx = header_fields.index('id')
name_idx = header_fields.index('name')
alt_idx = header_fields.index('name_alternates')
paths_idx = header_fields.index('paths')
common_idx = header_fields.index('common')
subregion_idx = header_fields.index('subregion')
region_idx = header_fields.index('region')
x_idx = header_fields.index('x')
y_idx = header_fields.index('y')
label_x_idx = header_fields.index('label_x')
label_y_idx = header_fields.index('label_y')
anchor_x_idx = header_fields.index('anchor_x')
anchor_y_idx = header_fields.index('anchor_y')


def parse_line(line):
    return next(csv.reader(io.StringIO(line)))


def to_csv_line(fields):
    out = io.StringIO()
    csv.writer(out, lineterminator='').writerow(fields)
    return out.getvalue()


# Collect current row data
rows = {}
for i in range(1, len(lines)):
    if not lines[i].strip():
        continue
    fields = parse_line(lines[i])
    rows[fields[id_idx]] = {'line_idx': i, 'fields': fields}

# ---- Get hyoid paths (= rib 1) ----

if 'hyoid' in rows:
    hyoid_fields = rows['hyoid']['fields']
    rib_paths[1] = hyoid_fields[paths_idx].split('|')
    print(f"\nHyoid entry has {len(rib_paths[1])} paths → assigned to rib 1")
    # Clear hyoid paths (no actual hyoid in SVG)
    hyoid_fields[paths_idx] = ''
    lines[rows['hyoid']['line_idx']] = to_csv_line(hyoid_fields)
    print("Hyoid entry: paths cleared (no hyoid paths in SVG)")

# ---- Print rib path counts ----

print("\nFinal rib path counts:")
for i in range(1, 13):
    print(f"  Rib {i}: {len(rib_paths[i])} paths")
print(f"  Costal cartilage: {len(cartilage_paths)} paths")

# ---- Rib metadata ----

RIB_META = {
    1: {'name': 'Rib 1', 'alts': 'first rib|true rib|costa 1', 'common': 'true'},
    2: {'name': 'Rib 2', 'alts': 'second rib|true rib|costa 2', 'common': 'true'},
    3: {'name': 'Rib 3', 'alts': 'third rib|true rib|costa 3', 'common': 'true'},
    4: {'name': 'Rib 4', 'alts': 'fourth rib|true rib|costa 4', 'common': 'true'},
    5: {'name': 'Rib 5', 'alts': 'fifth rib|true rib|costa 5', 'common': 'true'},
    6: {'name': 'Rib 6', 'alts': 'sixth rib|true rib|costa 6', 'common': 'true'},
    7: {'name': 'Rib 7', 'alts': 'seventh rib|true rib|costa 7', 'common': 'true'},
    8: {'name': 'Rib 8', 'alts': 'eighth rib|false rib|costa 8', 'common': ''},
    9: {'name': 'Rib 9', 'alts': 'ninth rib|false rib|costa 9', 'common': ''},
    10: {'name': 'Rib 10', 'alts': 'tenth rib|false rib|costa 10', 'common': ''},
    11: {'name': 'Rib 11', 'alts': 'eleventh rib|floating rib|costa 11', 'common': ''},
    12: {'name': 'Rib 12', 'alts': 'twelfth rib|floating rib|costa 12', 'common': ''},
}

# ---- Update existing rib rows and add missing ones ----

# Collect line indices of all current rib/cartilage entries to know where to insert
rib_line_indices = []
for key, row in rows.items():
    if key.startswith('rib-') or key == 'costal-cartilage':
        rib_line_indices.append(row['line_idx'])

# Update existing rib rows
for key, row in rows.items():
    m = re.match(r'^rib-(\d+)$', key)
    if m:
        rib_num = int(m.group(1))
        # Current rib-1 through rib-6 need renumbering to rib-3 through rib-8
        # Current rib-9 through rib-12 stay
        if rib_num <= 6:
            new_num = rib_num + 2  # rib-1 → rib-3, rib-2 → rib-4, etc.
        else:
            new_num = rib_num  # rib-9 through rib-12 unchanged

        meta = RIB_META[new_num]
        fields = row['fields']
        fields[id_idx] = f'rib-{new_num}'
        fields[name_idx] = meta['name']
        fields[alt_idx] = meta['alts']
        fields[paths_idx] = '|'.join(rib_paths[new_num])
        fields[common_idx] = meta['common']
        fields[subregion_idx] = 'Rib Cage'
        fields[region_idx] = 'Thorax'
        lines[row['line_idx']] = to_csv_line(fields)
        print(f"Updated: rib-{rib_num} → rib-{new_num} ({meta['name']}, {len(rib_paths[new_num])} paths)")

    elif key == 'costal-cartilage':
        fields = row['fields']
        fields[paths_idx] = '|'.join(cartilage_paths)
        lines[row['line_idx']] = to_csv_line(fields)
        print(f"Updated: costal-cartilage ({len(cartilage_paths)} paths)")

# ---- Add missing rib-1 and rib-2 rows ----
# Insert them before the first rib row

first_rib_line = min(rib_line_indices)

# Create rib-1 row (from hyoid paths)
# Use the existing rib row as template for coordinate columns
template = rows.get('rib-1', rows.get('rib-9'))
if template:
    rib1_fields = list(template['fields'])  # copy
else:
    rib1_fields = [''] * len(header_fields)

rib1_meta = RIB_META[1]
rib1_fields[id_idx] = 'rib-1'
rib1_fields[name_idx] = rib1_meta['name']
rib1_fields[alt_idx] = rib1_meta['alts']
rib1_fields[paths_idx] = '|'.join(rib_paths[1])
rib1_fields[common_idx] = rib1_meta['common']
rib1_fields[subregion_idx] = 'Rib Cage'
rib1_fields[region_idx] = 'Thorax'
# Clear position columns (will need manual placement)
rib1_fields[x_idx] = ''
rib1_fields[y_idx] = ''
rib1_fields[label_x_idx] = ''
rib1_fields[label_y_idx] = ''
rib1_fields[anchor_x_idx] = ''
rib1_fields[anchor_y_idx] = ''

rib2_fields = list(rib1_fields)
rib2_meta = RIB_META[2]
rib2_fields[id_idx] = 'rib-2'
rib2_fields[name_idx] = rib2_meta['name']
rib2_fields[alt_idx] = rib2_meta['alts']
rib2_fields[paths_idx] = '|'.join(rib_paths[2])
rib2_fields[common_idx] = rib2_meta['common']

new_rows = [to_csv_line(rib1_fields), to_csv_line(rib2_fields)]
lines = lines[:first_rib_line] + new_rows + lines[first_rib_line:]
print(f"\nInserted rib-1 ({len(rib_paths[1])} paths) and rib-2 ({len(rib_paths[2])} paths) at line {first_rib_line}")

# ---- Write ----

with open(CSV_PATH, 'w') as f:
    f.write('\n'.join(lines))

print(f"\nDone. Wrote {len(lines)} lines.")
