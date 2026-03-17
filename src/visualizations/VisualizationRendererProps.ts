import type { VisualizationElement, ViewBoxPosition, ElementVisualState } from './VisualizationElement';

export interface ElementCluster {
  readonly center: ViewBoxPosition;
  readonly elementIds: ReadonlyArray<string>;
  readonly count: number;
}

export interface ClusteringConfig {
  /** Min distance in screen pixels (computed on-the-fly from viewBox positions + zoom state) */
  readonly minScreenPixelDistance: number;
  /** Zoom scale above which clustering is disabled (show all individually) */
  readonly disableAboveScale: number;
}

/**
 * Props every visualization renderer receives.
 * THE contract between quiz modes and renderers.
 */
export interface VisualizationRendererProps {
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: (position: ViewBoxPosition) => void;
  readonly onClusterClick?: (cluster: ElementCluster) => void;
  readonly targetElementId?: string;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly clustering?: ClusteringConfig;
}

export type VisualizationType = 'map' | 'timeline' | 'grid';
