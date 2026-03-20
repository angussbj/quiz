"""
Generate human-bones.csv from the Wikimedia skeleton SVG.

Source: https://commons.wikimedia.org/wiki/File:Human_skeleton_front_en.svg
License: CC BY-SA 3.0

The SVG has Inkscape layers with labeled groups for most bones, but some
groups are unlabeled (ribs, femur right, etc.). This script:
1. Maps all labeled and unlabeled SVG groups to bone names
2. Separates the 101-path rib group (g845) into individual ribs by Y-position
3. Merges left/right pairs into a single bone entry (since the quiz treats them as one)
4. Breaks down hands and feet into individual bones (carpals, metacarpals, phalanges by digit, etc.)
5. Computes centroid coordinates from path data for label placement
6. Outputs CSV with: id, name, name_alternates, region, subregion, common, paths, x, y

Usage:
    python3 scripts/generateHumanBones.py /path/to/Human_skeleton_front_en.svg

Output:
    public/data/science/biology/human-bones.csv
"""

import xml.etree.ElementTree as ET
import re
import csv
import sys
import os
from dataclasses import dataclass, field

SVG_NS = 'http://www.w3.org/2000/svg'
INK_NS = 'http://www.inkscape.org/namespaces/inkscape'


@dataclass
class BoneEntry:
    id: str
    name: str
    name_alternates: str = ''
    region: str = ''
    subregion: str = ''
    common: str = 'true'  # whether this is a "commonly known" bone
    paths: list = field(default_factory=list)
    x: float = 0.0
    y: float = 0.0
    # Label position fields (computed by compute_label_positions)
    label_x: float = 0.0
    label_y: float = 0.0
    anchor_x: float = 0.0
    anchor_y: float = 0.0


def extract_path_numbers(d_attr: str) -> list[tuple[float, float]]:
    """Extract coordinate pairs from an SVG path d attribute (rough approximation)."""
    numbers = re.findall(r'[-+]?\d*\.?\d+', d_attr)
    coords = []
    for i in range(0, len(numbers) - 1, 2):
        try:
            coords.append((float(numbers[i]), float(numbers[i + 1])))
        except ValueError:
            continue
    return coords


def path_centroid(d_attr: str) -> tuple[float, float]:
    """Compute approximate centroid of an SVG path."""
    coords = extract_path_numbers(d_attr)
    if not coords:
        return 0.0, 0.0
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return sum(xs) / len(xs), sum(ys) / len(ys)


def path_bounds(d_attr: str) -> tuple[float, float, float, float]:
    """Get bounding box (minX, minY, maxX, maxY) of an SVG path."""
    coords = extract_path_numbers(d_attr)
    if not coords:
        return 0, 0, 0, 0
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return min(xs), min(ys), max(xs), max(ys)


def collect_paths(element) -> list[str]:
    """Collect all path d attributes from an element or group."""
    paths = []
    for p in element.iter(f'{{{SVG_NS}}}path'):
        d = p.get('d', '')
        if d:
            paths.append(d)
    return paths


def multi_path_centroid(paths: list[str]) -> tuple[float, float]:
    """Compute centroid across multiple paths."""
    all_x, all_y = [], []
    for p in paths:
        cx, cy = path_centroid(p)
        if cx != 0 or cy != 0:
            all_x.append(cx)
            all_y.append(cy)
    if not all_x:
        return 0.0, 0.0
    return sum(all_x) / len(all_x), sum(all_y) / len(all_y)


def separate_ribs(rib_group) -> list[BoneEntry]:
    """
    Separate the 101-path rib group into individual rib pairs.

    Strategy: Sort all main-outline paths by their Y centroid to identify rib pairs.
    The rib cage has 12 pairs. From top to bottom:
    - Ribs 1-7: "True ribs" (connect directly to sternum)
    - Ribs 8-10: "False ribs" (connect via cartilage)
    - Ribs 11-12: "Floating ribs" (don't connect at front)
    """
    # Collect ALL paths with their centroids
    all_paths = []
    for p in rib_group.iter(f'{{{SVG_NS}}}path'):
        d = p.get('d', '')
        style = p.get('style', '')
        if not d:
            continue
        cx, cy = path_centroid(d)
        bounds = path_bounds(d)
        width = bounds[2] - bounds[0]
        height = bounds[3] - bounds[1]
        all_paths.append({
            'd': d,
            'cx': cx,
            'cy': cy,
            'bounds': bounds,
            'width': width,
            'height': height,
            'style': style,
            'is_main': '#967348' in style,  # has bone stroke = main outline
        })

    # Midline of the skeleton (sternum X)
    midline_x = 203.0

    # Classify paths as left or right of midline
    left_main = [p for p in all_paths if p['is_main'] and p['cx'] < midline_x]
    right_main = [p for p in all_paths if p['is_main'] and p['cx'] >= midline_x]

    # Sort by Y coordinate (top to bottom = rib 1 to rib 12)
    left_main.sort(key=lambda p: p['cy'])
    right_main.sort(key=lambda p: p['cy'])

    print(f"  Rib analysis: {len(left_main)} left main paths, {len(right_main)} right main paths")
    print(f"  Total paths in group: {len(all_paths)}")

    # We expect roughly 12 main outline paths per side
    # Group nearby paths into ribs using Y-proximity
    def cluster_by_y(paths, num_clusters=12):
        """Cluster paths into N groups by Y proximity."""
        if len(paths) <= num_clusters:
            return [[p] for p in paths]

        # Sort by Y
        sorted_paths = sorted(paths, key=lambda p: p['cy'])

        # Use gap-based clustering: find the biggest Y gaps
        if len(sorted_paths) <= 1:
            return [sorted_paths]

        gaps = []
        for i in range(1, len(sorted_paths)):
            gap = sorted_paths[i]['cy'] - sorted_paths[i-1]['cy']
            gaps.append((gap, i))

        # Take the top (num_clusters - 1) biggest gaps as cluster boundaries
        gaps.sort(reverse=True)
        boundaries = sorted([g[1] for g in gaps[:num_clusters - 1]])

        clusters = []
        prev = 0
        for b in boundaries:
            clusters.append(sorted_paths[prev:b])
            prev = b
        clusters.append(sorted_paths[prev:])
        return clusters

    left_clusters = cluster_by_y(left_main, 12)
    right_clusters = cluster_by_y(right_main, 12)

    print(f"  Left rib clusters: {len(left_clusters)}, Right rib clusters: {len(right_clusters)}")

    # Now assign shading/detail paths to the nearest main path cluster
    detail_paths = [p for p in all_paths if not p['is_main']]

    def assign_detail_to_cluster(detail, clusters):
        """Find the nearest cluster for a detail path."""
        best_cluster = None
        best_dist = float('inf')
        for i, cluster in enumerate(clusters):
            for main_p in cluster:
                dist = abs(detail['cy'] - main_p['cy']) + abs(detail['cx'] - main_p['cx']) * 0.5
                if dist < best_dist:
                    best_dist = dist
                    best_cluster = i
        return best_cluster

    # Create rib entries
    entries = []
    num_ribs = min(len(left_clusters), len(right_clusters), 12)

    for rib_num in range(1, num_ribs + 1):
        left_idx = rib_num - 1
        right_idx = rib_num - 1

        rib_paths = []
        if left_idx < len(left_clusters):
            rib_paths.extend([p['d'] for p in left_clusters[left_idx]])
        if right_idx < len(right_clusters):
            rib_paths.extend([p['d'] for p in right_clusters[right_idx]])

        # Assign nearby detail paths
        for detail in detail_paths:
            if detail['cx'] < midline_x:
                cluster_idx = assign_detail_to_cluster(detail, left_clusters)
                if cluster_idx == left_idx:
                    rib_paths.append(detail['d'])
            else:
                cluster_idx = assign_detail_to_cluster(detail, right_clusters)
                if cluster_idx == right_idx:
                    rib_paths.append(detail['d'])

        cx, cy = multi_path_centroid(rib_paths)

        # Determine rib type
        if rib_num <= 7:
            rib_type = "true rib"
        elif rib_num <= 10:
            rib_type = "false rib"
        else:
            rib_type = "floating rib"

        common = 'true' if rib_num <= 7 else ''

        entries.append(BoneEntry(
            id=f'rib-{rib_num}',
            name=f'Rib {rib_num}',
            name_alternates=f'Rib {rib_num}|{rib_type}|costa {rib_num}',
            region='Thorax',
            subregion='Rib Cage',
            common=common,
            paths=rib_paths,
            x=cx,
            y=cy,
        ))

    return entries


# Map of SVG group IDs to bone metadata
# Format: (id, name, name_alternates, region, subregion, common)
LABELED_BONES = {
    'Cranium': ('cranium', 'Cranium', 'skull cap|calvaria|neurocranium', 'Head', 'Skull', 'true'),
    'Mandible': ('mandible', 'Mandible', 'jawbone|lower jaw', 'Head', 'Skull', 'true'),
    'CervicalVertebrae': ('cervical-vertebrae', 'Cervical Vertebrae', 'C1-C7|neck vertebrae|cervical spine', 'Torso', 'Spine', 'true'),
    'ThoracicVertebrae': ('thoracic-vertebrae', 'Thoracic Vertebrae', 'T1-T12|thoracic spine|upper back vertebrae', 'Torso', 'Spine', 'true'),
    'LumbarVertebrae': ('lumbar-vertebrae', 'Lumbar Vertebrae', 'L1-L5|lumbar spine|lower back vertebrae', 'Torso', 'Spine', 'true'),
    'Sacrum': ('sacrum', 'Sacrum', 'sacred bone|sacral vertebrae', 'Torso', 'Spine', 'true'),
    'Coccyx': ('coccyx', 'Coccyx', 'tailbone|coccygeal vertebrae', 'Torso', 'Spine', 'true'),
    'Manubrium': ('manubrium', 'Manubrium', 'manubrium of sternum', 'Torso', 'Thorax', 'true'),
    'Sternum': ('sternum', 'Sternum', 'breastbone|sternum body', 'Torso', 'Thorax', 'true'),
    'ClavicleRight': ('clavicle', 'Clavicle', 'collarbone', 'Torso', 'Shoulder Girdle', 'true'),
    'ClavicleLeft': (None, None, None, None, None, None),  # Merged with right
    'Scapula': ('scapula', 'Scapula', 'shoulder blade|shoulder bone', 'Torso', 'Shoulder Girdle', 'true'),
    'PelvicGirdle': ('pelvis', 'Pelvis', 'pelvic girdle|hip bone|os coxae|innominate bone|ilium', 'Torso', 'Pelvis', 'true'),
    'HumerusLeft': ('humerus', 'Humerus', 'upper arm bone', 'Arm', 'Upper Arm', 'true'),
    'HumerusRight': (None, None, None, None, None, None),  # Merged with left
    'RadiusLeft': ('radius', 'Radius', 'radial bone', 'Arm', 'Forearm', 'true'),
    'RadiusRight': (None, None, None, None, None, None),
    'UlnaLeft': ('ulna', 'Ulna', 'ulnar bone|elbow bone', 'Arm', 'Forearm', 'true'),
    'UlnaRight': (None, None, None, None, None, None),
    'FemurLeft': ('femur', 'Femur', 'thighbone|thigh bone', 'Leg', 'Upper Leg', 'true'),
    'TibiaLeft': ('tibia', 'Tibia', 'shinbone|shin bone', 'Leg', 'Lower Leg', 'true'),
    'TibiaRight': (None, None, None, None, None, None),
    'FibulaLeft': ('fibula', 'Fibula', 'calf bone', 'Leg', 'Lower Leg', 'true'),
    'FibulaRight': (None, None, None, None, None, None),
    'PatellaLeft': ('patella', 'Patella', 'kneecap|knee cap', 'Leg', 'Knee', 'true'),
    'PatellaRight': (None, None, None, None, None, None),
    'FootLeft': (None, None, None, None, None, None),   # Broken into sub-bones
    'FootRight': (None, None, None, None, None, None),
    'HandLeft': (None, None, None, None, None, None),    # Broken into sub-bones
    'HandRight': (None, None, None, None, None, None),
    'Skull': (None, None, None, None, None, None),       # We use Cranium + Mandible instead
}

# Unlabeled groups we identified
UNLABELED_GROUPS = {
    'g845': ('rib-cage', 'RIBS', None, 'Thorax', 'Rib Cage', None),  # Special: separated into individual ribs
    'g801': ('xiphoid-process', 'Xiphoid Process', 'xiphoid|ensiform process', 'Torso', 'Thorax', ''),
    'g3760': (None, None, None, None, None, None),  # Right femur - merged with left
    'g1609': ('hyoid', 'Hyoid', 'hyoid bone|lingual bone', 'Head', 'Throat', ''),
    'g1753': (None, None, None, None, None, None),   # Right elbow detail - merged with ulna
}

# Merge map: SVG IDs whose paths should be combined with a primary bone
# NOTE: g447 is the lower pelvis (ischium/pubis area) — merged into pelvis, NOT femur
MERGE_MAP = {
    'ClavicleLeft': 'ClavicleRight',
    'HumerusRight': 'HumerusLeft',
    'RadiusRight': 'RadiusLeft',
    'UlnaRight': 'UlnaLeft',
    'TibiaRight': 'TibiaLeft',
    'FibulaRight': 'FibulaLeft',
    'PatellaRight': 'PatellaLeft',
    'g3760': 'FemurLeft',
    'g447': 'PelvicGirdle',    # ischium/pubis area — belongs to pelvis, not femur
    'g1753': 'UlnaRight',      # Actually merges into UlnaLeft via chain
}


# ─── Tarsal identification by SVG group ID ───
# Identified by comparing SVG sub-group positions with anatomical reference images.
# Left foot (front view): medial = lower X, lateral = higher X, proximal = lower Y, distal = higher Y
# These will be verified visually and may need adjustment.
TARSAL_NAMES_LEFT = {
    'g13': ('talus', 'Talus', 'ankle bone|astragalus', 'true'),
    'g23': ('cuboid', 'Cuboid', 'cuboid bone|os cuboideum', ''),
    'g29': ('navicular', 'Navicular', 'navicular bone|scaphoid of foot', ''),
    'g35': ('lateral-cuneiform', 'Lateral Cuneiform', 'third cuneiform|external cuneiform', ''),
    'g41': ('intermediate-cuneiform', 'Intermediate Cuneiform', 'second cuneiform|middle cuneiform', ''),
    'g47': ('medial-cuneiform', 'Medial Cuneiform', 'first cuneiform|internal cuneiform', ''),
}
# Right foot sub-groups — same order (verified by matching structure)
TARSAL_NAMES_RIGHT = {
    'g195': 'talus',
    'g205': 'cuboid',
    'g211': 'navicular',
    'g217': 'lateral-cuneiform',
    'g223': 'intermediate-cuneiform',
    'g229': 'medial-cuneiform',
}

# ─── Carpal identification by SVG group ID ───
# Left hand (front view): lateral (thumb side) = higher X, medial (pinky side) = lower X
# Proximal row (wrist): higher Y (closer to forearm), Distal row: lower Y (closer to fingers)
# Note: in SVG, Y increases downward. Hand is below the forearm.
CARPAL_NAMES_LEFT = {
    'g2001': ('scaphoid', 'Scaphoid', 'scaphoid bone|navicular of hand', ''),
    'g2019': ('lunate', 'Lunate', 'lunate bone|semilunar bone', ''),
    'g2057': ('trapezium', 'Trapezium', 'greater multangular|trapezium bone', ''),
    'g2047': ('hamate', 'Hamate', 'hamate bone|unciform bone', ''),
    'g2009': ('capitate', 'Capitate', 'capitate bone|os magnum', ''),
    'g2063': ('trapezoid', 'Trapezoid', 'lesser multangular|trapezoid bone', ''),
    'g1993': ('triquetrum', 'Triquetrum', 'triquetral bone|triangular bone', ''),
    'g2035': ('pisiform', 'Pisiform', 'pisiform bone|pea bone', ''),
}
CARPAL_NAMES_RIGHT = {
    'g2127': 'scaphoid',      # low X = thumb side, proximal
    'g2135': 'lunate',        # center, most proximal
    'g2253': 'triquetrum',    # high X = pinky side, proximal
    'g2121': 'trapezium',     # lowest X = thumb side, distal
    'g2147': 'trapezoid',     # low-mid X, distal
    'g2275': 'capitate',      # center, distal
    'g2263': 'hamate',        # high X = pinky side, distal
    'g2281': 'pisiform',      # sits on triquetrum, most distal
}


def extract_individual_tarsals(tarsal_group, side: str, tarsal_names: dict) -> list[BoneEntry]:
    """Extract individual tarsal bones from a tarsal group."""
    entries_by_id = {}

    for child in tarsal_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        gid = child.get('id', '')
        paths = collect_paths(child)
        if not paths:
            continue

        if side == 'left' and gid in TARSAL_NAMES_LEFT:
            bone_id, name, alts, common = TARSAL_NAMES_LEFT[gid]
        elif side == 'right' and gid in tarsal_names:
            bone_id = tarsal_names[gid]
            # Look up full name from left side mapping
            for left_gid, (lid, lname, lalts, lcommon) in TARSAL_NAMES_LEFT.items():
                if lid == bone_id:
                    name, alts, common = lname, lalts, lcommon
                    break
            else:
                name, alts, common = bone_id, '', ''
        else:
            # Unknown group — use temporary label
            bone_id = f'tarsal-{gid}'
            name = f'Tarsal ({gid})'
            alts, common = '', ''

        if bone_id in entries_by_id:
            entries_by_id[bone_id].paths.extend(paths)
            cx, cy = multi_path_centroid(entries_by_id[bone_id].paths)
            entries_by_id[bone_id].x = cx
            entries_by_id[bone_id].y = cy
        else:
            cx, cy = multi_path_centroid(paths)
            entries_by_id[bone_id] = BoneEntry(
                id=bone_id,
                name=name,
                name_alternates=alts,
                region='Foot',
                subregion='Ankle',
                common=common,
                paths=paths,
                x=cx, y=cy,
            )

    return list(entries_by_id.values())


def extract_individual_carpals(carpal_group, side: str, carpal_names: dict) -> list[BoneEntry]:
    """Extract individual carpal bones from a carpal group."""
    entries_by_id = {}

    for child in carpal_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        gid = child.get('id', '')
        paths = collect_paths(child)
        if not paths:
            continue

        if side == 'left' and gid in CARPAL_NAMES_LEFT:
            bone_id, name, alts, common = CARPAL_NAMES_LEFT[gid]
        elif side == 'right' and gid in carpal_names:
            bone_id = carpal_names[gid]
            for left_gid, (lid, lname, lalts, lcommon) in CARPAL_NAMES_LEFT.items():
                if lid == bone_id:
                    name, alts, common = lname, lalts, lcommon
                    break
            else:
                name, alts, common = bone_id, '', ''
        else:
            bone_id = f'carpal-{gid}'
            name = f'Carpal ({gid})'
            alts, common = '', ''

        if bone_id in entries_by_id:
            entries_by_id[bone_id].paths.extend(paths)
            cx, cy = multi_path_centroid(entries_by_id[bone_id].paths)
            entries_by_id[bone_id].x = cx
            entries_by_id[bone_id].y = cy
        else:
            cx, cy = multi_path_centroid(paths)
            entries_by_id[bone_id] = BoneEntry(
                id=bone_id,
                name=name,
                name_alternates=alts,
                region='Hand',
                subregion='Wrist',
                common=common,
                paths=paths,
                x=cx, y=cy,
            )

    return list(entries_by_id.values())


def extract_numbered_bones(group, prefix: str, name_template: str, alts_template: str,
                           region: str, subregion: str, common: str, sort_key: str = 'x') -> list[BoneEntry]:
    """Extract numbered bones (metacarpals 1-5, metatarsals 1-5) from a group.

    Sub-groups are sorted by position to assign numbers.
    For metacarpals/metatarsals: 1 = thumb/big-toe side (varies by hand/foot and view).
    """
    items = []
    for child in group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        paths = collect_paths(child)
        if not paths:
            continue
        cx, cy = multi_path_centroid(paths)
        items.append((cx, cy, paths))

    # Sort by position
    if sort_key == 'x':
        items.sort(key=lambda x: x[0])
    else:
        items.sort(key=lambda x: x[1])

    entries = []
    for i, (cx, cy, paths) in enumerate(items):
        num = i + 1
        bone_id = f'{prefix}-{num}'
        name = name_template.format(num)
        alts = alts_template.format(num, num)
        entries.append(BoneEntry(
            id=bone_id,
            name=name,
            name_alternates=alts,
            region=region,
            subregion=subregion,
            common=common,
            paths=paths,
            x=cx, y=cy,
        ))

    return entries


def cluster_1d(items, k, key):
    """Cluster sorted items into k groups using gap-based splitting with minimum
    cluster size constraint.

    Items must already be sorted by the key function. We pick the k-1 largest
    gaps as cluster boundaries, but skip any gap that would create a cluster
    with fewer than 2 items.

    Returns a list of k clusters (lists of items), sorted by key.
    """
    n = len(items)
    if n <= k:
        return [[item] for item in items]

    # When there are few items per cluster (≤ 3), gap-based clustering fails
    # because within-cluster spread can exceed between-cluster gaps (e.g., toes).
    # Use equal partitioning instead.
    if n <= k * 3:
        clusters = []
        for c in range(k):
            start = c * n // k
            end = (c + 1) * n // k
            clusters.append(items[start:end])
        return clusters

    values = [key(item) for item in items]
    min_cluster_size = 2

    # Calculate all gaps with their positions
    gaps = []
    for i in range(1, n):
        gaps.append((values[i] - values[i - 1], i))
    gaps.sort(key=lambda g: g[0], reverse=True)

    # Greedily select k-1 boundaries from largest gaps,
    # skipping any that would create a cluster smaller than min_cluster_size.
    boundaries = []
    for gap_val, gap_pos in gaps:
        if len(boundaries) >= k - 1:
            break
        # Check if adding this boundary creates any too-small cluster
        test_bounds = sorted(boundaries + [gap_pos])
        valid = True
        prev = 0
        for b in test_bounds:
            if b - prev < min_cluster_size:
                valid = False
                break
            prev = b
        if n - prev < min_cluster_size:
            valid = False
        if valid:
            boundaries.append(gap_pos)

    boundaries.sort()

    # Build clusters from boundaries
    clusters = []
    prev = 0
    for b in boundaries:
        clusters.append(items[prev:b])
        prev = b
    clusters.append(items[prev:])

    # If we got fewer than k clusters (too many gaps were invalid), split the
    # largest clusters to reach k.
    while len(clusters) < k:
        # Find the largest cluster and split it at its biggest internal gap
        largest_idx = max(range(len(clusters)), key=lambda i: len(clusters[i]))
        c = clusters[largest_idx]
        if len(c) < 2 * min_cluster_size:
            break  # Can't split further without violating min size
        c_vals = [key(item) for item in c]
        best_gap_pos = max(
            range(min_cluster_size, len(c) - min_cluster_size + 1),
            key=lambda i: c_vals[i] - c_vals[i - 1],
        )
        clusters[largest_idx:largest_idx + 1] = [c[:best_gap_pos], c[best_gap_pos:]]

    return clusters


def extract_phalanges_by_digit(phalanx_group, digit_names: list[str], prefix: str,
                                region: str, subregion_template: str,
                                common: str, sort_key: str = 'x') -> list[BoneEntry]:
    """Extract individual phalanges per digit (finger/toe).

    Sub-groups are first clustered by X position into digits, then within each
    digit cluster, sorted by Y to identify proximal/middle/distal phalanges.
    Thumb/big toe have 2 phalanges; other digits have 3.
    """
    # Collect all leaf sub-groups with their centroids
    items = []
    for child in phalanx_group.iter(f'{{{SVG_NS}}}g'):
        direct_paths = [p for p in child if p.tag == f'{{{SVG_NS}}}path']
        if not direct_paths:
            continue
        paths = [p.get('d', '') for p in direct_paths if p.get('d', '')]
        if not paths:
            continue
        cx, cy = multi_path_centroid(paths)
        items.append({'cx': cx, 'cy': cy, 'paths': paths})

    if not items:
        return []

    # Sort by X position
    items.sort(key=lambda x: x['cx'])

    # Cluster into digits by X proximity using 1D k-means
    num_digits = len(digit_names)
    if len(items) <= num_digits:
        clusters = [[item] for item in items]
    else:
        clusters = cluster_1d(items, num_digits, key=lambda x: x['cx'])

    # Phalanx position names: proximal is nearest palm/sole (lower Y in SVG),
    # distal is at fingertip/toe-tip (higher Y in SVG).
    # Thumb/big toe: proximal + distal (2 phalanges)
    # Other digits: proximal + middle + distal (3 phalanges)
    phalanx_names_2 = ['Proximal', 'Distal']
    phalanx_names_3 = ['Proximal', 'Middle', 'Distal']

    entries = []
    for i, cluster in enumerate(clusters):
        if i >= num_digits:
            break
        digit_name = digit_names[i]
        digit_slug = digit_name.lower().replace(' ', '-')

        # Sort phalanges within digit by Y (proximal = lower Y, distal = higher Y)
        cluster.sort(key=lambda item: item['cy'])

        # Determine expected phalanx count: thumb/big toe has 2, others have 3
        is_two_phalanx = digit_name.lower() in ('thumb', 'big toe')
        expected = 2 if is_two_phalanx else 3
        phalanx_labels = phalanx_names_2 if is_two_phalanx else phalanx_names_3

        if len(cluster) == 1:
            # Single sub-group — split its individual paths by Y into phalanges
            all_paths = cluster[0]['paths']
            if len(all_paths) >= expected:
                # Compute centroid Y for each path
                path_items = []
                for p in all_paths:
                    coords = extract_path_numbers(p)
                    if coords:
                        py = sum(c[1] for c in coords) / len(coords)
                        path_items.append({'cy': py, 'paths': [p]})
                    else:
                        path_items.append({'cy': 0, 'paths': [p]})
                path_items.sort(key=lambda x: x['cy'])
                # Re-cluster individual paths by Y gaps
                cluster = path_items
                # Fall through to the gap-clustering below
            else:
                # Too few paths to split — keep merged
                cx, cy = multi_path_centroid(all_paths)
                entries.append(BoneEntry(
                    id=f'{prefix}-{digit_slug}',
                    name=f'{digit_name} Phalanges',
                    name_alternates=f'{digit_name.lower()} bones|phalanges of {digit_name.lower()}',
                    region=region,
                    subregion=subregion_template.format(digit_name),
                    common=common,
                    paths=all_paths,
                    x=cx, y=cy,
                ))
                continue

        if len(cluster) <= expected:
            # One sub-group per phalanx.
            # When fewer items than expected, use Proximal for first, Distal for
            # last, and Middle only if there's a third.
            if len(cluster) == expected:
                actual_labels = phalanx_labels
            elif len(cluster) == 2:
                actual_labels = phalanx_names_2
            else:
                actual_labels = phalanx_labels[:len(cluster)]
            for j, item in enumerate(cluster):
                phalanx_name = actual_labels[j] if j < len(actual_labels) else f'Phalanx {j+1}'
                cx, cy = multi_path_centroid(item['paths'])
                entries.append(BoneEntry(
                    id=f'{prefix}-{digit_slug}-{phalanx_name.lower()}',
                    name=f'{digit_name} {phalanx_name} Phalanx',
                    name_alternates=f'{phalanx_name.lower()} phalanx of {digit_name.lower()}',
                    region=region,
                    subregion=subregion_template.format(digit_name),
                    common=common,
                    paths=item['paths'],
                    x=cx, y=cy,
                ))
        else:
            # More sub-groups than expected phalanges — merge by Y k-means clustering
            y_clusters = cluster_1d(cluster, expected, key=lambda x: x['cy'])

            for j, y_cluster in enumerate(y_clusters):
                phalanx_name = phalanx_labels[j] if j < len(phalanx_labels) else f'Phalanx {j+1}'
                all_paths = []
                for item in y_cluster:
                    all_paths.extend(item['paths'])
                cx, cy = multi_path_centroid(all_paths)
                entries.append(BoneEntry(
                    id=f'{prefix}-{digit_slug}-{phalanx_name.lower()}',
                    name=f'{digit_name} {phalanx_name} Phalanx',
                    name_alternates=f'{phalanx_name.lower()} phalanx of {digit_name.lower()}',
                    region=region,
                    subregion=subregion_template.format(digit_name),
                    common=common,
                    paths=all_paths,
                    x=cx, y=cy,
                ))

    return entries


def extract_hand_bones(hand_group, side: str) -> list[BoneEntry]:
    """Extract individual bones from a hand group."""
    entries = []

    for child in hand_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        label = child.get(f'{{{INK_NS}}}label', '')
        child_id = child.get('id', '')
        name_lower = (label or child_id).lower()

        if 'metacarpal' in name_lower:
            # For left hand front view: thumb (1st) = highest X, pinky (5th) = lowest X
            # For right hand: thumb = lowest X, pinky = highest X
            sub_entries = extract_numbered_bones(
                child,
                prefix='metacarpal',
                name_template='Metacarpal {}',
                alts_template='{}st metacarpal|metacarpal bone {}' if '{}' == '1' else 'metacarpal {}|metacarpal bone {}',
                region='Hand',
                subregion='Palm',
                common='true',
                sort_key='x',
            )
            # For left hand (front view), X increases toward thumb, so reverse numbering
            # Metacarpal 1 = thumb side. In front view of left hand, thumb is at higher X.
            if side == 'left':
                sub_entries.reverse()
            # Fix numbering after reverse
            for i, e in enumerate(sub_entries):
                num = i + 1
                e.id = f'metacarpal-{num}'
                e.name = f'Metacarpal {num}'
                ordinal = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th'}[num]
                e.name_alternates = f'{ordinal} metacarpal|metacarpal bone {num}'
            entries.extend(sub_entries)

        elif 'carpal' in name_lower:
            carpal_names = CARPAL_NAMES_RIGHT if side == 'right' else {}
            sub_entries = extract_individual_carpals(child, side, carpal_names)
            entries.extend(sub_entries)

        elif 'phalang' in name_lower:
            # Individual phalanges per finger
            # For left hand front view: thumb at highest X, pinky at lowest X
            # For right hand: thumb at lowest X, pinky at highest X
            digit_names = ['Thumb', 'Index Finger', 'Middle Finger', 'Ring Finger', 'Little Finger']
            sub_entries = extract_phalanges_by_digit(
                child,
                digit_names=digit_names if side == 'right' else list(reversed(digit_names)),
                prefix='phalanx-hand',
                region='Hand',
                subregion_template='{}',
                common='true',
            )
            entries.extend(sub_entries)

    return entries


def extract_foot_bones(foot_group, side: str) -> list[BoneEntry]:
    """Extract individual bones from a foot group."""
    entries = []

    for child in foot_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        label = child.get(f'{{{INK_NS}}}label', '')
        child_id = child.get('id', '')
        name_lower = (label or child_id).lower()

        if 'metatarsal' in name_lower:
            # Metatarsal 1 = big toe side (medial)
            # Left foot front view: medial = lower X
            # Right foot front view: medial = higher X
            sub_entries = extract_numbered_bones(
                child,
                prefix='metatarsal',
                name_template='Metatarsal {}',
                alts_template='metatarsal {}|metatarsal bone {}',
                region='Foot',
                subregion='Midfoot',
                common='true',
                sort_key='x',
            )
            # For left foot (front view): lower X = medial = 1st metatarsal
            # For right foot (front view): higher X = medial = 1st metatarsal, so reverse
            if side == 'right':
                sub_entries.reverse()
            for i, e in enumerate(sub_entries):
                num = i + 1
                e.id = f'metatarsal-{num}'
                e.name = f'Metatarsal {num}'
                ordinal = {1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th'}[num]
                e.name_alternates = f'{ordinal} metatarsal|metatarsal bone {num}'
            entries.extend(sub_entries)

        elif 'tarsal' in name_lower:
            tarsal_names = TARSAL_NAMES_RIGHT if side == 'right' else {}
            sub_entries = extract_individual_tarsals(child, side, tarsal_names)
            entries.extend(sub_entries)

        elif 'phalang' in name_lower:
            digit_names = ['Big Toe', '2nd Toe', '3rd Toe', '4th Toe', 'Little Toe']
            # Left foot front view: big toe at highest X (lateral in image = medial anatomically)
            # Right foot front view: big toe at lowest X
            sub_entries = extract_phalanges_by_digit(
                child,
                digit_names=list(reversed(digit_names)) if side == 'left' else digit_names,
                prefix='phalanx-foot',
                region='Foot',
                subregion_template='{}',
                common='true',
            )
            entries.extend(sub_entries)

    return entries


def compute_label_positions(entries: list[BoneEntry]):
    """
    Compute label positions for leader-line labels placed on left/right margins.

    Algorithm:
    1. Find the midline X of the skeleton.
    2. For each bone, determine which side (left/right of midline) is less crowded
       in the same vertical band. For paired bones (left+right paths), pick the
       anchor on the less crowded side.
    3. Place labels on the margin of the assigned side.
    4. Sort each side's labels by anchor Y, then enforce minimum vertical spacing
       to prevent overlaps (push labels downward when they'd collide).
    """
    import math

    # Find bounds of all paths to determine midline and margins
    all_path_xs = []
    for entry in entries:
        for p in entry.paths:
            coords = extract_path_numbers(p)
            all_path_xs.extend(c[0] for c in coords)

    if not all_path_xs:
        return

    global_min_x = min(all_path_xs)
    global_max_x = max(all_path_xs)
    midline_x = (global_min_x + global_max_x) / 2

    # Margin positions: outside the skeleton with some padding
    padding = 30
    left_margin_x = global_min_x - padding
    right_margin_x = global_max_x + padding

    # For each entry, compute left-side and right-side anchor candidates.
    # The anchor is the point on the bone's bounding box edge nearest the margin.
    class SideCandidate:
        def __init__(self, entry, anchor_x, anchor_y, side):
            self.entry = entry
            self.anchor_x = anchor_x
            self.anchor_y = anchor_y
            self.side = side  # 'left' or 'right'

    # For each bone, find the leftmost and rightmost path centroids
    # to determine which "copy" is on which side (for paired bones).
    left_candidates = []
    right_candidates = []

    for entry in entries:
        # Compute per-path centroids and bounds
        all_bounds = []  # (min_x, min_y, max_x, max_y, cx, cy)
        for p in entry.paths:
            coords = extract_path_numbers(p)
            if not coords:
                continue
            xs = [c[0] for c in coords]
            ys = [c[1] for c in coords]
            cx = sum(xs) / len(xs)
            cy = sum(ys) / len(ys)
            all_bounds.append((min(xs), min(ys), max(xs), max(ys), cx, cy))

        if not all_bounds:
            left_candidates.append(SideCandidate(entry, entry.x, entry.y, 'left'))
            continue

        # Split paths into left/right using global midline first
        left_paths_bounds = [b for b in all_bounds if b[4] < midline_x]
        right_paths_bounds = [b for b in all_bounds if b[4] >= midline_x]

        # If all paths fall on one side of the global midline, try splitting by
        # the bone's own local midline. This handles paired bones (like tibia)
        # where both copies are on the same side of the skewed global midline.
        if left_paths_bounds and not right_paths_bounds and len(all_bounds) >= 4:
            local_midline = (min(b[4] for b in all_bounds) + max(b[4] for b in all_bounds)) / 2
            local_left = [b for b in all_bounds if b[4] < local_midline]
            local_right = [b for b in all_bounds if b[4] >= local_midline]
            if local_left and local_right:
                left_paths_bounds = local_left
                right_paths_bounds = local_right
        elif right_paths_bounds and not left_paths_bounds and len(all_bounds) >= 4:
            local_midline = (min(b[4] for b in all_bounds) + max(b[4] for b in all_bounds)) / 2
            local_left = [b for b in all_bounds if b[4] < local_midline]
            local_right = [b for b in all_bounds if b[4] >= local_midline]
            if local_left and local_right:
                left_paths_bounds = local_left
                right_paths_bounds = local_right

        # Pick anchor point: use the centroid of the bone's paths on each side
        if left_paths_bounds:
            avg_x = sum(b[4] for b in left_paths_bounds) / len(left_paths_bounds)
            avg_y = sum(b[5] for b in left_paths_bounds) / len(left_paths_bounds)
            left_candidates.append(SideCandidate(entry, avg_x, avg_y, 'left'))

        if right_paths_bounds:
            avg_x = sum(b[4] for b in right_paths_bounds) / len(right_paths_bounds)
            avg_y = sum(b[5] for b in right_paths_bounds) / len(right_paths_bounds)
            right_candidates.append(SideCandidate(entry, avg_x, avg_y, 'right'))

        # Bones entirely on one side only get that side's candidate
        if not left_paths_bounds and not right_paths_bounds:
            left_candidates.append(SideCandidate(entry, entry.x, entry.y, 'left'))

    # For bones that have candidates on BOTH sides, assign to the less crowded side.
    # Count how many bones are in each vertical band on each side.
    band_size = 30  # vertical band height for crowding calculation

    def count_in_band(candidates, y, band):
        return sum(1 for c in candidates if abs(c.anchor_y - y) < band)

    # Assign each entry to exactly one side
    assigned = {}  # entry.id -> SideCandidate

    # First pass: bones that only have one side
    entries_with_both = []
    for entry in entries:
        left_cands = [c for c in left_candidates if c.entry is entry]
        right_cands = [c for c in right_candidates if c.entry is entry]

        if left_cands and right_cands:
            entries_with_both.append((entry, left_cands[0], right_cands[0]))
        elif left_cands:
            assigned[entry.id] = left_cands[0]
        elif right_cands:
            assigned[entry.id] = right_cands[0]

    # Second pass: assign dual-sided bones to the less crowded side.
    # Sort by anchor Y so we process top-to-bottom consistently.
    entries_with_both.sort(key=lambda t: (t[1].anchor_y + t[2].anchor_y) / 2)

    for entry, left_c, right_c in entries_with_both:
        left_assigned = [c for c in assigned.values() if c.side == 'left']
        right_assigned = [c for c in assigned.values() if c.side == 'right']

        left_local = count_in_band(left_assigned, left_c.anchor_y, band_size)
        right_local = count_in_band(right_assigned, right_c.anchor_y, band_size)

        if left_local != right_local:
            # Prefer the locally less crowded side
            if left_local < right_local:
                assigned[entry.id] = left_c
            else:
                assigned[entry.id] = right_c
        else:
            # Tie-break: prefer the globally less crowded side
            if len(left_assigned) <= len(right_assigned):
                assigned[entry.id] = left_c
            else:
                assigned[entry.id] = right_c

    # Force numbered series (e.g. Rib 1-12, Metacarpal 1-5) to the same side.
    # Detect series by stripping trailing digits and grouping by the prefix.
    import re as _re
    series_groups = {}  # prefix -> list of entry IDs
    for eid, candidate in assigned.items():
        match = _re.match(r'^(.+?)[\s-]?\d+$', candidate.entry.name)
        if match:
            prefix = match.group(1).strip()
            series_groups.setdefault(prefix, []).append(eid)

    # Process series largest-first so big series get their preferred side
    # and smaller ones can compensate for balance.
    sorted_series = sorted(series_groups.items(), key=lambda kv: len(kv[1]), reverse=True)

    for prefix, eids in sorted_series:
        if len(eids) < 3:
            continue

        left_count = sum(1 for eid in eids if assigned[eid].side == 'left')
        right_count = len(eids) - left_count
        majority_side = 'left' if left_count >= right_count else 'right'

        # Check if moving to the majority side would worsen global balance
        total_left = sum(1 for c in assigned.values() if c.side == 'left')
        total_right = len(assigned) - total_left

        # How many would move if we pick each side?
        moves_to_left = right_count  # bones currently on right that would move left
        moves_to_right = left_count  # bones currently on left that would move right

        balance_if_left = abs((total_left + moves_to_left - moves_to_right) -
                              (total_right - moves_to_left + moves_to_right))
        balance_if_right = abs((total_left - moves_to_right + moves_to_left) -
                               (total_right + moves_to_right - moves_to_left))
        # Simplify: balance_if_left = |total_left + 2*moves_to_left - total|
        #           balance_if_right = |total_left - 2*moves_to_right - ... |
        # Just compute directly:
        n = len(eids)
        left_after_left = total_left + (n - left_count)  # all n go left
        left_after_right = total_left - left_count  # all n go right

        balance_if_left = abs(2 * left_after_left - len(assigned))
        balance_if_right = abs(2 * left_after_right - len(assigned))

        # Prefer majority side, but switch if it significantly worsens balance
        if majority_side == 'left':
            target_side = 'right' if balance_if_right < balance_if_left - 2 else 'left'
        else:
            target_side = 'left' if balance_if_left < balance_if_right - 2 else 'right'

        for eid in eids:
            if assigned[eid].side != target_side:
                entry = assigned[eid].entry
                target_cands = (
                    [c for c in left_candidates if c.entry is entry]
                    if target_side == 'left'
                    else [c for c in right_candidates if c.entry is entry]
                )
                if target_cands:
                    assigned[eid] = target_cands[0]

    # Separate into left and right groups, sort by anchor Y
    left_group = sorted(
        [c for c in assigned.values() if c.side == 'left'],
        key=lambda c: c.anchor_y
    )
    right_group = sorted(
        [c for c in assigned.values() if c.side == 'right'],
        key=lambda c: c.anchor_y
    )

    # Enforce minimum vertical spacing between labels on each side.
    # Center the label block around the median anchor, pushing both up and down
    # to minimize diagonal leader lines.
    min_label_gap = 17  # minimum vertical distance between label centers

    def space_labels(group):
        n = len(group)
        if n == 0:
            return []
        if n == 1:
            return [group[0].anchor_y]

        anchor_ys = [c.anchor_y for c in group]

        # Total span needed
        total_span = (n - 1) * min_label_gap

        # Center the label block around the median anchor Y
        median_y = anchor_ys[n // 2]
        block_top = median_y - total_span / 2
        block_bottom = median_y + total_span / 2

        # Ensure the block covers the full anchor range (expand if needed)
        anchor_min = anchor_ys[0]
        anchor_max = anchor_ys[-1]
        if block_top > anchor_min:
            # Shift block up so the top label can reach the topmost anchor
            shift = block_top - anchor_min
            block_top -= shift
            block_bottom -= shift
        if block_bottom < anchor_max:
            # Expand block down so bottom label can reach the bottommost anchor
            block_bottom = anchor_max

        # Distribute labels evenly within the block
        if n > 1:
            actual_span = block_bottom - block_top
            step = actual_span / (n - 1)
            # Ensure minimum gap
            if step < min_label_gap:
                step = min_label_gap
                block_bottom = block_top + step * (n - 1)
        else:
            step = 0

        # Initial evenly-spaced positions
        label_ys = [block_top + i * step for i in range(n)]

        # Refine: pull each label toward its anchor while respecting min gap.
        # Multiple passes to propagate constraints.
        for _iteration in range(10):
            changed = False
            for i in range(n):
                target = anchor_ys[i]
                current = label_ys[i]

                # Compute allowed range based on neighbors
                lower_bound = label_ys[i - 1] + min_label_gap if i > 0 else -1e9
                upper_bound = label_ys[i + 1] - min_label_gap if i < n - 1 else 1e9

                # Try to move toward anchor within bounds
                new_y = max(lower_bound, min(upper_bound, target))
                if abs(new_y - current) > 0.1:
                    label_ys[i] = new_y
                    changed = True

            if not changed:
                break

        return label_ys

    left_label_ys = space_labels(left_group)
    right_label_ys = space_labels(right_group)

    # Uncross leader lines: detect crossing line segments and swap label positions.
    def segments_cross(ax1, ay1, lx1, ly1, ax2, ay2, lx2, ly2):
        """Test if two line segments (ax1,ay1)-(lx1,ly1) and (ax2,ay2)-(lx2,ly2) cross."""
        def cross_product(ox, oy, ax, ay, bx, by):
            return (ax - ox) * (by - oy) - (ay - oy) * (bx - ox)

        d1 = cross_product(ax2, ay2, lx2, ly2, ax1, ay1)
        d2 = cross_product(ax2, ay2, lx2, ly2, lx1, ly1)
        d3 = cross_product(ax1, ay1, lx1, ly1, ax2, ay2)
        d4 = cross_product(ax1, ay1, lx1, ly1, lx2, ly2)

        if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and \
           ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
            return True
        return False

    def uncross_labels(group, label_ys, label_x):
        """Swap label positions to eliminate crossing leader lines."""
        for _pass in range(50):
            swapped = False
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    if segments_cross(
                        group[i].anchor_x, group[i].anchor_y, label_x, label_ys[i],
                        group[j].anchor_x, group[j].anchor_y, label_x, label_ys[j],
                    ):
                        label_ys[i], label_ys[j] = label_ys[j], label_ys[i]
                        swapped = True
            if not swapped:
                break

    uncross_labels(left_group, left_label_ys, left_margin_x)
    uncross_labels(right_group, right_label_ys, right_margin_x)

    # After uncrossing, the label order may differ from the anchor order.
    # Re-sort groups by the uncrossed label_y order and re-space to pull
    # labels back toward their anchors in the new crossing-free order.
    def reorder_and_respace(group, label_ys):
        paired = list(zip(label_ys, group))
        paired.sort(key=lambda p: p[0])
        reordered = [p[1] for p in paired]
        return reordered, space_labels(reordered)

    # Iterate uncross → respace until stable
    for _round in range(5):
        prev_left = list(left_label_ys)
        prev_right = list(right_label_ys)

        uncross_labels(left_group, left_label_ys, left_margin_x)
        uncross_labels(right_group, right_label_ys, right_margin_x)
        left_group, left_label_ys = reorder_and_respace(left_group, left_label_ys)
        right_group, right_label_ys = reorder_and_respace(right_group, right_label_ys)

        if left_label_ys == prev_left and right_label_ys == prev_right:
            break

    # Write results back to entries
    for i, candidate in enumerate(left_group):
        candidate.entry.label_x = left_margin_x
        candidate.entry.label_y = left_label_ys[i]
        candidate.entry.anchor_x = candidate.anchor_x
        candidate.entry.anchor_y = candidate.anchor_y

    for i, candidate in enumerate(right_group):
        candidate.entry.label_x = right_margin_x
        candidate.entry.label_y = right_label_ys[i]
        candidate.entry.anchor_x = candidate.anchor_x
        candidate.entry.anchor_y = candidate.anchor_y


def merge_bone_entry(entries: list[BoneEntry], new_entry: BoneEntry):
    """Merge a new bone entry into the existing list.

    Handles mismatched granularity: if new_entry is a merged phalanx entry
    (e.g., 'phalanx-hand-thumb') but individual phalanx entries already exist
    (e.g., 'phalanx-hand-thumb-proximal'), distribute the paths by Y proximity.
    """
    existing = next((e for e in entries if e.id == new_entry.id), None)
    if existing:
        existing.paths.extend(new_entry.paths)
        existing.x, existing.y = multi_path_centroid(existing.paths)
        return

    # Check if this is a merged phalanx entry with individual counterparts
    individual_entries = [e for e in entries if e.id.startswith(new_entry.id + '-')]
    if individual_entries:
        # Distribute paths by Y proximity to existing individual entries
        for p in new_entry.paths:
            coords = extract_path_numbers(p)
            if not coords:
                individual_entries[0].paths.append(p)
                continue
            py = sum(c[1] for c in coords) / len(coords)
            closest = min(individual_entries, key=lambda e: abs(e.y - py))
            closest.paths.append(p)
        # Update centroids
        for e in individual_entries:
            e.x, e.y = multi_path_centroid(e.paths)
        return

    entries.append(new_entry)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generateHumanBones.py /path/to/Human_skeleton_front_en.svg")
        sys.exit(1)

    svg_path = sys.argv[1]
    tree = ET.parse(svg_path)
    root = tree.getroot()

    # Find skeleton layer
    skeleton_layer = None
    for g in root.findall(f'{{{SVG_NS}}}g'):
        if g.get('id') == 'layer3':
            skeleton_layer = g
            break

    if skeleton_layer is None:
        print("Error: Could not find skeleton layer (layer3)")
        sys.exit(1)

    # Index ALL elements by ID (recursive), so we can find nested groups like Cranium inside Skull
    children_by_id = {}
    for elem in skeleton_layer.iter():
        cid = elem.get('id', '')
        if cid:
            children_by_id[cid] = elem

    # Collect paths for merged bones
    merged_extra_paths: dict[str, list[str]] = {}
    for source_id, target_id in MERGE_MAP.items():
        if source_id in children_by_id:
            paths = collect_paths(children_by_id[source_id])
            # Follow chain to final target
            final_target = target_id
            while final_target in MERGE_MAP:
                final_target = MERGE_MAP[final_target]
            merged_extra_paths.setdefault(final_target, []).extend(paths)

    # Build bone entries
    entries: list[BoneEntry] = []

    # Process labeled bones
    for svg_id, meta in LABELED_BONES.items():
        bone_id, name, alts, region, subregion, common = meta
        if bone_id is None:
            continue  # Skip merged/decomposed groups
        if svg_id not in children_by_id:
            print(f"  Warning: SVG group '{svg_id}' not found")
            continue

        element = children_by_id[svg_id]
        paths = collect_paths(element)

        # Add merged paths from other sides
        if svg_id in merged_extra_paths:
            paths.extend(merged_extra_paths[svg_id])

        cx, cy = multi_path_centroid(paths)
        entries.append(BoneEntry(
            id=bone_id,
            name=name,
            name_alternates=alts,
            region=region,
            subregion=subregion,
            common=common,
            paths=paths,
            x=cx, y=cy,
        ))

    # Process ribs (g845)
    if 'g845' in children_by_id:
        print("Processing ribs...")
        rib_entries = separate_ribs(children_by_id['g845'])
        entries.extend(rib_entries)
    else:
        print("  Warning: Rib group (g845) not found")

    # Process unlabeled groups
    for svg_id, meta in UNLABELED_GROUPS.items():
        bone_id, name, alts, region, subregion, common = meta
        if bone_id is None or name == 'RIBS':
            continue  # Skip merged or special-cased
        if svg_id not in children_by_id:
            print(f"  Warning: SVG group '{svg_id}' not found")
            continue

        element = children_by_id[svg_id]
        paths = collect_paths(element)
        cx, cy = multi_path_centroid(paths)
        entries.append(BoneEntry(
            id=bone_id,
            name=name,
            name_alternates=alts or '',
            region=region,
            subregion=subregion,
            common=common,
            paths=paths,
            x=cx, y=cy,
        ))

    # Process hands (decompose into individual carpals, metacarpals, phalanges by digit)
    for hand_id in ['HandLeft', 'HandRight']:
        if hand_id in children_by_id:
            side = 'left' if 'Left' in hand_id else 'right'
            hand_entries = extract_hand_bones(children_by_id[hand_id], side)
            for he in hand_entries:
                merge_bone_entry(entries, he)

    # Process feet (decompose into individual tarsals, metatarsals, phalanges by digit)
    for foot_id in ['FootLeft', 'FootRight']:
        if foot_id in children_by_id:
            side = 'left' if 'Left' in foot_id else 'right'
            foot_entries = extract_foot_bones(children_by_id[foot_id], side)
            for fe in foot_entries:
                merge_bone_entry(entries, fe)

    # Add calcaneus (heel bone) — not present in the front-view SVG because it's
    # behind the talus. We add a rough elliptical shape positioned behind each talus.
    # Left calcaneus: behind left talus (centered ~215, 762)
    # Right calcaneus: behind right talus (centered ~183, 762)
    # Polygon approximation of ellipses (arc commands break the naive bounds parser).
    # Left: center (215, 762), rx=12, ry=8; Right: center (183, 762), rx=12, ry=8
    calcaneus_left = 'M 227,762 L 223,768 L 215,770 L 207,768 L 203,762 L 207,756 L 215,754 L 223,756 Z'
    calcaneus_right = 'M 195,762 L 191,768 L 183,770 L 175,768 L 171,762 L 175,756 L 183,754 L 191,756 Z'
    entries.append(BoneEntry(
        id='calcaneus',
        name='Calcaneus',
        name_alternates='heel bone|os calcis|calcaneum',
        region='Foot',
        subregion='Ankle',
        common='true',
        paths=[calcaneus_left, calcaneus_right],
        x=199.0,
        y=762.0,
    ))

    # Sort entries by anatomical order (head to toe)
    region_order = {'Head': 0, 'Torso': 1, 'Thorax': 2, 'Arm': 3, 'Hand': 4, 'Leg': 5, 'Foot': 6}
    entries.sort(key=lambda e: (region_order.get(e.region, 99), e.y))

    # Compute label positions for leader-line labels
    compute_label_positions(entries)

    # Write CSV
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, 'public', 'data', 'science', 'biology', 'human-bones.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'name', 'name_alternates', 'region', 'subregion', 'common',
                         'paths', 'x', 'y', 'label_x', 'label_y', 'anchor_x', 'anchor_y'])
        for entry in entries:
            writer.writerow([
                entry.id,
                entry.name,
                entry.name_alternates,
                entry.region,
                entry.subregion,
                entry.common,
                '|'.join(entry.paths),
                f'{entry.x:.1f}',
                f'{entry.y:.1f}',
                f'{entry.label_x:.1f}',
                f'{entry.label_y:.1f}',
                f'{entry.anchor_x:.1f}',
                f'{entry.anchor_y:.1f}',
            ])

    print(f"\nWrote {len(entries)} bone entries to {output_path}")
    print("\nBone summary:")
    for e in entries:
        path_count = len(e.paths)
        print(f"  {e.id:<30} {e.name:<30} {e.region:<10} {e.subregion:<20} common={e.common:<5} paths={path_count}")


if __name__ == '__main__':
    main()
