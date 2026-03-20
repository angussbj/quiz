import type { ReactNode } from 'react';
import type { VisualizationElement, ViewBoxPosition, ElementVisualState } from './VisualizationElement';
import type { BackgroundLabel } from './map/BackgroundLabel';

export interface ElementCluster {
  readonly center: ViewBoxPosition;
  readonly elementIds: ReadonlyArray<string>;
  readonly count: number;
}

export interface ClusteringConfig {
  /** Min distance in screen pixels (computed on-the-fly from viewBox positions + zoom state) */
  readonly minScreenPixelDistance: number;
  /** Zoom scale above which clustering is disabled. If omitted, clustering is never disabled by scale. */
  readonly disableAboveScale?: number;
  /** Element visual state to count in the cluster badge numerator (e.g. "correct" → "3/5") */
  readonly countedState: ElementVisualState;
}

/** Decorative SVG path rendered behind interactive elements (e.g., country borders on a map). */
export interface BackgroundPath {
  readonly id: string;
  readonly svgPathData: string;
  readonly group?: string;
  /** Display name for this path's entity (e.g., country name). */
  readonly name?: string;
  /** ISO alpha-2 country code (e.g., 'fr') for loading associated assets like flags. */
  readonly code?: string;
  /** Sovereign country name. Matches name for sovereign states; parent country for territories; blank for disputed. */
  readonly sovereign?: string;
  /** Region (e.g., 'Europe', 'Asia') for filtering. May be pipe-separated for multi-region. */
  readonly region?: string;
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
  readonly toggles: Readonly<Record<string, boolean>>;
  /** Per-element toggle overrides. Renderer checks elementToggles[elementId][toggleKey] ?? toggles[toggleKey]. */
  readonly elementToggles?: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
  readonly clustering?: ClusteringConfig;
  /** Non-interactive decorative paths rendered behind elements (e.g., country borders) */
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  /** Labels positioned at background shape centroids (e.g., country names) */
  readonly backgroundLabels?: ReadonlyArray<BackgroundLabel>;
  /** Additional SVG content rendered on top of all elements (e.g., feedback overlays) */
  readonly svgOverlay?: ReactNode;
  /** Override the initial camera position instead of computing from element bounds. */
  readonly initialCameraPosition?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export type VisualizationType = 'map' | 'timeline' | 'grid' | 'flag-grid';
