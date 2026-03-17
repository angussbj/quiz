import type { ReactNode } from 'react';
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
  /** Element visual state to count in the cluster badge numerator (e.g. "correct" → "3/5") */
  readonly countedState: ElementVisualState;
}

/** Decorative SVG path rendered behind interactive elements (e.g., country borders on a map). */
export interface BackgroundPath {
  readonly id: string;
  readonly svgPathData: string;
  readonly group?: string;
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
  /** Non-interactive decorative paths rendered behind elements (e.g., country borders) */
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  /** Additional SVG content rendered on top of all elements (e.g., feedback overlays) */
  readonly svgOverlay?: ReactNode;
}

export type VisualizationType = 'map' | 'timeline' | 'grid';
