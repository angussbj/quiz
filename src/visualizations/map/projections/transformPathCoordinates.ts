import type { MapProjection } from './MapProjection';

/**
 * Re-project an SVG path string whose coordinates are stored in equirectangular
 * viewBox space `(x = wrapped longitude, y = -latitude)`. Each `(x, y)` pair
 * is decoded back to lat/lng, then projected through `projection`.
 *
 * The path is expected to use absolute M/L/Z commands (the format produced by
 * generateBorderPaths.ts and projectGeo.ts:wrapPathCoordinates). Other commands
 * are passed through unchanged, so paths containing curves would not be
 * accurately re-projected — currently the project never produces such paths.
 */
export function transformPathCoordinates(d: string, projection: MapProjection): string {
  if (projection.id === 'equirectangular') return d;

  const numberPattern = /-?\d+(?:\.\d+)?/g;
  const matches: Array<{ value: number; start: number; end: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = numberPattern.exec(d)) !== null) {
    matches.push({ value: parseFloat(match[0]), start: match.index, end: match.index + match[0].length });
  }

  if (matches.length < 2) return d;

  const replacements = new Array<string>(matches.length);
  for (let i = 0; i < matches.length; i += 2) {
    if (i + 1 >= matches.length) {
      replacements[i] = matches[i].value.toString();
      break;
    }
    const x = matches[i].value;
    const y = matches[i + 1].value;
    const projected = projection.project({ latitude: -y, longitude: x });
    replacements[i] = formatCoord(projected.x);
    replacements[i + 1] = formatCoord(projected.y);
  }

  let result = '';
  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    result += d.slice(cursor, matches[i].start);
    result += replacements[i];
    cursor = matches[i].end;
  }
  result += d.slice(cursor);
  return result;
}

function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(4);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/\.?0+$/, '');
}
