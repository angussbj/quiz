import { buildBone3DElements, bone3DLocateDistance } from '../bones3d';
import type { Anatomy3DElement } from '@/visualizations/anatomy-3d/Anatomy3DElement';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    id: 'femur-right',
    name: 'Femur (right)',
    mesh_name: 'Femur.r',
    x: '10',
    y: '-40',
    z: '2',
    side: 'right',
    direct_mesh: 'true',
    region: 'limbs',
    bone_type: 'bone',
    bilateral_partner: 'femur-left',
    group_representative: '',
    ...overrides,
  };
}

function makeLeftRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return makeRow({
    id: 'femur-left',
    name: 'Femur (left)',
    mesh_name: 'Femur.r',
    side: 'left',
    direct_mesh: 'false',
    bilateral_partner: 'femur-right',
    ...overrides,
  });
}

// ─── buildBone3DElements ─────────────────────────────────────────────────────

describe('buildBone3DElements', () => {
  describe('basic element creation', () => {
    it('creates an element for each active row', () => {
      const rows = [makeRow({ bilateral_partner: '' })];
      const elements = buildBone3DElements(rows, {});
      expect(elements).toHaveLength(1);
      expect(elements[0].id).toBe('femur-right');
      expect(elements[0].label).toBe('Femur (right)');
    });

    it('maps region to group', () => {
      const rows = [makeRow({ bilateral_partner: '', region: 'torso' })];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].group).toBe('torso');
    });

    it('parses coordinates from CSV strings', () => {
      const rows = [makeRow({ x: '5.5', y: '-30.2', z: '1.1', bilateral_partner: '' })];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].viewBoxCenter.x).toBeCloseTo(5.5);
      expect(elements[0].viewBoxCenter.y).toBeCloseTo(-30.2);
      expect(elements[0].viewBoxCenter.z).toBeCloseTo(1.1);
    });
  });

  describe('region filtering', () => {
    it('includes all regions by default', () => {
      const rows = [
        makeRow({ id: 'a', region: 'skull', bilateral_partner: '' }),
        makeRow({ id: 'b', region: 'torso', bilateral_partner: '' }),
        makeRow({ id: 'c', region: 'limbs', bilateral_partner: '' }),
        makeRow({ id: 'd', region: 'hands', bilateral_partner: '' }),
        makeRow({ id: 'e', region: 'feet', bilateral_partner: '' }),
      ];
      const elements = buildBone3DElements(rows, {});
      expect(elements).toHaveLength(5);
    });

    it('excludes skull when showSkull=false', () => {
      const rows = [
        makeRow({ id: 'a', region: 'skull', bilateral_partner: '' }),
        makeRow({ id: 'b', region: 'torso', bilateral_partner: '' }),
      ];
      const elements = buildBone3DElements(rows, { showSkull: false });
      expect(elements).toHaveLength(1);
      expect(elements[0].id).toBe('b');
    });

    it('excludes torso when showTorso=false', () => {
      const rows = [makeRow({ id: 'a', region: 'torso', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showTorso: false })).toHaveLength(0);
    });

    it('excludes limbs when showLimbs=false', () => {
      const rows = [makeRow({ id: 'a', region: 'limbs', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showLimbs: false })).toHaveLength(0);
    });

    it('excludes hands when showHands=false', () => {
      const rows = [makeRow({ id: 'a', region: 'hands', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showHands: false })).toHaveLength(0);
    });

    it('excludes feet when showFeet=false', () => {
      const rows = [makeRow({ id: 'a', region: 'feet', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showFeet: false })).toHaveLength(0);
    });
  });

  describe('bone type filtering', () => {
    it('excludes teeth by default', () => {
      const rows = [makeRow({ bone_type: 'teeth', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, {})).toHaveLength(0);
    });

    it('includes teeth when showTeeth=true', () => {
      const rows = [makeRow({ bone_type: 'teeth', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showTeeth: true })).toHaveLength(1);
    });

    it('excludes costal cartilage by default', () => {
      const rows = [makeRow({ bone_type: 'costal_cartilage', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, {})).toHaveLength(0);
    });

    it('includes costal cartilage when showCostalCart=true', () => {
      const rows = [makeRow({ bone_type: 'costal_cartilage', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showCostalCart: true })).toHaveLength(1);
    });

    it('excludes sesamoids by default', () => {
      const rows = [makeRow({ bone_type: 'sesamoid', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, {})).toHaveLength(0);
    });

    it('includes sesamoids when showSesamoids=true', () => {
      const rows = [makeRow({ bone_type: 'sesamoid', bilateral_partner: '' })];
      expect(buildBone3DElements(rows, { showSesamoids: true })).toHaveLength(1);
    });
  });

  describe('bilateral grouping (groupBilateral=true by default)', () => {
    it('merges a left/right pair into one element', () => {
      const rows = [makeRow(), makeLeftRow()];
      const elements = buildBone3DElements(rows, {});
      expect(elements).toHaveLength(1);
    });

    it('merged element uses right-side id as representative', () => {
      const rows = [makeRow(), makeLeftRow()];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].id).toBe('femur-right');
    });

    it('merged element strips side suffix from label', () => {
      const rows = [makeRow(), makeLeftRow()];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].label).toBe('Femur');
    });

    it('merged element has x=0 (bilateral symmetry)', () => {
      const rows = [
        makeRow({ x: '10' }),
        makeLeftRow({ x: '-10' }),
      ];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].viewBoxCenter.x).toBe(0);
    });

    it('merged element y is average of pair', () => {
      const rows = [
        makeRow({ y: '-40', x: '10' }),
        makeLeftRow({ y: '-44', x: '-10' }),
      ];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].viewBoxCenter.y).toBeCloseTo(-42);
    });

    it('merged element has meshEntries from both sides', () => {
      const rows = [makeRow(), makeLeftRow()];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].meshEntries).toHaveLength(2);
      const sides = elements[0].meshEntries.map((e) => e.side);
      expect(sides).toContain('right');
      expect(sides).toContain('left');
    });

    it('keeps unpaired bones as-is', () => {
      const rows = [makeRow({ bilateral_partner: '' })];
      const elements = buildBone3DElements(rows, {});
      expect(elements).toHaveLength(1);
      expect(elements[0].label).toBe('Femur (right)');
    });

    it('produces two separate elements when groupBilateral=false', () => {
      const rows = [makeRow(), makeLeftRow()];
      const elements = buildBone3DElements(rows, { groupBilateral: false });
      expect(elements).toHaveLength(2);
    });
  });

  describe('numbered grouping (groupNumbered=true by default)', () => {
    function makeRibRow(n: number): Record<string, string> {
      return makeRow({
        id: `rib-${n}-right`,
        name: `Rib ${n} (right)`,
        mesh_name: `Rib.${n}.r`,
        region: 'torso',
        bilateral_partner: `rib-${n}-left`,
        group_representative: 'rib-1-right',
        y: String(-n * 5),
      });
    }

    function makeRibLeftRow(n: number): Record<string, string> {
      return makeRow({
        id: `rib-${n}-left`,
        name: `Rib ${n} (left)`,
        mesh_name: `Rib.${n}.r`,
        side: 'left',
        direct_mesh: 'false',
        region: 'torso',
        bilateral_partner: `rib-${n}-right`,
        group_representative: 'rib-1-right',
        y: String(-n * 5),
      });
    }

    it('merges numbered series into one element', () => {
      const rows = [
        makeRibRow(1), makeRibLeftRow(1),
        makeRibRow(2), makeRibLeftRow(2),
        makeRibRow(3), makeRibLeftRow(3),
      ];
      const elements = buildBone3DElements(rows, {});
      expect(elements).toHaveLength(1);
    });

    it('merged numbered element uses group label', () => {
      const rows = [makeRibRow(1), makeRibLeftRow(1), makeRibRow(2), makeRibLeftRow(2)];
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].label).toBe('Rib');
    });

    it('merged numbered element uses centroid position', () => {
      const rows = [makeRibRow(1), makeRibLeftRow(1), makeRibRow(2), makeRibLeftRow(2)];
      // After bilateral merge: 2 elements with y=-5 and y=-10 (x=0 after bilateral merge)
      // After numbered merge: centroid y = (-5 + -10) / 2 = -7.5
      const elements = buildBone3DElements(rows, {});
      expect(elements[0].viewBoxCenter.y).toBeCloseTo(-7.5);
    });

    it('keeps ungrouped elements when series is mixed with non-series', () => {
      const rows = [
        makeRow({ id: 'sternum', name: 'Sternum', region: 'torso', bilateral_partner: '', group_representative: '' }),
        makeRibRow(1), makeRibLeftRow(1),
      ];
      const elements = buildBone3DElements(rows, {});
      // sternum (ungrouped) + ribs group = 2
      expect(elements).toHaveLength(2);
    });

    it('merged numbered element has meshEntries from all members', () => {
      const rows = [
        makeRibRow(1), makeRibLeftRow(1),
        makeRibRow(2), makeRibLeftRow(2),
        makeRibRow(3), makeRibLeftRow(3),
      ];
      const elements = buildBone3DElements(rows, {});
      // 3 ribs × 2 sides (bilateral already merged into 3) = 3 bilateral elements,
      // then numbered merge collects all 3 bilateral elements' meshEntries (2 each) = 6
      expect(elements[0].meshEntries).toHaveLength(6);
    });

    it('produces individual elements when groupNumbered=false', () => {
      const rows = [makeRibRow(1), makeRibLeftRow(1), makeRibRow(2), makeRibLeftRow(2)];
      // groupBilateral still on, groupNumbered off → 2 bilateral-merged elements
      const elements = buildBone3DElements(rows, { groupNumbered: false });
      expect(elements).toHaveLength(2);
    });
  });
});

// ─── bone3DLocateDistance ────────────────────────────────────────────────────

describe('bone3DLocateDistance', () => {
  function makeElement(x: number, y: number, z: number): Anatomy3DElement {
    return {
      id: 'test',
      label: 'Test',
      interactive: true,
      viewBoxCenter: { x, y, z },
      viewBoxBounds: { minX: x, minY: y, maxX: x, maxY: y },
      meshEntries: [{ meshName: 'Test.r', side: 'right', directMesh: true }],
    };
  }

  it('returns 0 for identical positions', () => {
    const el = makeElement(10, -20, 3);
    expect(bone3DLocateDistance(el, el)).toBe(0);
  });

  it('computes 3D Euclidean distance', () => {
    const a = makeElement(0, 0, 0);
    const b = makeElement(3, 4, 0);
    expect(bone3DLocateDistance(a, b)).toBeCloseTo(5);
  });

  it('includes z axis in distance computation', () => {
    const a = makeElement(0, 0, 0);
    const b = makeElement(0, 0, 10);
    expect(bone3DLocateDistance(a, b)).toBeCloseTo(10);
  });

  it('handles all three axes simultaneously', () => {
    const a = makeElement(1, 2, 3);
    const b = makeElement(4, 6, 3);
    // dx=3, dy=4, dz=0 → 5
    expect(bone3DLocateDistance(a, b)).toBeCloseTo(5);
  });

  it('is symmetric', () => {
    const a = makeElement(1, 2, 3);
    const b = makeElement(5, 6, 7);
    expect(bone3DLocateDistance(a, b)).toBeCloseTo(bone3DLocateDistance(b, a));
  });
});
