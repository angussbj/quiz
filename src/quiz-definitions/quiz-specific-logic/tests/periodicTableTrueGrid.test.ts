import { computeTrueGridPosition, computeTrueGridManhattanDistance } from '../periodicTableTrueGrid';

describe('computeTrueGridPosition', () => {
  it('keeps s-block elements unchanged (cols 0-1)', () => {
    // Hydrogen: row 0, col 0
    expect(computeTrueGridPosition(0, 0)).toEqual({ trueRow: 0, trueColumn: 0 });
    // Barium: row 5, col 1
    expect(computeTrueGridPosition(5, 1)).toEqual({ trueRow: 5, trueColumn: 1 });
  });

  it('shifts d-block and p-block columns by +14', () => {
    // Scandium: row 3, col 2 → true_col 16
    expect(computeTrueGridPosition(3, 2)).toEqual({ trueRow: 3, trueColumn: 16 });
    // Helium: row 0, col 17 → true_col 31
    expect(computeTrueGridPosition(0, 17)).toEqual({ trueRow: 0, trueColumn: 31 });
    // Carbon: row 1, col 13 → true_col 27
    expect(computeTrueGridPosition(1, 13)).toEqual({ trueRow: 1, trueColumn: 27 });
  });

  it('maps lanthanides (CSV row 8) to period 6 (true row 5) without column shift', () => {
    // Lanthanum: row 8, col 2 → true_row 5, true_col 2
    expect(computeTrueGridPosition(8, 2)).toEqual({ trueRow: 5, trueColumn: 2 });
    // Lutetium: row 8, col 16 → true_row 5, true_col 16
    expect(computeTrueGridPosition(8, 16)).toEqual({ trueRow: 5, trueColumn: 16 });
  });

  it('maps actinides (CSV row 9) to period 7 (true row 6) without column shift', () => {
    // Actinium: row 9, col 2 → true_row 6, true_col 2
    expect(computeTrueGridPosition(9, 2)).toEqual({ trueRow: 6, trueColumn: 2 });
    // Lawrencium: row 9, col 16 → true_row 6, true_col 16
    expect(computeTrueGridPosition(9, 16)).toEqual({ trueRow: 6, trueColumn: 16 });
  });

  it('places Lu directly below Y', () => {
    // Yttrium: row 4, col 2 → true_col 16
    const y = computeTrueGridPosition(4, 2);
    // Lutetium: row 8, col 16 → true_col 16
    const lu = computeTrueGridPosition(8, 16);
    expect(y.trueColumn).toBe(lu.trueColumn);
    expect(lu.trueRow).toBe(y.trueRow + 1);
  });

  it('places La beside Ba', () => {
    // Barium: row 5, col 1 → true_col 1
    const ba = computeTrueGridPosition(5, 1);
    // Lanthanum: row 8, col 2 → true_col 2
    const la = computeTrueGridPosition(8, 2);
    expect(la.trueColumn).toBe(ba.trueColumn + 1);
    expect(la.trueRow).toBe(ba.trueRow);
  });

  it('places Hf beside Lu', () => {
    // Hafnium: row 5, col 3 → true_col 17
    const hf = computeTrueGridPosition(5, 3);
    // Lutetium: row 8, col 16 → true_col 16
    const lu = computeTrueGridPosition(8, 16);
    expect(hf.trueColumn).toBe(lu.trueColumn + 1);
    expect(hf.trueRow).toBe(lu.trueRow);
  });
});

describe('computeTrueGridManhattanDistance', () => {
  it('returns 0 for same position', () => {
    expect(computeTrueGridManhattanDistance(
      { trueRow: 3, trueColumn: 5 },
      { trueRow: 3, trueColumn: 5 },
    )).toBe(0);
  });

  it('computes horizontal distance', () => {
    expect(computeTrueGridManhattanDistance(
      { trueRow: 0, trueColumn: 0 },
      { trueRow: 0, trueColumn: 31 },
    )).toBe(31);
  });

  it('computes vertical distance', () => {
    expect(computeTrueGridManhattanDistance(
      { trueRow: 0, trueColumn: 0 },
      { trueRow: 6, trueColumn: 0 },
    )).toBe(6);
  });

  it('computes combined distance', () => {
    expect(computeTrueGridManhattanDistance(
      { trueRow: 1, trueColumn: 5 },
      { trueRow: 4, trueColumn: 10 },
    )).toBe(8);
  });

  it('computes correct distance from Ba to Hf (across f-block)', () => {
    // Ba (true: 5,1) → Hf (true: 5,17): distance = 16
    const ba = computeTrueGridPosition(5, 1);
    const hf = computeTrueGridPosition(5, 3);
    expect(computeTrueGridManhattanDistance(ba, hf)).toBe(16);
  });
});
