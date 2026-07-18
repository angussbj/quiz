/**
 * Shared group/category palette for all visualizations. The first 8
 * categories use the theme's --color-group-N tokens; indices beyond that
 * generate golden-ratio-spaced HSL hues (there are only 8 theme tokens).
 */
export const GROUP_COLORS: ReadonlyArray<string> = [
  'var(--color-group-1)',
  'var(--color-group-2)',
  'var(--color-group-3)',
  'var(--color-group-4)',
  'var(--color-group-5)',
  'var(--color-group-6)',
  'var(--color-group-7)',
  'var(--color-group-8)',
];

function generateVibrantColor(index: number): string {
  const goldenRatio = 0.618033988749895;
  const hue = ((index * goldenRatio) % 1) * 360;
  return `hsl(${Math.round(hue)}, 85%, 50%)`;
}

/** Colour for the Nth category: theme group tokens first, then generated hues. */
export function categoryColor(index: number): string {
  if (index < GROUP_COLORS.length) return GROUP_COLORS[index];
  return generateVibrantColor(index - GROUP_COLORS.length);
}

/** Colour keyed by a group's position in the quiz's unique group list. */
export function groupColor(group: string | undefined, groups: ReadonlyArray<string>): string {
  if (!group) return GROUP_COLORS[0];
  const index = groups.indexOf(group);
  return GROUP_COLORS[index >= 0 ? index % GROUP_COLORS.length : 0];
}
