import type { ComponentType } from 'react';
import type { VisualizationRendererProps, VisualizationType } from './VisualizationRendererProps';
import { MapRenderer } from './map/MapRenderer';
import { PeriodicTableRenderer } from './periodic-table/PeriodicTableRenderer';
import { TimelineRenderer } from './timeline/TimelineRenderer';

const RENDERERS: Readonly<Record<VisualizationType, ComponentType<VisualizationRendererProps>>> = {
  map: MapRenderer,
  grid: PeriodicTableRenderer,
  timeline: TimelineRenderer,
};

export function resolveRenderer(
  visualizationType: VisualizationType,
): ComponentType<VisualizationRendererProps> {
  return RENDERERS[visualizationType];
}
