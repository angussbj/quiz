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
import { memo, useCallback, useEffect, useState } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationElement } from '../VisualizationElement';

/** Distinct colours for seed point dots, cycling per element. */
const SEED_COLORS = [
  '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
  '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4',
  '#469990', '#dcbeff', '#9A6324', '#800000', '#aaffc3',
  '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffffff',
];

interface SeedPoint {
  readonly lng: number;
  readonly lat: number;
  readonly name: string;
}

interface SeedPointOverlayProps {
  readonly dataPath: string;
  readonly elements: ReadonlyArray<VisualizationElement>;
}

/**
 * Fetches seed point data and renders small circles at each seed location.
 * Each element's seeds get a distinct colour so adjacent ranges are distinguishable.
 * Coordinates are in equirectangular projection (x = lng, y = -lat).
 * Hovering a seed shows its peak name in a tooltip.
 */
export const SeedPointOverlay = memo(function SeedPointOverlay({
  dataPath,
  elements,
}: SeedPointOverlayProps) {
  const [seedData, setSeedData] = useState<Readonly<Record<string, ReadonlyArray<SeedPoint>>> | null>(null);
  const [hoveredSeed, setHoveredSeed] = useState<{ readonly x: number; readonly y: number; readonly name: string } | null>(null);

  useEffect(() => {
    fetch(assetPath(dataPath))
      .then(r => r.json())
      .then((data: Record<string, ReadonlyArray<SeedPoint>>) => setSeedData(data))
      .catch(() => {/* ignore fetch errors for debug overlay */});
  }, [dataPath]);

  const handleMouseEnter = useCallback((x: number, y: number, name: string) => {
    if (name) setHoveredSeed({ x, y, name });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSeed(null);
  }, []);

  if (!seedData) return null;

  return (
    <g>
      {elements.map((element, elementIndex) => {
        const seeds = seedData[element.id];
        if (!seeds) return null;
        const color = SEED_COLORS[elementIndex % SEED_COLORS.length];
        return seeds.map((seed, seedIndex) => {
          const x = seed.lng;
          const y = -seed.lat;
          const isGmba = seed.name.startsWith('[GMBA]');
          if (isGmba) {
            // X marker for GMBA sub-range centroids
            const s = 0.25; // half-size of the X
            return (
              <g
                key={`${element.id}-${seedIndex}`}
                style={{ cursor: seed.name ? 'pointer' : undefined }}
                onMouseEnter={() => handleMouseEnter(x, y, seed.name)}
                onMouseLeave={handleMouseLeave}
              >
                <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke={color} strokeWidth={0.12} strokeOpacity={0.9} />
                <line x1={x - s} y1={y + s} x2={x + s} y2={y - s} stroke={color} strokeWidth={0.12} strokeOpacity={0.9} />
              </g>
            );
          }
          // Circle marker for WikiData peaks
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
              style={{ cursor: seed.name ? 'pointer' : undefined }}
              onMouseEnter={() => handleMouseEnter(x, y, seed.name)}
              onMouseLeave={handleMouseLeave}
            />
          );
        });
      })}
      {hoveredSeed && (
        <text
          x={hoveredSeed.x}
          y={hoveredSeed.y - 0.6}
          textAnchor="middle"
          dominantBaseline="auto"
          style={{
            fontSize: '0.8px',
            fill: 'var(--color-text-primary)',
            stroke: 'var(--color-bg-primary)',
            strokeWidth: 0.2,
            strokeLinejoin: 'round',
            paintOrder: 'stroke',
            pointerEvents: 'none',
          }}
        >
          {hoveredSeed.name}
        </text>
      )}
    </g>
  );
});
