import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../parseCsv';

const csvPath = resolve(__dirname, '../../../public/data/science/chemistry/periodic-table.csv');
const csvText = readFileSync(csvPath, 'utf8');
const allRows = parseCsv(csvText);

describe('periodic-table.csv data validation', () => {
  it('has 118 rows (all elements)', () => {
    expect(allRows).toHaveLength(118);
  });

  it('has all required columns', () => {
    const row = allRows[0];
    expect(row).toHaveProperty('id');
    expect(row).toHaveProperty('name');
    expect(row).toHaveProperty('symbol');
    expect(row).toHaveProperty('atomic_number');
    expect(row).toHaveProperty('row');
    expect(row).toHaveProperty('column');
    expect(row).toHaveProperty('category');
    expect(row).toHaveProperty('atomic_weight');
    expect(row).toHaveProperty('block');
    expect(row).toHaveProperty('standard_state');
  });

  it('has no empty ids', () => {
    const emptyIds = allRows.filter((r) => !r['id']);
    expect(emptyIds).toHaveLength(0);
  });

  it('has no duplicate ids', () => {
    const ids = allRows.map((r) => r['id']);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has no duplicate symbols', () => {
    const symbols = allRows.map((r) => r['symbol']);
    const uniqueSymbols = new Set(symbols);
    expect(uniqueSymbols.size).toBe(symbols.length);
  });

  it('has no duplicate atomic numbers', () => {
    const numbers = allRows.map((r) => r['atomic_number']);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(numbers.length);
  });

  it('is sorted by atomic number', () => {
    for (let i = 0; i < allRows.length - 1; i++) {
      const current = parseInt(allRows[i]['atomic_number'], 10);
      const next = parseInt(allRows[i + 1]['atomic_number'], 10);
      expect(next).toBeGreaterThan(current);
    }
  });

  it('has atomic numbers from 1 to 118', () => {
    const numbers = allRows.map((r) => parseInt(r['atomic_number'], 10));
    expect(Math.min(...numbers)).toBe(1);
    expect(Math.max(...numbers)).toBe(118);
  });

  it('has valid row values (0-9)', () => {
    for (const row of allRows) {
      const rowNum = parseInt(row['row'], 10);
      expect(rowNum).toBeGreaterThanOrEqual(0);
      expect(rowNum).toBeLessThanOrEqual(9);
    }
  });

  it('has valid column values (0-17)', () => {
    for (const row of allRows) {
      const col = parseInt(row['column'], 10);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThanOrEqual(17);
    }
  });

  it('has no duplicate row/column positions', () => {
    const positions = allRows.map((r) => `${r['row']},${r['column']}`);
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBe(positions.length);
  });

  it('has valid categories', () => {
    const validCategories = new Set([
      'nonmetal', 'noble-gas', 'alkali-metal', 'alkaline-earth-metal',
      'transition-metal', 'post-transition-metal', 'metalloid',
      'halogen', 'lanthanide', 'actinide',
    ]);
    for (const row of allRows) {
      expect(validCategories.has(row['category'])).toBe(true);
    }
  });

  it('has valid block values', () => {
    const validBlocks = new Set(['s', 'p', 'd', 'f']);
    for (const row of allRows) {
      expect(validBlocks.has(row['block'])).toBe(true);
    }
  });

  it('has valid standard_state values', () => {
    const validStates = new Set(['solid', 'liquid', 'gas']);
    for (const row of allRows) {
      if (row['standard_state']) {
        expect(validStates.has(row['standard_state'])).toBe(true);
      }
    }
  });

  it('has lanthanides in row 8', () => {
    const lanthanides = allRows.filter((r) => r['category'] === 'lanthanide');
    expect(lanthanides).toHaveLength(15);
    for (const row of lanthanides) {
      expect(row['row']).toBe('8');
    }
  });

  it('has actinides in row 9', () => {
    const actinides = allRows.filter((r) => r['category'] === 'actinide');
    expect(actinides).toHaveLength(15);
    for (const row of actinides) {
      expect(row['row']).toBe('9');
    }
  });

  it('id matches lowercased name', () => {
    for (const row of allRows) {
      expect(row['id']).toBe(row['name'].toLowerCase());
    }
  });

  it('has Hydrogen as first element', () => {
    expect(allRows[0]['name']).toBe('Hydrogen');
    expect(allRows[0]['symbol']).toBe('H');
    expect(allRows[0]['atomic_number']).toBe('1');
  });

  it('has Oganesson as last element', () => {
    expect(allRows[117]['name']).toBe('Oganesson');
    expect(allRows[117]['symbol']).toBe('Og');
    expect(allRows[117]['atomic_number']).toBe('118');
  });
});
