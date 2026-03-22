import { computeTrueGridPosition, computeTrueGridManhattanDistance, trueToVisualPosition, computeTrueGridPath } from '../periodicTableTrueGrid';

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

describe('trueToVisualPosition', () => {
  it('maps s-block back unchanged', () => {
    expect(trueToVisualPosition(0, 0)).toEqual({ row: 0, column: 0 });
    expect(trueToVisualPosition(5, 1)).toEqual({ row: 5, column: 1 });
  });

  it('maps lanthanide f-block positions to CSV row 8', () => {
    // La: true (5, 2) → CSV (8, 2)
    expect(trueToVisualPosition(5, 2)).toEqual({ row: 8, column: 2 });
    // Lu: true (5, 16) → CSV (8, 16)
    expect(trueToVisualPosition(5, 16)).toEqual({ row: 8, column: 16 });
  });

  it('maps actinide f-block positions to CSV row 9', () => {
    expect(trueToVisualPosition(6, 2)).toEqual({ row: 9, column: 2 });
    expect(trueToVisualPosition(6, 16)).toEqual({ row: 9, column: 16 });
  });

  it('maps d/p-block positions by shifting column -14', () => {
    // Hf: true (5, 17) → CSV (5, 3)
    expect(trueToVisualPosition(5, 17)).toEqual({ row: 5, column: 3 });
    // He: true (0, 31) → CSV (0, 17)
    expect(trueToVisualPosition(0, 31)).toEqual({ row: 0, column: 17 });
  });

  it('round-trips with computeTrueGridPosition', () => {
    // Test that forward→inverse returns the original CSV position
    const cases = [
      { row: 0, col: 0 },   // H
      { row: 0, col: 17 },  // He
      { row: 5, col: 1 },   // Ba
      { row: 8, col: 2 },   // La
      { row: 8, col: 16 },  // Lu
      { row: 5, col: 3 },   // Hf
      { row: 9, col: 10 },  // Cf (actinide)
    ];
    for (const { row, col } of cases) {
      const truePos = computeTrueGridPosition(row, col);
      const visual = trueToVisualPosition(truePos.trueRow, truePos.trueColumn);
      expect(visual).toEqual({ row, column: col });
    }
  });
});

describe('computeTrueGridPath', () => {
  it('returns single cell for same position', () => {
    const pos = computeTrueGridPosition(0, 0);
    const path = computeTrueGridPath(pos, pos);
    expect(path).toEqual([{ row: 0, column: 0 }]);
  });

  it('returns horizontal path for same-row elements', () => {
    // Li (1, 0) to Be (1, 1): true cols 0 and 1
    const from = computeTrueGridPosition(1, 0);
    const to = computeTrueGridPosition(1, 1);
    const path = computeTrueGridPath(from, to);
    expect(path).toEqual([
      { row: 1, column: 0 },
      { row: 1, column: 1 },
    ]);
  });

  it('returns path through lanthanide row for Ba → Hf', () => {
    // Ba: true (5,1), Hf: true (5,17)
    // Path goes horizontally: true cols 1→2→3→…→17
    // Cols 2-16 map to lanthanide row (CSV row 8), col 17 maps back to main row 5
    const from = computeTrueGridPosition(5, 1);
    const to = computeTrueGridPosition(5, 3);
    const path = computeTrueGridPath(from, to);
    expect(path.length).toBe(17); // 16 steps + 1
    expect(path[0]).toEqual({ row: 5, column: 1 }); // Ba
    expect(path[1]).toEqual({ row: 8, column: 2 }); // La (lanthanide row)
    expect(path[15]).toEqual({ row: 8, column: 16 }); // Lu
    expect(path[16]).toEqual({ row: 5, column: 3 }); // Hf
  });

  it('handles vertical-only path', () => {
    // H (0,0) to Li (1,0)
    const from = computeTrueGridPosition(0, 0);
    const to = computeTrueGridPosition(1, 0);
    const path = computeTrueGridPath(from, to);
    expect(path).toEqual([
      { row: 0, column: 0 },
      { row: 1, column: 0 },
    ]);
  });

  it('places horizontal leg at bottom when going down-right', () => {
    // H (true 0,0) to Be (true 1,1): down 1, right 1 → L shape
    const from = computeTrueGridPosition(0, 0);
    const to = computeTrueGridPosition(1, 1);
    const path = computeTrueGridPath(from, to);
    expect(path).toEqual([
      { row: 0, column: 0 },  // H
      { row: 1, column: 0 },  // vertical step down (Li)
      { row: 1, column: 1 },  // Be (horizontal at bottom)
    ]);
  });

  it('places horizontal leg at bottom when going up-right', () => {
    // Be (true 1,1) to He (true 0,31): horizontal first at row 1, then up
    const from = computeTrueGridPosition(1, 1);
    const to = computeTrueGridPosition(0, 17);
    const path = computeTrueGridPath(from, to);
    // Horizontal from true col 1→31 at row 1, then vertical 1→0
    expect(path[0]).toEqual({ row: 1, column: 1 }); // Be
    expect(path[path.length - 1]).toEqual({ row: 0, column: 17 }); // He
    // Second-to-last should be at row 1 (horizontal leg), last is row 0 (vertical up)
    expect(path[path.length - 2].row).toBe(1);
  });
});
