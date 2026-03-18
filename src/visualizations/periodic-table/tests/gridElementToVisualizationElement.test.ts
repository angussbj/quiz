import type { GridElement } from '../GridElement';
import { gridElementToVisualizationElement } from '../gridElementToVisualizationElement';

function makeGridElement(overrides: Partial<GridElement> = {}): GridElement {
  return {
    id: 'H',
    label: 'Hydrogen',
    viewBoxCenter: { x: 0, y: 0 },
    viewBoxBounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    interactive: true,
    row: 0,
    column: 0,
    symbol: 'H',
    atomicNumber: 1,
    ...overrides,
  };
}

const CELL_SIZE = 60;
const CELL_GAP = 4;
const CELL_STEP = CELL_SIZE + CELL_GAP;

describe('gridElementToVisualizationElement', () => {
  it('computes viewBox position for row 0, column 0', () => {
    const result = gridElementToVisualizationElement(makeGridElement({ row: 0, column: 0 }));
    expect(result.viewBoxCenter).toEqual({ x: 30, y: 30 });
    expect(result.viewBoxBounds).toEqual({ minX: 0, minY: 0, maxX: 60, maxY: 60 });
  });

  it('computes viewBox position for row 2, column 5', () => {
    const result = gridElementToVisualizationElement(makeGridElement({ row: 2, column: 5 }));
    const expectedX = 5 * CELL_STEP;
    const expectedY = 2 * CELL_STEP;
    expect(result.viewBoxCenter).toEqual({
      x: expectedX + CELL_SIZE / 2,
      y: expectedY + CELL_SIZE / 2,
    });
    expect(result.viewBoxBounds).toEqual({
      minX: expectedX,
      minY: expectedY,
      maxX: expectedX + CELL_SIZE,
      maxY: expectedY + CELL_SIZE,
    });
  });

  it('preserves all original element fields', () => {
    const original = makeGridElement({ id: 'Fe', label: 'Iron', group: 'transition-metal' });
    const result = gridElementToVisualizationElement(original);
    expect(result.id).toBe('Fe');
    expect(result.label).toBe('Iron');
    expect(result.group).toBe('transition-metal');
  });
});
