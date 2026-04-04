import { isGridElement } from './GridElement';
import type { VisualizationElement } from '../VisualizationElement';

/** Valid color field values — CSV column names or 'category'. */
const ELEMENT_COLOR_FIELDS: ReadonlyArray<string> = [
  'category', 'density', 'electronegativity', 'melting_point', 'boiling_point',
  'year_discovered', 'half_life', 'cost_usd_per_kg',
];

export function toElementColorField(value: string): string | undefined {
  return ELEMENT_COLOR_FIELDS.find((f) => f === value);
}

/** Get the numeric value for a color scale field from an element's dataColumns. */
function getNumericValue(element: VisualizationElement, column: string): number | undefined {
  const raw = element.dataColumns?.[column];
  if (raw === undefined || raw === '') return undefined;

  // Strip approximate/estimate markers for numeric parsing
  const stripped = raw.replace(/^~/, '').replace(/\?$/, '');
  const value = parseFloat(stripped);
  if (isNaN(value)) return undefined;

  // Use log scale for half-life and cost (huge range of values)
  if (column === 'half_life' || column === 'cost_usd_per_kg') {
    return value <= 0 ? 0 : Math.log10(value);
  }
  return value;
}

/** HSL color string. */
function hslColor(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/** Light-mode lightness for pastel fills (dark text on light bg). */
const LIGHT_LIGHTNESS = 82;
/** Dark-mode lightness for deep fills (light text on dark bg). */
const DARK_LIGHTNESS = 28;

/** Gradient color: blue (240°) → red (0°) via green. */
function gradientColor(t: number, darkMode: boolean): string {
  const hue = 240 * (1 - t);
  return hslColor(hue, 50, darkMode ? DARK_LIGHTNESS : LIGHT_LIGHTNESS);
}

/** Fixed category colors — 8 distinguishable hues. */
const CATEGORY_HUES: ReadonlyArray<readonly [number, number]> = [
  [215, 45],  // blue
  [20, 50],   // orange
  [150, 40],  // green
  [280, 40],  // purple
  [45, 50],   // yellow
  [175, 45],  // teal
  [335, 45],  // pink
  [15, 35],   // brown
];

function categoryColor(index: number, darkMode: boolean): string {
  const [hue, sat] = CATEGORY_HUES[index % CATEGORY_HUES.length];
  return hslColor(hue, sat, darkMode ? DARK_LIGHTNESS : LIGHT_LIGHTNESS);
}

export interface ElementColorMap {
  readonly get: (elementId: string) => string | undefined;
}

/** Compute category-based color map using element group assignments. */
function computeCategoryColors(elements: ReadonlyArray<VisualizationElement>, darkMode: boolean): ElementColorMap {
  const groupIndexMap = new Map<string, number>();
  let index = 0;
  for (const element of elements) {
    if (element.group && !groupIndexMap.has(element.group)) {
      groupIndexMap.set(element.group, index % CATEGORY_HUES.length);
      index++;
    }
  }

  const colorMap = new Map<string, string>();
  for (const element of elements) {
    if (isGridElement(element) && element.group) {
      const groupIndex = groupIndexMap.get(element.group);
      if (groupIndex !== undefined) {
        colorMap.set(element.id, categoryColor(groupIndex, darkMode));
      }
    }
  }

  return { get: (id) => colorMap.get(id) };
}

/** Compute numeric-gradient-based color map using dataColumns. */
function computeGradientColors(
  elements: ReadonlyArray<VisualizationElement>,
  column: string,
  darkMode: boolean,
): ElementColorMap {
  const values = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;

  for (const element of elements) {
    const value = getNumericValue(element, column);
    if (value !== undefined) {
      values.set(element.id, value);
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const range = max - min;

  return {
    get(elementId: string): string | undefined {
      const value = values.get(elementId);
      if (value === undefined) return undefined;
      if (range <= 0) return gradientColor(0.5, darkMode);
      const t = (value - min) / range;
      return gradientColor(t, darkMode);
    },
  };
}

/**
 * Compute a color map for all elements based on a field.
 * 'category' uses fixed distinguishable hues; numeric fields use a gradient.
 * In dark mode, colors use low lightness with light text; in light mode, high lightness with dark text.
 */
export function computeElementColors(
  elements: ReadonlyArray<VisualizationElement>,
  field: string,
  darkMode: boolean,
): ElementColorMap {
  if (field === 'category') {
    return computeCategoryColors(elements, darkMode);
  }
  return computeGradientColors(elements, field, darkMode);
}
