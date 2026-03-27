import type { GridElement } from './GridElement';
import { isGridElement } from './GridElement';
import type { VisualizationElement } from '../VisualizationElement';

export type ElementColorField =
  | 'category' | 'density' | 'electronegativity' | 'melting-point'
  | 'boiling-point' | 'year-discovered' | 'half-life';

const ELEMENT_COLOR_FIELDS: ReadonlyArray<ElementColorField> = [
  'category', 'density', 'electronegativity', 'melting-point', 'boiling-point',
  'year-discovered', 'half-life',
];

export function toElementColorField(value: string): ElementColorField | undefined {
  return ELEMENT_COLOR_FIELDS.find((f) => f === value);
}

function getNumericValue(element: GridElement, field: Exclude<ElementColorField, 'category'>): number | undefined {
  switch (field) {
    case 'density': return element.density;
    case 'electronegativity': return element.electronegativity;
    case 'melting-point': return element.meltingPoint;
    case 'boiling-point': return element.boilingPoint;
    case 'year-discovered': return element.yearDiscovered;
    case 'half-life': {
      if (element.halfLifeSeconds === undefined) return undefined;
      if (element.halfLifeSeconds <= 0) return 0;
      return Math.log10(element.halfLifeSeconds);
    }
  }
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

/** Compute numeric-gradient-based color map. */
function computeGradientColors(
  elements: ReadonlyArray<GridElement>,
  field: Exclude<ElementColorField, 'category'>,
  darkMode: boolean,
): ElementColorMap {
  const values = new Map<string, number>();
  let min = Infinity;
  let max = -Infinity;

  for (const element of elements) {
    const value = getNumericValue(element, field);
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
  field: ElementColorField,
  darkMode: boolean,
): ElementColorMap {
  if (field === 'category') {
    return computeCategoryColors(elements, darkMode);
  }
  const gridElements = elements.filter(isGridElement);
  return computeGradientColors(gridElements, field, darkMode);
}
