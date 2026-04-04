import type { VisualizationElement } from '../VisualizationElement';
import { formatDataValue } from '../formatDataValue';

/**
 * CSV column names that can be displayed as element data.
 * These must match the option values in the periodic table's selectToggle.
 */
export const ELEMENT_DATA_COLUMNS: ReadonlyArray<string> = [
  'half_life', 'density', 'standard_state', 'electronegativity',
  'year_discovered', 'melting_point', 'boiling_point', 'cost_usd_per_kg',
];

/** Column labels used by formatDataValue to determine formatting. */
const COLUMN_LABELS: Readonly<Record<string, string>> = {
  half_life: 'Half-life',
  density: 'Density (g/cm\u00B3)',
  standard_state: 'State',
  electronegativity: 'Electronegativity',
  year_discovered: 'Year discovered',
  melting_point: 'Melting point (K)',
  boiling_point: 'Boiling point (K)',
  cost_usd_per_kg: 'Cost USD/kg (1999\u20132025)',
};

/**
 * Format an element's data column value for compact display.
 * Reads from the element's dataColumns using the CSV column name.
 */
export function formatElementData(element: VisualizationElement, column: string): string {
  const rawValue = element.dataColumns?.[column];
  const label = COLUMN_LABELS[column] ?? column;
  return formatDataValue(rawValue, label);
}
