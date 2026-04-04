import type { GridElement } from './GridElement';
import { isGridElement } from './GridElement';
import type { VisualizationElement } from '../VisualizationElement';
import { computeAdaptiveScale } from '../../utilities/adaptiveScale';

export type ElementColorField =
  | 'category' | 'density' | 'electronegativity' | 'melting-point'
  | 'boiling-point' | 'year-discovered' | 'half-life' | 'cost';

const ELEMENT_COLOR_FIELDS: ReadonlyArray<ElementColorField> = [
  'category', 'density', 'electronegativity', 'melting-point', 'boiling-point',
  'year-discovered', 'half-life', 'cost',
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
    case 'half-life': return element.halfLifeSeconds;
    case 'cost': return element.costUsdPerKg;
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

/**
 * Gradient color mapping across three ranges:
 *   [-1, 0] → deep purple (270°) to blue-purple (255°) for low outliers
 *   [0,  1] → blue (240°) → red (0°) via green for normal values
 *   [1,  2] → red-pink (345°) to magenta (320°) for high outliers
 */
function gradientColor(t: number, darkMode: boolean): string {
  const lightness = darkMode ? DARK_LIGHTNESS : LIGHT_LIGHTNESS;
  if (t > 1) {
    // High outlier: red-pink (345°) → magenta (320°)
    const outlierT = Math.min(t - 1, 1);
    const hue = 345 - 25 * outlierT;
    return hslColor(hue, 50, lightness);
  }
  if (t < 0) {
    // Low outlier: blue-purple (255°) → deep purple (270°)
    const outlierT = Math.min(-t, 1);
    const hue = 255 + 15 * outlierT;
    return hslColor(hue, 50, lightness);
  }
  const hue = 240 * (1 - t);
  return hslColor(hue, 50, lightness);
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

/** Compute numeric-gradient-based color map using adaptive scaling. */
function computeGradientColors(
  elements: ReadonlyArray<GridElement>,
  field: Exclude<ElementColorField, 'category'>,
  darkMode: boolean,
): ElementColorMap {
  const valuesByElement = new Map<string, number>();

  for (const element of elements) {
    const value = getNumericValue(element, field);
    if (value !== undefined) {
      valuesByElement.set(element.id, value);
    }
  }

  const numericValues = [...valuesByElement.values()];
  const scale = computeAdaptiveScale(numericValues);

  return {
    get(elementId: string): string | undefined {
      const value = valuesByElement.get(elementId);
      if (value === undefined) return undefined;
      return gradientColor(scale.transform(value), darkMode);
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
