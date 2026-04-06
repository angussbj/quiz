/**
 * DEBUG: Renders coloured dots at seed point locations used for mountain range
 * polygon generation. Helps verify that seeds are well-distributed and that
 * Voronoi partitioning produces reasonable results.
 *
 * To remove this debug feature entirely, delete:
 * 1. This file (SeedPointOverlay.tsx)
 * 2. The 'showSeedPoints' toggle in quizRegistry.ts (mountainRangesQuizBase)
 * 3. The 'seedPointsDataPath' field in quizRegistry.ts and QuizDefinition.ts
 * 4. The <SeedPointOverlay> usage in MapRenderer.tsx
 * 5. The generated file public/data/mountains/mountain-range-seeds.json
 * 6. The seed JSON output block at the end of scripts/generateMountainRanges.ts
 */
import { memo, useEffect, useState } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationElement } from '../VisualizationElement';

/** Distinct colours for seed point dots, cycling per element. */
const SEED_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffffff',
];

interface SeedPointOverlayProps {
  readonly dataPath: string;
  readonly elements: ReadonlyArray<VisualizationElement>;
}

/**
 * Fetches seed point data and renders small circles at each seed location.
 * Each element's seeds get a distinct colour so adjacent ranges are distinguishable.
 * Coordinates are in equirectangular projection (x = lng, y = -lat).
 */
export const SeedPointOverlay = memo(function SeedPointOverlay({
  dataPath,
  elements,
}: SeedPointOverlayProps) {
  const [seedData, setSeedData] = useState<Readonly<Record<string, ReadonlyArray<readonly [number, number]>>> | null>(null);

  useEffect(() => {
    fetch(assetPath(dataPath))
      .then(r => r.json())
      .then((data: Record<string, ReadonlyArray<readonly [number, number]>>) => setSeedData(data))
      .catch(() => {/* ignore fetch errors for debug overlay */});
  }, [dataPath]);

  if (!seedData) return null;

  return (
    <g>
      {elements.map((element, elementIndex) => {
        const seeds = seedData[element.id];
        if (!seeds) return null;
        const color = SEED_COLORS[elementIndex % SEED_COLORS.length];
        return seeds.map((seed, seedIndex) => {
          const [lng, lat] = seed;
          // Equirectangular projection: x = longitude, y = -latitude
          const x = lng;
          const y = -lat;
          return (
            <circle
              key={`${element.id}-${seedIndex}`}
              cx={x}
              cy={y}
              r={0.3}
              fill={color}
              fillOpacity={0.9}
              stroke="black"
              strokeWidth={0.05}
              strokeOpacity={0.5}
            />
          );
        });
      })}
    </g>
  );
});
