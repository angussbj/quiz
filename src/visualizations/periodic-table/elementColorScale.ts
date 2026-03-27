import type { GridElement } from './GridElement';

export type ElementColorField =
  | 'density' | 'electronegativity' | 'melting-point' | 'boiling-point'
  | 'year-discovered' | 'half-life';

const ELEMENT_COLOR_FIELDS: ReadonlyArray<ElementColorField> = [
  'density', 'electronegativity', 'melting-point', 'boiling-point',
  'year-discovered', 'half-life',
];

export function toElementColorField(value: string): ElementColorField | undefined {
  return ELEMENT_COLOR_FIELDS.find((f) => f === value);
}

function getNumericValue(element: GridElement, field: ElementColorField): number | undefined {
  switch (field) {
    case 'density': return element.density;
    case 'electronegativity': return element.electronegativity;
    case 'melting-point': return element.meltingPoint;
    case 'boiling-point': return element.boilingPoint;
    case 'year-discovered': return element.yearDiscovered;
    case 'half-life': {
      // Use log of half-life for color scale; stable = Infinity → treat as max
      if (element.halfLifeSeconds === undefined) return undefined;
      if (element.halfLifeSeconds <= 0) return 0;
      return Math.log10(element.halfLifeSeconds);
    }
  }
}

/** HSL interpolation from blue (240°) to red (0°) via green. */
function hslColor(t: number): string {
  // t=0 → blue (hue 240), t=1 → red (hue 0)
  const hue = 240 * (1 - t);
  return `hsl(${hue}, 70%, 75%)`;
}

export interface ElementColorMap {
  readonly get: (elementId: string) => string | undefined;
}

/**
 * Compute a color map for all grid elements based on a numeric field.
 * Returns a map from element ID to HSL color string.
 * Elements with undefined values get no color (undefined).
 */
export function computeElementColors(
  elements: ReadonlyArray<GridElement>,
  field: ElementColorField,
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
      if (range <= 0) return hslColor(0.5);
      const t = (value - min) / range;
      return hslColor(t);
    },
  };
}
