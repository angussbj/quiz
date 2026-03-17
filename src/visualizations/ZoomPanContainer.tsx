import type { ReactNode } from 'react';

interface ZoomPanContainerProps {
  readonly children: ReactNode;
}

/** Shared zoom/pan wrapper around react-zoom-pan-pinch. Placeholder. */
export function ZoomPanContainer({ children }: ZoomPanContainerProps) {
  return <div>{children}</div>;
}
