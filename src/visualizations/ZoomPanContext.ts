import { createContext, useContext } from 'react';

export interface ZoomPanState {
  /** Current zoom scale (1 = initial fit-all view) */
  readonly scale: number;
  /** IDs of elements currently hidden inside a cluster */
  readonly clusteredElementIds: ReadonlySet<string>;
}

const ZoomPanContext = createContext<ZoomPanState>({
  scale: 1,
  clusteredElementIds: new Set(),
});

export function useZoomPan(): ZoomPanState {
  return useContext(ZoomPanContext);
}

export { ZoomPanContext };
