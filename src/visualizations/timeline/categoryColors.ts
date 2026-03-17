const THEME_GROUP_COUNT = 8;

/**
 * Generate a vibrant random color for categories beyond the 8 theme colors.
 * Uses golden-ratio hue spacing for good distribution, full saturation.
 */
function generateVibrantColor(index: number): string {
  const goldenRatio = 0.618033988749895;
  const hue = ((index * goldenRatio) % 1) * 360;
  return `hsl(${Math.round(hue)}, 85%, 50%)`;
}

/**
 * Build a map from category names to CSS color values.
 *
 * The first 8 categories get theme colors (var(--color-group-N)).
 * Additional categories get randomly generated vibrant colors.
 */
export function buildCategoryColorMap(
  categories: ReadonlyArray<string>,
): Readonly<Record<string, string>> {
  const uniqueCategories: string[] = [];
  for (const category of categories) {
    if (!uniqueCategories.includes(category)) {
      uniqueCategories.push(category);
    }
  }

  const result: Record<string, string> = {};
  for (let i = 0; i < uniqueCategories.length; i++) {
    if (i < THEME_GROUP_COUNT) {
      result[uniqueCategories[i]] = `var(--color-group-${i + 1})`;
    } else {
      result[uniqueCategories[i]] = generateVibrantColor(i - THEME_GROUP_COUNT);
    }
  }

  return result;
}
