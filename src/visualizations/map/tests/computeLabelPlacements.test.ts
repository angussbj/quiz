import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseCsv } from '../../../quiz-definitions/parseCsv';
import { parseBackgroundPaths } from '../../../quiz-definitions/parseBackgroundPaths';
import { applyDataFilter } from '../../../quiz-definitions/applyDataFilter';
import { computeBackgroundLabels } from '../computeBackgroundLabels';
import { computeLabelPlacements } from '../computeLabelPlacements';

const bordersPath = resolve(__dirname, '../../../../public/data/borders/world-borders.csv');
const capitalsPath = resolve(__dirname, '../../../../public/data/capitals/world-capitals.csv');

const borderRows = parseCsv(readFileSync(bordersPath, 'utf8'));
const capitalRows = parseCsv(readFileSync(capitalsPath, 'utf8'));

const europeanCapitalRows = applyDataFilter(capitalRows, { column: 'region', values: ['Europe'] });

// Use ALL borders (matching the browser which loads world-borders.csv in full)
const backgroundPaths = parseBackgroundPaths(borderRows);
const allLabels = computeBackgroundLabels(backgroundPaths);

// Filter to sovereign countries in Europe (same as QuizPage.tsx)
const labels = allLabels.filter((label) => {
  if (!label.sovereign || label.sovereign !== label.name) return false;
  if (!label.region) return false;
  return label.region.split('|').some((r) => r === 'Europe');
});

// Capital city dot positions (the avoid points)
const capitalDots = europeanCapitalRows.map((row) => ({
  x: parseFloat(row['longitude']),
  y: -parseFloat(row['latitude']),
}));

describe('European label placements', () => {
  it('Serbia has larger area than its Balkans neighbors', () => {
    const serbiaLabel = labels.find((l) => l.name === 'Serbia');
    const bosniaLabel = labels.find((l) => l.name === 'Bosnia and Herzegovina');
    const kosovoLabel = labels.find((l) => l.name === 'Kosovo');
    const montenegroLabel = labels.find((l) => l.name === 'Montenegro');

    expect(serbiaLabel).toBeDefined();
    expect(bosniaLabel).toBeDefined();
    expect(serbiaLabel!.area).toBeGreaterThan(bosniaLabel!.area);
    expect(serbiaLabel!.area).toBeGreaterThan(kosovoLabel!.area);
    expect(serbiaLabel!.area).toBeGreaterThan(montenegroLabel!.area);
  });

  for (const scale of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`includes Serbia at scale ${scale}`, () => {
      const result = computeLabelPlacements({
        labels,
        scale,
        showNames: true,
        showFlags: true,
        avoidPoints: capitalDots,
      });
      expect(result.placements.map((p) => p.label.name)).toContain('Serbia');
    });
  }

  it('flags-only mode places flags at all zoom levels', () => {
    for (const scale of [1, 2, 3, 4, 5, 6, 8, 12, 20]) {
      const result = computeLabelPlacements({
        labels,
        scale,
        showNames: false,
        showFlags: true,
        avoidPoints: capitalDots,
      });

      // At least half the countries should have flags placed
      const placedCount = result.placements.length;
      if (placedCount < labels.length / 2) {
        console.log(`Scale ${scale}: only ${placedCount}/${labels.length} flags placed`);
        console.log('Placed:', result.placements.map((p) => p.label.name).join(', '));
      }
      expect(placedCount).toBeGreaterThan(labels.length / 2);
    }
  });

  it('flags-only mode places flags at each zoom level', () => {
    for (const scale of [1, 1.5, 2, 2.5, 3, 3.5, 4]) {
      const result = computeLabelPlacements({
        labels,
        scale,
        showNames: false,
        showFlags: true,
        avoidPoints: capitalDots,
      });

      const placedCount = result.placements.length;
      if (placedCount < labels.length / 2) {
        console.log(`Scale ${scale}: only ${placedCount}/${labels.length} flags placed`);
      }
      expect(placedCount).toBeGreaterThan(labels.length / 2);
    }
  });

  it('diagnoses Serbia placement failure at moderate zoom levels', () => {
    // Test at scales where the screenshot shows Serbia missing
    for (const scale of [3, 4, 5, 6, 7]) {
      const result = computeLabelPlacements({
        labels,
        scale,
        showNames: true,
        showFlags: true,
        avoidPoints: capitalDots,
      });

      const serbia = labels.find((l) => l.name === 'Serbia')!;
      const serbiaPlacement = result.placements.find((p) => p.label.name === 'Serbia');

      if (!serbiaPlacement) {
        console.log(`\n=== Scale ${scale}: Serbia NOT placed ===`);
        console.log(`  Area: ${serbia.area.toFixed(2)}, countryRadius: ${(Math.sqrt(serbia.area) * 0.6).toFixed(2)}`);
        console.log(`  Centers: ${serbia.centers.map((c) => `(${c.x.toFixed(2)}, ${c.y.toFixed(2)})`).join(', ')}`);

        // What labels ARE placed near Serbia's area?
        const nearby = result.placements
          .filter((p) => {
            const cx = p.x + p.width / 2;
            const cy = p.y + p.height / 2;
            return Math.abs(cx - serbia.center.x) < 8 && Math.abs(cy - serbia.center.y) < 8;
          })
          .map((p) => `${p.label.name} center=(${(p.x + p.width / 2).toFixed(1)}, ${(p.y + p.height / 2).toFixed(1)}) w=${p.width.toFixed(2)} h=${p.height.toFixed(2)}`);
        console.log(`  Nearby placed labels:\n    ${nearby.join('\n    ')}`);

        // What's Serbia's processing order?
        const sortedNames = [...labels].sort((a, b) => b.area - a.area).map((l) => l.name);
        console.log(`  Serbia is #${sortedNames.indexOf('Serbia') + 1} of ${sortedNames.length} by area`);

        // Countries placed before Serbia that might block it
        const placedBeforeSerbia = sortedNames
          .slice(0, sortedNames.indexOf('Serbia'))
          .filter((n) => result.placements.some((p) => p.label.name === n));
        const blockingNearby = result.placements
          .filter((p) => placedBeforeSerbia.includes(p.label.name))
          .filter((p) => {
            const cx = p.x + p.width / 2;
            const cy = p.y + p.height / 2;
            return Math.abs(cx - serbia.center.x) < 6 && Math.abs(cy - serbia.center.y) < 6;
          });
        console.log(`  Larger countries placed nearby:\n    ${blockingNearby.map((p) => `${p.label.name} at (${p.x.toFixed(1)}, ${p.y.toFixed(1)}) w=${p.width.toFixed(2)} h=${p.height.toFixed(2)}`).join('\n    ')}`);
      } else {
        const cx = serbiaPlacement.x + serbiaPlacement.width / 2;
        const cy = serbiaPlacement.y + serbiaPlacement.height / 2;
        console.log(`Scale ${scale}: Serbia placed at center (${cx.toFixed(2)}, ${cy.toFixed(2)})`);
      }
    }
    // This test is diagnostic — always passes
  });

  it('Serbia label is placed near Serbia (not drifted far away) at high zoom', () => {
    const result = computeLabelPlacements({
      labels,
      scale: 20,
      showNames: true,
      showFlags: true,
      avoidPoints: capitalDots,
    });

    const serbiaPlacement = result.placements.find((p) => p.label.name === 'Serbia');
    expect(serbiaPlacement).toBeDefined();

    // Serbia's bbox is x=[18.86, 22.98], y=[-46.16, -42.24]
    // The label center should be within a reasonable distance of Serbia's territory
    const serbia = labels.find((l) => l.name === 'Serbia')!;
    const labelCenterX = serbiaPlacement!.x + serbiaPlacement!.width / 2;
    const labelCenterY = serbiaPlacement!.y + serbiaPlacement!.height / 2;
    const distFromCentroid = Math.sqrt(
      (labelCenterX - serbia.center.x) ** 2 + (labelCenterY - serbia.center.y) ** 2,
    );

    // Label should be within 2.5x the country radius of the centroid
    const countryRadius = Math.sqrt(serbia.area) * 0.6;
    expect(distFromCentroid).toBeLessThan(countryRadius * 2.5);
  });
});
