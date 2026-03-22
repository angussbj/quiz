import type { ComponentType } from 'react';
import type { VisualizationRendererProps, VisualizationType } from './VisualizationRendererProps';
import { MapRenderer } from './map/MapRenderer';
import { PeriodicTableRenderer } from './periodic-table/PeriodicTableRenderer';
import { TimelineRenderer } from './timeline/TimelineRenderer';
import { FlagGridRenderer } from './flag-grid/FlagGridRenderer';
import { AnatomyRenderer } from './anatomy/AnatomyRenderer';
import { Anatomy3DRenderer } from './anatomy-3d/Anatomy3DRenderer';

const RENDERERS: Readonly<Record<VisualizationType, ComponentType<VisualizationRendererProps>>> = {
  map: MapRenderer,
  grid: PeriodicTableRenderer,
  timeline: TimelineRenderer,
  'flag-grid': FlagGridRenderer,
  anatomy: AnatomyRenderer,
  'anatomy-3d': Anatomy3DRenderer,
};

export function resolveRenderer(
  visualizationType: VisualizationType,
): ComponentType<VisualizationRendererProps> {
  return RENDERERS[visualizationType];
}
