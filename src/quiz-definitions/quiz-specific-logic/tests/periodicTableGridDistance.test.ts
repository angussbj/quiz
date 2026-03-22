import { periodicTableGridDistance, buildOccupiedCells } from '../periodicTableGridDistance';
import { CELL_SIZE, CELL_STEP } from '@/visualizations/periodic-table/cellLayout';

/** Helper: convert a (row, col) grid position to the center of that cell in viewBox coords. */
function cellCenter(row: number, col: number) {
  return {
    x: col * CELL_STEP + CELL_SIZE / 2,
    y: row * CELL_STEP + CELL_SIZE / 2,
  };
}

/**
 * Build occupied cells for the standard 18-column periodic table layout.
 * Row 0: cols 0, 17 (H, He)
 * Row 1: cols 0-1, 12-17 (Li-Be, B-Ne)
 * Row 2: cols 0-1, 12-17 (Na-Mg, Al-Ar)
 * Row 3: cols 0-17 (K-Kr)
 * Row 4: cols 0-17 (Rb-Xe)
 * Row 5: cols 0-17 (Cs-Rn)
 * Row 6: cols 0-17 (Fr-Og)
 * Row 8: cols 2-16 (La-Lu)
 * Row 9: cols 2-16 (Ac-Lr)
 */
function buildTestOccupiedCells(): ReadonlySet<string> {
  const cells: Array<{ x: number; y: number }> = [];
  const addCells = (row: number, cols: ReadonlyArray<number>) => {
    for (const col of cols) cells.push(cellCenter(row, col));
  };
  addCells(0, [0, 17]);
  addCells(1, [0, 1, 12, 13, 14, 15, 16, 17]);
  addCells(2, [0, 1, 12, 13, 14, 15, 16, 17]);
  for (let row = 3; row <= 6; row++) {
    addCells(row, Array.from({ length: 18 }, (_, i) => i));
  }
  for (let col = 2; col <= 16; col++) {
    addCells(8, [col]);
    addCells(9, [col]);
  }
  return buildOccupiedCells(cells);
}

const occupied = buildTestOccupiedCells();

describe('periodicTableGridDistance', () => {
  it('returns 0 for same cell', () => {
    const center = cellCenter(0, 0); // Hydrogen
    expect(periodicTableGridDistance(center, center, occupied)).toBe(0);
  });

  it('returns 1 for adjacent cells in the same row', () => {
    // Li (row 1, col 0) → Be (row 1, col 1): s-block, true cols 0 and 1
    expect(periodicTableGridDistance(cellCenter(1, 0), cellCenter(1, 1), occupied)).toBe(1);
  });

  it('returns 1 for adjacent cells in the same column', () => {
    // H (row 0, col 0) → Li (row 1, col 0)
    expect(periodicTableGridDistance(cellCenter(0, 0), cellCenter(1, 0), occupied)).toBe(1);
  });

  it('returns 1 for Be → B (skipping empty cells in period 2)', () => {
    // Be (row 1, col 1) → B (row 1, col 12): no occupied cells between them
    expect(periodicTableGridDistance(cellCenter(1, 1), cellCenter(1, 12), occupied)).toBe(1);
  });

  it('returns 1 for H → He (skipping empty cells in period 1)', () => {
    // H (0,0) → He (0,17): no occupied cells between them
    expect(periodicTableGridDistance(cellCenter(0, 0), cellCenter(0, 17), occupied)).toBe(1);
  });

  it('computes distance = 1 for Ba → La (s-block to lanthanide)', () => {
    // Ba: row 5, col 1 → true (5, 1)
    // La: row 8, col 2 → true (5, 2)
    expect(periodicTableGridDistance(cellCenter(5, 1), cellCenter(8, 2), occupied)).toBe(1);
  });

  it('counts occupied cells across a full row', () => {
    // K (3, 0) → Kr (3, 17): all 18 cols occupied, distance = 17
    expect(periodicTableGridDistance(cellCenter(3, 0), cellCenter(3, 17), occupied)).toBe(17);
  });

  it('counts occupied cells across f-block', () => {
    // Ba (5, 1) → Hf (5, 3): path goes through all 15 lanthanides + Hf = 16
    expect(periodicTableGridDistance(cellCenter(5, 1), cellCenter(5, 3), occupied)).toBe(16);
  });

  it('handles click slightly off-center within the same cell', () => {
    const center = cellCenter(2, 5);
    const slightlyOff = { x: center.x + 10, y: center.y - 10 };
    // Should round to same cell
    expect(periodicTableGridDistance(slightlyOff, center, occupied)).toBe(0);
  });
});
