/**
 * Prefix a public asset path with the app's base URL.
 * In dev this is `/`, in production it's `/quiz/` (or whatever `base` is set to in vite.config.ts).
 */
export function assetPath(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path}`;
}
