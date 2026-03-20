import { computeGroupCameraPosition } from '../computeGroupCameraPosition';

const positions = {
  Europe: { x: -25, y: -72, width: 77, height: 42 },
  Africa: { x: -25, y: -40, width: 85, height: 80 },
  Asia: { x: 25, y: -70, width: 155, height: 80 },
};

describe('computeGroupCameraPosition', () => {
  it('returns undefined when no positions map provided', () => {
    expect(computeGroupCameraPosition(undefined, new Set(['Europe']))).toBeUndefined();
  });

  it('returns undefined when all groups selected (no filtering)', () => {
    expect(computeGroupCameraPosition(positions, undefined)).toBeUndefined();
  });

  it('returns single group position when one group selected', () => {
    const result = computeGroupCameraPosition(positions, new Set(['Europe']));
    expect(result).toEqual(positions.Europe);
  });

  it('returns bounding box of two groups', () => {
    const result = computeGroupCameraPosition(positions, new Set(['Europe', 'Africa']));
    // Europe: x=-25..52, y=-72..-30; Africa: x=-25..60, y=-40..40
    // Bounding box: x=-25, y=-72, width=85, height=112
    expect(result).toEqual({ x: -25, y: -72, width: 85, height: 112 });
  });

  it('returns undefined when selected groups have no camera positions', () => {
    const result = computeGroupCameraPosition(positions, new Set(['Oceania']));
    expect(result).toBeUndefined();
  });

  it('ignores groups without positions in bounding box', () => {
    const result = computeGroupCameraPosition(positions, new Set(['Europe', 'Oceania']));
    expect(result).toEqual(positions.Europe);
  });
});
