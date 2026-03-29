import type { VisualizationType } from './VisualizationRendererProps';
import type { VisualizationElement } from './VisualizationElement';
import { buildMapElements } from './map/buildMapElements';
import { buildGridElements } from './periodic-table/buildGridElements';
import { buildTimelineElementsFromRows } from './timeline/buildTimelineElementsFromRows';
import { buildFlagGridElements } from './flag-grid/buildFlagGridElements';
import { buildAnatomyElements } from './anatomy/buildAnatomyElements';
import { buildAnatomy3DElements } from './anatomy-3d/buildAnatomy3DElements';
import { buildStarMap3DElements } from './star-map-3d/buildStarMap3DElements';
import type { TimeScale } from './timeline/buildTimelineElements';

export function buildElements(
  visualizationType: VisualizationType,
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
  timeScale?: TimeScale,
): ReadonlyArray<VisualizationElement> {
  switch (visualizationType) {
    case 'map':
      return buildMapElements(rows, columnMappings);
    case 'grid':
      return buildGridElements(rows, columnMappings);
    case 'timeline':
      return buildTimelineElementsFromRows(rows, columnMappings, timeScale);
    case 'flag-grid':
      return buildFlagGridElements(rows, columnMappings);
    case 'anatomy':
      return buildAnatomyElements(rows, columnMappings);
    case 'anatomy-3d':
      return buildAnatomy3DElements(rows, columnMappings);
    case 'star-map-3d':
      return buildStarMap3DElements(rows, columnMappings);
  }
}
