"""
Generate human-bones.csv from the Wikimedia skeleton SVG.

Source: https://commons.wikimedia.org/wiki/File:Human_skeleton_front_en.svg
License: CC BY-SA 3.0

The SVG has Inkscape layers with labeled groups for most bones, but some
groups are unlabeled (ribs, femur right, etc.). This script:
1. Maps all labeled and unlabeled SVG groups to bone names
2. Separates the 101-path rib group (g845) into individual ribs by Y-position
3. Merges left/right pairs into a single bone entry (since the quiz treats them as one)
4. Computes centroid coordinates from path data for label placement
5. Outputs CSV with: id, name, name_alternates, region, subregion, common, paths, x, y

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


def extract_path_numbers(d_attr: str) -> list[tuple[float, float]]:
    """Extract coordinate pairs from an SVG path d attribute (rough approximation)."""
    # Match M/L/C command coordinates - we just want all number pairs
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

    def assign_detail_to_cluster(detail, clusters, side_filter):
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
                cluster_idx = assign_detail_to_cluster(detail, left_clusters, 'left')
                if cluster_idx == left_idx:
                    rib_paths.append(detail['d'])
            else:
                cluster_idx = assign_detail_to_cluster(detail, right_clusters, 'right')
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

    # Remaining paths that weren't assigned to any rib (e.g., costal cartilage)
    # We'll skip these - they'll be background detail

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
    'Cranium': ('cranium', 'Cranium', 'skull cap|calvaria|neurocranium', 'Head', 'Skull', 'true'),
    'Mandible': ('mandible', 'Mandible', 'jawbone|lower jaw', 'Head', 'Skull', 'true'),
    'ClavicleRight': ('clavicle', 'Clavicle', 'collarbone', 'Torso', 'Shoulder Girdle', 'true'),
    'ClavicleLeft': (None, None, None, None, None, None),  # Merged with right
    'Scapula': ('scapula', 'Scapula', 'shoulder blade|shoulder bone', 'Torso', 'Shoulder Girdle', 'true'),
    'PelvicGirdle': ('pelvis', 'Pelvis', 'pelvic girdle|hip bone|os coxae|innominate bone', 'Torso', 'Pelvis', 'true'),
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
    'FootLeft': (None, None, None, None, None, None),   # We'll break this into sub-bones
    'FootRight': (None, None, None, None, None, None),
    'HandLeft': (None, None, None, None, None, None),    # We'll break this into sub-bones
    'HandRight': (None, None, None, None, None, None),
    'Skull': (None, None, None, None, None, None),       # We use Cranium + Mandible instead
}

# Unlabeled groups we identified
UNLABELED_GROUPS = {
    'g845': ('rib-cage', 'RIBS', None, 'Thorax', 'Rib Cage', None),  # Special: separated into individual ribs
    'g801': ('xiphoid-process', 'Xiphoid Process', 'xiphoid|ensiform process', 'Torso', 'Thorax', ''),
    'g3760': (None, None, None, None, None, None),  # Right femur - merged with left
    'g447': (None, None, None, None, None, None),    # Right femur head detail - merged
    'g1609': ('hyoid', 'Hyoid', 'hyoid bone|lingual bone', 'Head', 'Throat', ''),
    'g1753': (None, None, None, None, None, None),   # Right elbow detail - merged with ulna
}

# Merge map: SVG IDs whose paths should be combined with a primary bone
MERGE_MAP = {
    'ClavicleLeft': 'ClavicleRight',
    'HumerusRight': 'HumerusLeft',
    'RadiusRight': 'RadiusLeft',
    'UlnaRight': 'UlnaLeft',
    'TibiaRight': 'TibiaLeft',
    'FibulaRight': 'FibulaLeft',
    'PatellaRight': 'PatellaLeft',
    'g3760': 'FemurLeft',
    'g447': 'FemurLeft',
    'g1753': 'UlnaRight',  # Actually merges into UlnaLeft via chain
}


def extract_hand_bones(hand_group, side: str) -> list[BoneEntry]:
    """Extract individual bone groups from a hand group."""
    entries = []

    for child in hand_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        label = child.get(f'{{{INK_NS}}}label', '')
        child_id = child.get('id', '')

        if not label and not child_id:
            continue

        name_lower = (label or child_id).lower()

        if 'metacarpal' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'metacarpals' for e in entries):
                entries.append(BoneEntry(
                    id='metacarpals',
                    name='Metacarpals',
                    name_alternates='metacarpal bones|hand bones',
                    region='Hand',
                    subregion='Palm',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'metacarpals':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)
        elif 'carpal' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'carpals' for e in entries):
                entries.append(BoneEntry(
                    id='carpals',
                    name='Carpals',
                    name_alternates='carpal bones|wrist bones',
                    region='Hand',
                    subregion='Wrist',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'carpals':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)
        elif 'phalang' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'phalanges-hand' for e in entries):
                entries.append(BoneEntry(
                    id='phalanges-hand',
                    name='Phalanges (Hand)',
                    name_alternates='finger bones|hand phalanges|phalanges of the hand',
                    region='Hand',
                    subregion='Fingers',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'phalanges-hand':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)

    return entries


def extract_foot_bones(foot_group, side: str) -> list[BoneEntry]:
    """Extract individual bone groups from a foot group."""
    entries = []

    for child in foot_group:
        if child.tag != f'{{{SVG_NS}}}g':
            continue
        label = child.get(f'{{{INK_NS}}}label', '')
        child_id = child.get('id', '')

        name_lower = (label or child_id).lower()

        if 'metatarsal' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'metatarsals' for e in entries):
                entries.append(BoneEntry(
                    id='metatarsals',
                    name='Metatarsals',
                    name_alternates='metatarsal bones|foot bones',
                    region='Foot',
                    subregion='Midfoot',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'metatarsals':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)
        elif 'tarsal' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'tarsals' for e in entries):
                entries.append(BoneEntry(
                    id='tarsals',
                    name='Tarsals',
                    name_alternates='tarsal bones|ankle bones',
                    region='Foot',
                    subregion='Ankle',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'tarsals':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)
        elif 'phalang' in name_lower:
            paths = collect_paths(child)
            cx, cy = multi_path_centroid(paths)
            if not any(e.id == 'phalanges-foot' for e in entries):
                entries.append(BoneEntry(
                    id='phalanges-foot',
                    name='Phalanges (Foot)',
                    name_alternates='toe bones|foot phalanges|phalanges of the foot',
                    region='Foot',
                    subregion='Toes',
                    common='true',
                    paths=paths,
                    x=cx, y=cy,
                ))
            else:
                for e in entries:
                    if e.id == 'phalanges-foot':
                        e.paths.extend(paths)
                        e.x, e.y = multi_path_centroid(e.paths)

    return entries


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

    # Process hands (decompose into carpals, metacarpals, phalanges)
    for hand_id in ['HandLeft', 'HandRight']:
        if hand_id in children_by_id:
            hand_entries = extract_hand_bones(children_by_id[hand_id], 'left' if 'Left' in hand_id else 'right')
            for he in hand_entries:
                existing = next((e for e in entries if e.id == he.id), None)
                if existing:
                    existing.paths.extend(he.paths)
                    existing.x, existing.y = multi_path_centroid(existing.paths)
                else:
                    entries.append(he)

    # Process feet (decompose into tarsals, metatarsals, phalanges)
    for foot_id in ['FootLeft', 'FootRight']:
        if foot_id in children_by_id:
            foot_entries = extract_foot_bones(children_by_id[foot_id], 'left' if 'Left' in foot_id else 'right')
            for fe in foot_entries:
                existing = next((e for e in entries if e.id == fe.id), None)
                if existing:
                    existing.paths.extend(fe.paths)
                    existing.x, existing.y = multi_path_centroid(existing.paths)
                else:
                    entries.append(fe)

    # Also collect the loose unlabeled paths as background detail
    # (we won't include these in the quiz CSV, but log them)
    loose_paths = []
    for child in skeleton_layer:
        cid = child.get('id', '')
        tag = child.tag.replace(f'{{{SVG_NS}}}', '')
        if tag == 'path' and cid not in LABELED_BONES and cid != 'Sternum':
            loose_paths.append(cid)
    print(f"\n  {len(loose_paths)} loose unlabeled paths (background detail, not included in CSV)")

    # Sort entries by anatomical order (head to toe)
    region_order = {'Head': 0, 'Torso': 1, 'Thorax': 2, 'Arm': 3, 'Hand': 4, 'Leg': 5, 'Foot': 6}
    entries.sort(key=lambda e: (region_order.get(e.region, 99), e.y))

    # Write CSV
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    output_path = os.path.join(project_root, 'public', 'data', 'science', 'biology', 'human-bones.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'name', 'name_alternates', 'region', 'subregion', 'common', 'paths', 'x', 'y'])
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
            ])

    print(f"\nWrote {len(entries)} bone entries to {output_path}")
    print("\nBone summary:")
    for e in entries:
        path_count = len(e.paths)
        print(f"  {e.id:<25} {e.name:<30} {e.region:<10} {e.subregion:<20} paths={path_count}")


if __name__ == '__main__':
    main()
