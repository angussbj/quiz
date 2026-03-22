/**
 * Quiz-specific logic for the 3D human bones quiz.
 *
 * Responsibilities:
 *   - buildBone3DElements: build Anatomy3DElement arrays from CSV rows + active toggles
 *   - bone3DLocateDistance: compute distance (cm) between a clicked element and the target
 *
 * Toggle keys that affect element building:
 *   groupBilateral   — merge left/right pairs into one element
 *   groupNumbered    — merge numbered series (ribs 1-12, phalanges, etc.) into one element
 *   showTeeth        — include tooth elements (default off)
 *   showCostalCart   — include costal cartilage elements (default off)
 *   showSesamoids    — include sesamoid elements (default off)
 *   Region chips (showSkull, showTorso, showLimbs, showHands, showFeet) — filter by body region
 */

import type { Anatomy3DElement, Anatomy3DMeshEntry } from '@/visualizations/anatomy-3d/Anatomy3DElement';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bone3DRow {
  readonly id: string;
  readonly name: string;
  readonly mesh_name: string;
  readonly x: string;
  readonly y: string;
  readonly z: string;
  readonly side: string;
  readonly direct_mesh: string;
  readonly region: string;
  readonly bone_type: string;
  readonly bilateral_partner: string;
  readonly group_representative: string;
}

// ─── Element building ─────────────────────────────────────────────────────────

/**
 * Build Anatomy3DElement objects from CSV rows, applying grouping toggles.
 *
 * Grouping is applied in this order:
 *   1. bilateral  — merge left/right pairs (position = midpoint)
 *   2. numbered   — merge all rows sharing a group_representative (position = centroid)
 *
 * Non-quiz elements (filtered by bone_type or region) are dropped — the renderer
 * will show them in the 'context' state based on what elements are present in the quiz.
 */
export function buildBone3DElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  toggles: Readonly<Record<string, boolean>>,
): ReadonlyArray<Anatomy3DElement> {
  const groupBilateral = toggles['groupBilateral'] !== false; // default true
  const groupNumbered  = toggles['groupNumbered']  !== false; // default true
  const showTeeth      = toggles['showTeeth']      === true;  // default false
  const showCostalCart = toggles['showCostalCart'] === true;  // default false
  const showSesamoids  = toggles['showSesamoids']  === true;  // default false

  const showSkull  = toggles['showSkull']  !== false; // default true
  const showTorso  = toggles['showTorso']  !== false; // default true
  const showLimbs  = toggles['showLimbs']  !== false; // default true
  const showHands  = toggles['showHands']  !== false; // default true
  const showFeet   = toggles['showFeet']   !== false; // default true

  // Filter rows to quiz-active set
  const activeRows = (rows as unknown as ReadonlyArray<Bone3DRow>).filter((row) => {
    // Filter by bone type
    if (row.bone_type === 'teeth'            && !showTeeth)      return false;
    if (row.bone_type === 'costal_cartilage' && !showCostalCart) return false;
    if (row.bone_type === 'sesamoid'         && !showSesamoids)  return false;

    // Filter by region
    if (row.region === 'skull'  && !showSkull)  return false;
    if (row.region === 'torso'  && !showTorso)  return false;
    if (row.region === 'limbs'  && !showLimbs)  return false;
    if (row.region === 'hands'  && !showHands)  return false;
    if (row.region === 'feet'   && !showFeet)   return false;

    return true;
  });

  // Step 1: collect individual elements
  let elements: Array<Anatomy3DElement> = activeRows.map((row) => makeElement(row));

  // Step 2: group bilateral pairs
  if (groupBilateral) {
    elements = mergeBilateral(elements, activeRows);
  }

  // Step 3: group numbered series
  if (groupNumbered) {
    elements = mergeNumbered(elements, activeRows);
  }

  return elements;
}

function parseCoord(s: string): number {
  return parseFloat(s) || 0;
}

function makeMeshEntry(row: Bone3DRow): Anatomy3DMeshEntry {
  return {
    meshName: row.mesh_name,
    side: row.side as 'left' | 'right' | 'midline',
    directMesh: row.direct_mesh === 'true',
  };
}

function makeElement(row: Bone3DRow): Anatomy3DElement {
  return {
    id: row.id,
    label: row.name,
    viewBoxCenter: {
      x: parseCoord(row.x),
      y: parseCoord(row.y),
      z: parseCoord(row.z),
    },
    viewBoxBounds: {
      minX: parseCoord(row.x),
      minY: parseCoord(row.y),
      maxX: parseCoord(row.x),
      maxY: parseCoord(row.y),
    },
    interactive: true,
    group: row.region,
    meshEntries: [makeMeshEntry(row)],
  };
}

function avgCoord(elements: ReadonlyArray<Anatomy3DElement>, axis: 'x' | 'y' | 'z'): number {
  const vals = elements.map((e) => (axis === 'z' ? (e.viewBoxCenter.z ?? 0) : e.viewBoxCenter[axis]));
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

/** Strip the trailing " (right)" or " (left)" from a display name. */
function stripSide(label: string): string {
  return label.replace(/ \(right\)$/, '').replace(/ \(left\)$/, '');
}

function mergeBilateral(
  elements: ReadonlyArray<Anatomy3DElement>,
  rows: ReadonlyArray<Bone3DRow>,
): Array<Anatomy3DElement> {
  // Build id→bilateral_partner map from rows
  const partnerMap = new Map<string, string>();
  for (const row of rows) {
    if (row.bilateral_partner) partnerMap.set(row.id, row.bilateral_partner);
  }

  const merged = new Map<string, Anatomy3DElement>();
  const seen = new Set<string>();

  for (const el of elements) {
    if (seen.has(el.id)) continue;
    const partnerId = partnerMap.get(el.id);
    const partnerEl = partnerId ? elements.find((e) => e.id === partnerId) : undefined;

    if (partnerEl && !seen.has(partnerEl.id)) {
      // Merge the pair: representative = right side (or the first)
      const elSide = el.meshEntries[0].side;
      const rep = elSide === 'right' ? el : partnerEl;
      const other = elSide === 'right' ? partnerEl : el;
      const cy = avgCoord([rep, other], 'y');
      const cz = avgCoord([rep, other], 'z');
      merged.set(rep.id, {
        ...rep,
        label: stripSide(rep.label),
        viewBoxCenter: { x: 0, y: cy, z: cz }, // bilaterally symmetric → x=0
        meshEntries: [...rep.meshEntries, ...other.meshEntries],
      });
      seen.add(el.id);
      seen.add(partnerEl.id);
    } else {
      merged.set(el.id, el);
      seen.add(el.id);
    }
  }

  return Array.from(merged.values());
}

function mergeNumbered(
  elements: ReadonlyArray<Anatomy3DElement>,
  rows: ReadonlyArray<Bone3DRow>,
): Array<Anatomy3DElement> {
  // Build id→group_representative map from rows
  const repMap = new Map<string, string>();
  for (const row of rows) {
    if (row.group_representative) repMap.set(row.id, row.group_representative);
  }

  // Group elements by their representative id
  const groups = new Map<string, Array<Anatomy3DElement>>();
  const ungrouped: Array<Anatomy3DElement> = [];

  for (const el of elements) {
    const repId = repMap.get(el.id);
    if (repId) {
      if (!groups.has(repId)) groups.set(repId, []);
      groups.get(repId)!.push(el);
    } else {
      ungrouped.push(el);
    }
  }

  const result: Array<Anatomy3DElement> = [...ungrouped];

  for (const [repId, members] of groups) {
    // Find the representative element (may or may not still be in the list after bilateral merge)
    const repEl = members.find((e) => e.id === repId) ?? members[0];
    const cx = avgCoord(members, 'x');
    const cy = avgCoord(members, 'y');
    const cz = avgCoord(members, 'z');
    const allEntries = members.flatMap((m) => m.meshEntries);
    result.push({
      ...repEl,
      id: repId,
      label: groupLabel(repId),
      viewBoxCenter: { x: cx, y: cy, z: cz },
      meshEntries: allEntries,
    });
  }

  return result;
}

/** Map a group representative ID to a human-friendly group label. */
function groupLabel(repId: string): string {
  const labels: Readonly<Record<string, string>> = {
    'atlas-c1':                          'Cervical vertebra',
    'thoracic-vertebra-t1':              'Thoracic vertebra',
    'lumbar-vertebra-l1':                'Lumbar vertebra',
    'rib-1-right':                       'Rib',
    'costal-cartilage-of-rib-1-right':   'Costal cartilage',
    'metacarpal-1-right':                'Metacarpal',
    'proximal-phalanx-of-finger-1-right':'Proximal finger phalanx',
    'middle-phalanx-of-finger-2-right':  'Middle finger phalanx',
    'distal-phalanx-of-finger-1-right':  'Distal finger phalanx',
    'metatarsal-1-right':                'Metatarsal',
    'proximal-phalanx-of-toe-1-right':   'Proximal toe phalanx',
    'middle-phalanx-of-toe-2-right':     'Middle toe phalanx',
    'distal-phalanx-of-toe-1-right':     'Distal toe phalanx',
  };
  return labels[repId] ?? repId;
}

// ─── Locate distance ─────────────────────────────────────────────────────────

/**
 * 3D Euclidean distance between two bone centers, in centimetres.
 * Used by locate mode to score click accuracy.
 */
export function bone3DLocateDistance(
  clicked: Anatomy3DElement,
  target: Anatomy3DElement,
): number {
  const dx = clicked.viewBoxCenter.x - target.viewBoxCenter.x;
  const dy = clicked.viewBoxCenter.y - target.viewBoxCenter.y;
  const dz = (clicked.viewBoxCenter.z ?? 0) - (target.viewBoxCenter.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
