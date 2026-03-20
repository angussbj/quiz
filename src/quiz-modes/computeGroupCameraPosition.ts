type CameraRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function computeGroupCameraPosition(
  positions: Readonly<Record<string, CameraRect>> | undefined,
  selectedGroups: ReadonlySet<string> | undefined,
): CameraRect | undefined {
  if (!positions || !selectedGroups) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const group of selectedGroups) {
    const pos = positions[group];
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
    count++;
  }

  if (count === 0) return undefined;

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
