import { createContext, useContext } from 'react';
import type { ElementCluster } from './VisualizationRendererProps';

export interface ZoomPanState {
  /** Current zoom scale (1 = initial fit-all view) */
  readonly scale: number;
  /** IDs of elements currently hidden inside a cluster */
  readonly clusteredElementIds: ReadonlySet<string>;
  /** Current clusters (elements grouped by proximity at current zoom level) */
  readonly clusters: ReadonlyArray<ElementCluster>;
  /** Pixels per viewBox unit at scale=1, for converting screen sizes to viewBox units */
  readonly basePixelsPerViewBoxUnit: number;
  /** The SVG viewBox string, for creating additional SVGs with matching coordinates. */
  readonly viewBoxString: string;
}

const ZoomPanContext = createContext<ZoomPanState>({
  scale: 1,
  clusteredElementIds: new Set(),
  clusters: [],
  basePixelsPerViewBoxUnit: 1,
  viewBoxString: '0 0 1 1',
});

export function useZoomPan(): ZoomPanState {
  return useContext(ZoomPanContext);
}

export { ZoomPanContext };
