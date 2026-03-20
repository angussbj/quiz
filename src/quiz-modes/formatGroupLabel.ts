/**
 * Converts a kebab-case group key (e.g., 'noble-gas') into a human-readable label ('Noble gas').
 * Capitalizes the first word and replaces hyphens with spaces.
 */
export function formatGroupLabel(group: string): string {
  const words = group.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
