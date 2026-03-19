import { createContext, useContext } from 'react';

export interface ZoomPanState {
  /** Current zoom scale (1 = initial fit-all view) */
  readonly scale: number;
  /** IDs of elements currently hidden inside a cluster */
  readonly clusteredElementIds: ReadonlySet<string>;
  /** Pixels per viewBox unit at scale=1, for converting screen sizes to viewBox units */
  readonly basePixelsPerViewBoxUnit: number;
}

const ZoomPanContext = createContext<ZoomPanState>({
  scale: 1,
  clusteredElementIds: new Set(),
  basePixelsPerViewBoxUnit: 1,
});

export function useZoomPan(): ZoomPanState {
  return useContext(ZoomPanContext);
}

export { ZoomPanContext };
