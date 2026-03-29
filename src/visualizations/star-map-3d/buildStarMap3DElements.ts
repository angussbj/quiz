import type { VisualizationElement } from '../VisualizationElement';
import type { StarMap3DElement } from './StarMap3DElement';

/**
 * Build StarMap3DElement objects from CSV rows.
 *
 * CSV columns: id, rank, name, name_alternates, distance_ly, x, y, z,
 * spectral_class, spectral_type, luminosity, magnitude, star_count, wikipedia
 *
 * The x, y, z columns are in light-years from Sol. These map directly
 * to viewBoxCenter for the 3D renderer.
 */
export function buildStarMap3DElements(
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<VisualizationElement> {
  const answerCol = columnMappings['answer'] || 'name';
  const labelCol = columnMappings['label'] || 'name';
  const alternatesCol = columnMappings['alternates'] || 'name_alternates';
  const wikiCol = columnMappings['wikipedia'] || 'wikipedia';

  return rows.map((row): StarMap3DElement => {
    const x = parseFloat(row['x']) || 0;
    const y = parseFloat(row['y']) || 0;
    const z = parseFloat(row['z']) || 0;
    const distanceLy = parseFloat(row['distance_ly']) || 0;
    const luminosity = parseFloat(row['luminosity']) || 0;
    const magnitude = parseFloat(row['magnitude']) || 0;
    const starCount = parseInt(row['star_count']) || 1;

    const name = row[answerCol] || row[labelCol] || `Star ${row['rank']}`;
    const label = row[labelCol] || name;
    const alternates = row[alternatesCol] || '';
    const wikiSlug = row[wikiCol] || '';

    return {
      id: row['id'] || name,
      label,
      viewBoxCenter: { x, y, z },
      viewBoxBounds: {
        minX: x - 0.1,
        minY: y - 0.1,
        maxX: x + 0.1,
        maxY: y + 0.1,
      },
      interactive: true,
      group: row['spectral_class'] || 'Unknown',
      spectralClass: row['spectral_class'] || '',
      luminosity,
      magnitude,
      starCount,
      distanceLy,
      spectralType: row['spectral_type'] || '',
      wikipediaSlug: wikiSlug,
      promptSubtitle: alternates
        ? `(also: ${alternates.split('|').join(', ')})`
        : undefined,
    };
  });
}
