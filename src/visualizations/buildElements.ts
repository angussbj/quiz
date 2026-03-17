import type { VisualizationType } from './VisualizationRendererProps';
import type { VisualizationElement } from './VisualizationElement';
import { buildMapElements } from './map/buildMapElements';
import { buildGridElements } from './periodic-table/buildGridElements';
import { buildTimelineElementsFromRows } from './timeline/buildTimelineElementsFromRows';

export function buildElements(
  visualizationType: VisualizationType,
  rows: ReadonlyArray<Readonly<Record<string, string>>>,
  columnMappings: Readonly<Record<string, string>>,
): ReadonlyArray<VisualizationElement> {
  switch (visualizationType) {
    case 'map':
      return buildMapElements(rows, columnMappings);
    case 'grid':
      return buildGridElements(rows, columnMappings);
    case 'timeline':
      return buildTimelineElementsFromRows(rows, columnMappings);
  }
}
