import { categoryColor } from '../groupColors';

/**
 * Build a map from category names to CSS color values.
 *
 * The first 8 categories get theme colors (var(--color-group-N)).
 * Additional categories get generated vibrant colors.
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
    result[uniqueCategories[i]] = categoryColor(i);
  }

  return result;
}
