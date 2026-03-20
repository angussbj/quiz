import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  useControls,
  useTransformEffect,
} from 'react-zoom-pan-pinch';
import { AnimatePresence } from 'framer-motion';
import type { VisualizationElement, ElementVisualState } from './VisualizationElement';
import type { ClusteringConfig, ElementCluster, BackgroundPath } from './VisualizationRendererProps';
import { ZoomPanContext } from './ZoomPanContext';
import { computeClusters } from './computeClusters';
import { computeViewBox } from './computeViewBox';
import type { ViewBox } from './computeViewBox';
import { ClusterBadge } from './ClusterBadge';
import styles from './ZoomPanContainer.module.css';

interface ZoomPanContainerProps {
  readonly children: ReactNode;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly elementStates?: Readonly<Record<string, ElementVisualState>>;
  readonly clustering?: ClusteringConfig;
  readonly onClusterClick?: (cluster: ElementCluster) => void;
  readonly initialCameraPosition?: ViewBox;
  /** Background paths used to expand the viewBox so panning reveals all content. */
  readonly backgroundPaths?: ReadonlyArray<BackgroundPath>;
  /** Element IDs to bring into view when this array reference changes. Zooms out if needed; never zooms in. */
  readonly putInView?: ReadonlyArray<string>;
}

interface ContainerSize {
  readonly width: number;
  readonly height: number;
}

function countMatchedInCluster(
  cluster: ElementCluster,
  elementStates: Readonly<Record<string, ElementVisualState>> | undefined,
  countedState: ElementVisualState | undefined,
): number {
  if (!elementStates || !countedState) return 0;
  let count = 0;
  for (const id of cluster.elementIds) {
    if (elementStates[id] === countedState) count++;
  }
  return count;
}

/** Quantise a number to reduce re-render frequency during smooth zoom. */
function quantise(value: number, step: number): number {
  return Math.round(value / step) * step;
}

const SCALE_QUANTUM = 0.1;

/** Max zoom when zooming into a cluster badge click. */
const MAX_CLUSTER_SCALE = 500;

/**
 * Compute the initial scale and position to frame a camera target within
 * the container, given the full SVG viewBox and container dimensions.
 */
function computeInitialTransform(
  target: ViewBox,
  viewBox: ViewBox,
  containerSize: ContainerSize,
): { scale: number; posX: number; posY: number } | undefined {
  if (containerSize.width === 0 || containerSize.height === 0) return undefined;

  const basePixelsPerViewBoxUnit = Math.min(
    containerSize.width / viewBox.width,
    containerSize.height / viewBox.height,
  );

  const cameraWidth = target.width;
  const cameraHeight = target.height;
  const cameraCenterX = target.x + target.width / 2;
  const cameraCenterY = target.y + target.height / 2;

  const scale = Math.min(
    containerSize.width / (cameraWidth * basePixelsPerViewBoxUnit),
    containerSize.height / (cameraHeight * basePixelsPerViewBoxUnit),
  );

  const svgPixelWidth = viewBox.width * basePixelsPerViewBoxUnit;
  const svgPixelHeight = viewBox.height * basePixelsPerViewBoxUnit;
  const offsetX = (containerSize.width - svgPixelWidth) / 2;
  const offsetY = (containerSize.height - svgPixelHeight) / 2;

  const contentX = offsetX + (cameraCenterX - viewBox.x) * basePixelsPerViewBoxUnit;
  const contentY = offsetY + (cameraCenterY - viewBox.y) * basePixelsPerViewBoxUnit;

  const posX = containerSize.width / 2 - contentX * scale;
  const posY = containerSize.height / 2 - contentY * scale;

  return { scale, posX, posY };
}

export function ZoomPanContainer({
  children,
  elements,
  elementStates,
  clustering,
  onClusterClick,
  initialCameraPosition,
  backgroundPaths,
  putInView,
}: ZoomPanContainerProps) {
  const viewBox = useMemo(
    () => computeViewBox(elements, backgroundPaths),
    [elements, backgroundPaths],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Determine the initial camera framing. If an explicit camera position
  // is provided, use it. Otherwise auto-compute from element positions
  // so the initial view frames the quiz elements (not the full world).
  const effectiveCameraPosition: ViewBox | undefined = useMemo(() => {
    if (initialCameraPosition) return initialCameraPosition;
    if (elements.length === 0) return undefined;
    return computeViewBox(elements);
  }, [initialCameraPosition, elements]);

  // Pre-compute initial scale so TransformWrapper starts at the right
  // zoom level (avoids a flash of wrong-sized badges on first frame).
  const initialCamera = useMemo(() => {
    if (!effectiveCameraPosition || containerSize.width === 0) return undefined;
    return computeInitialTransform(effectiveCameraPosition, viewBox, containerSize);
  }, [effectiveCameraPosition, viewBox, containerSize]);

  // Stable key: lock after first valid camera so container resizes
  // (e.g., switching to review mode) don't remount TransformWrapper.
  const stableKeyRef = useRef<string | undefined>(undefined);
  if (initialCamera && stableKeyRef.current === undefined) {
    stableKeyRef.current = `cam-${initialCamera.scale.toFixed(2)}`;
  }
  const wrapperKey = stableKeyRef.current ?? (initialCamera ? `cam-${initialCamera.scale.toFixed(2)}` : 'default');

  return (
    <div ref={containerRef} className={styles.container}>
      <TransformWrapper
        key={wrapperKey}
        initialScale={initialCamera?.scale ?? 1}
        initialPositionX={initialCamera?.posX}
        initialPositionY={initialCamera?.posY}
        minScale={0.5}
        maxScale={MAX_CLUSTER_SCALE}
        centerOnInit={!effectiveCameraPosition}
        limitToBounds={false}
        smooth
        pinch={{step: 8}}
        wheel={{ smoothStep: 0.06 }}
      >
        <ZoomPanInner
          viewBox={viewBox}

          containerSize={containerSize}
          elements={elements}
          elementStates={elementStates}
          clustering={clustering}
          onClusterClick={onClusterClick}
          initialCameraPosition={effectiveCameraPosition}
          initialScale={initialCamera?.scale ?? 1}
          putInView={putInView}
        >
          {children}
        </ZoomPanInner>
      </TransformWrapper>
    </div>
  );
}

interface ZoomPanInnerProps {
  readonly children: ReactNode;
  readonly viewBox: ViewBox;
  readonly containerSize: ContainerSize;
  readonly elements: ReadonlyArray<VisualizationElement>;
  readonly elementStates?: Readonly<Record<string, ElementVisualState>>;
  readonly clustering?: ClusteringConfig;
  readonly onClusterClick?: (cluster: ElementCluster) => void;
  readonly initialCameraPosition?: ViewBox;
  readonly initialScale: number;
  readonly putInView?: ReadonlyArray<string>;
}

function ZoomPanInner({
  children,
  viewBox,
  containerSize,
  elements,
  elementStates,
  clustering,
  onClusterClick,
  initialCameraPosition,
  initialScale,
  putInView,
}: ZoomPanInnerProps) {
  const { setTransform, centerView } = useControls();
  const scaleRef = useRef(initialScale);
  const quantisedScaleRef = useRef(quantise(initialScale, SCALE_QUANTUM));
  const [quantisedScale, setQuantisedScale] = useState(quantise(initialScale, SCALE_QUANTUM));

  // Track initial transform for reset and "away from home" detection
  const initialTransformRef = useRef<{ scale: number; posX: number; posY: number } | null>(null);
  const [currentTransform, setCurrentTransform] = useState({ posX: 0, posY: 0, scale: initialScale });

  // Record initial transform once container is sized
  useEffect(() => {
    if (initialTransformRef.current) return;
    if (containerSize.width === 0) return;
    if (initialCameraPosition) {
      const initial = computeInitialTransform(initialCameraPosition, viewBox, containerSize);
      if (initial) {
        initialTransformRef.current = initial;
        return;
      }
    }
    initialTransformRef.current = { scale: 1, posX: 0, posY: 0 };
  }, [initialCameraPosition, viewBox, containerSize]);

  const currentTransformRef = useRef(currentTransform);

  useTransformEffect(({ state }) => {
    scaleRef.current = state.scale;
    const prev = currentTransformRef.current;
    const posX = state.positionX;
    const posY = state.positionY;
    // Only update state when values actually change to avoid infinite re-render
    if (prev.posX !== posX || prev.posY !== posY || prev.scale !== state.scale) {
      const next = { posX, posY, scale: state.scale };
      currentTransformRef.current = next;
      setCurrentTransform(next);
    }
    const q = quantise(state.scale, SCALE_QUANTUM);
    if (q !== quantisedScaleRef.current) {
      quantisedScaleRef.current = q;
      setQuantisedScale(q);
    }
  });

  // Show reset when the camera bounds area is less than half the visible area.
  // We approximate this by comparing current scale to initial scale: if we've
  // zoomed in past 2x the initial scale, or panned far enough that the initial
  // center is offscreen, show the button.
  const showResetButton = useMemo(() => {
    const initial = initialTransformRef.current;
    if (!initial) return false;
    // Zoomed in past 2x initial
    if (currentTransform.scale > initial.scale * 2) return true;
    // Panned far: check if the shift exceeds half the container dimension
    if (containerSize.width === 0) return false;
    const dx = Math.abs(currentTransform.posX - initial.posX);
    const dy = Math.abs(currentTransform.posY - initial.posY);
    return dx > containerSize.width * 0.5 || dy > containerSize.height * 0.5
  }, [currentTransform, containerSize]);

  const handleReset = useCallback(() => {
    const initial = initialTransformRef.current;
    if (initial) {
      setTransform(initial.posX, initial.posY, initial.scale, 300, 'easeOut');
    } else {
      centerView(1, 300, 'easeOut');
    }
  }, [setTransform, centerView]);

  const basePixelsPerViewBoxUnit =
    containerSize.width > 0
      ? Math.min(containerSize.width / viewBox.width, containerSize.height / viewBox.height)
      : 1;

  // Debounce scale changes for cluster computation so smooth zoom animations
  // don't trigger expensive recalculations on every quantised step.
  // Throttle scale changes for cluster computation so smooth zoom animations
  // don't trigger expensive recalculations on every quantised step. Uses a
  // trailing-edge throttle: waits at least 50ms after the first change, then
  // updates every 50ms while zoom continues.
  const CLUSTER_THROTTLE_MS = 50;
  const [clusterScale, setClusterScale] = useState(quantisedScale);
  const lastClusterUpdateRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastClusterUpdateRef.current;
    const delay = Math.max(0, CLUSTER_THROTTLE_MS - elapsed);
    const timer = setTimeout(() => {
      lastClusterUpdateRef.current = Date.now();
      setClusterScale(quantisedScale);
    }, delay);
    return () => clearTimeout(timer);
  }, [quantisedScale]);

  const clusterScreenPixelsPerViewBoxUnit = basePixelsPerViewBoxUnit * clusterScale;

  const clusters = useMemo(() => {
    if (!clustering) return [];
    if (clustering.disableAboveScale !== undefined && clusterScale >= clustering.disableAboveScale) return [];
    return computeClusters(
      elements,
      clustering.minScreenPixelDistance,
      clusterScreenPixelsPerViewBoxUnit,
      clustering.clusterAbsorptionDistance,
      clustering.clusterMergeDistance,
    );
  }, [elements, clustering, clusterScale, clusterScreenPixelsPerViewBoxUnit]);

  const clusteredElementIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cluster of clusters) {
      for (const id of cluster.elementIds) {
        ids.add(id);
      }
    }
    return ids;
  }, [clusters]);

  const handleClusterClick = useCallback(
    (cluster: ElementCluster) => {
      onClusterClick?.(cluster);

      const clusterElements = elements.filter((e) =>
        cluster.elementIds.includes(e.id),
      );
      if (clusterElements.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const el of clusterElements) {
        minX = Math.min(minX, el.viewBoxBounds.minX);
        minY = Math.min(minY, el.viewBoxBounds.minY);
        maxX = Math.max(maxX, el.viewBoxBounds.maxX);
        maxY = Math.max(maxY, el.viewBoxBounds.maxY);
      }

      const bboxCenterX = (minX + maxX) / 2;
      const bboxCenterY = (minY + maxY) / 2;
      const bboxWidth = maxX - minX;
      const bboxHeight = maxY - minY;

      // Zoom to fit all cluster elements with padding.
      const ZOOM_PADDING = 0.7;
      const targetScale =
        bboxWidth > 0 || bboxHeight > 0
          ? Math.min(
              MAX_CLUSTER_SCALE,
              ZOOM_PADDING *
                Math.min(
                  containerSize.width / (bboxWidth * basePixelsPerViewBoxUnit),
                  containerSize.height / (bboxHeight * basePixelsPerViewBoxUnit),
                ),
            )
          : scaleRef.current * 2;

      // Convert viewBox center to content-space pixel offset, accounting
      // for the centering that preserveAspectRatio="xMidYMid meet" applies.
      const svgPixelWidth = viewBox.width * basePixelsPerViewBoxUnit;
      const svgPixelHeight = viewBox.height * basePixelsPerViewBoxUnit;
      const offsetX = (containerSize.width - svgPixelWidth) / 2;
      const offsetY = (containerSize.height - svgPixelHeight) / 2;

      const contentX = offsetX + (bboxCenterX - viewBox.x) * basePixelsPerViewBoxUnit;
      const contentY = offsetY + (bboxCenterY - viewBox.y) * basePixelsPerViewBoxUnit;

      const posX = containerSize.width / 2 - contentX * targetScale;
      const posY = containerSize.height / 2 - contentY * targetScale;

      setTransform(posX, posY, targetScale, 300, 'easeOut');
    },
    [elements, containerSize, viewBox, basePixelsPerViewBoxUnit, onClusterClick, setTransform],
  );

  // Bring specified elements into view when putInView changes.
  // Zooms out if needed to show them all; never zooms in. One-shot.
  const putInViewLatestRef = useRef({ elements, containerSize, viewBox, basePixelsPerViewBoxUnit, setTransform });
  putInViewLatestRef.current = { elements, containerSize, viewBox, basePixelsPerViewBoxUnit, setTransform };

  useEffect(() => {
    if (!putInView || putInView.length === 0) return;
    const { elements, containerSize, viewBox, basePixelsPerViewBoxUnit, setTransform } = putInViewLatestRef.current;

    const targetElements = elements.filter((e) => putInView.includes(e.id));
    if (targetElements.length === 0 || containerSize.width === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of targetElements) {
      minX = Math.min(minX, el.viewBoxBounds.minX);
      minY = Math.min(minY, el.viewBoxBounds.minY);
      maxX = Math.max(maxX, el.viewBoxBounds.maxX);
      maxY = Math.max(maxY, el.viewBoxBounds.maxY);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    const ZOOM_PADDING = 0.7;
    const targetScale = (bboxWidth > 0 || bboxHeight > 0)
      ? Math.min(
          MAX_CLUSTER_SCALE,
          ZOOM_PADDING * Math.min(
            containerSize.width / (bboxWidth * basePixelsPerViewBoxUnit),
            containerSize.height / (bboxHeight * basePixelsPerViewBoxUnit),
          ),
        )
      : scaleRef.current;

    // Never zoom in — cap at current scale
    const finalScale = Math.min(targetScale, scaleRef.current);

    const svgPixelWidth = viewBox.width * basePixelsPerViewBoxUnit;
    const svgPixelHeight = viewBox.height * basePixelsPerViewBoxUnit;
    const offsetX = (containerSize.width - svgPixelWidth) / 2;
    const offsetY = (containerSize.height - svgPixelHeight) / 2;
    const contentX = offsetX + (cx - viewBox.x) * basePixelsPerViewBoxUnit;
    const contentY = offsetY + (cy - viewBox.y) * basePixelsPerViewBoxUnit;

    setTransform(
      containerSize.width / 2 - contentX * finalScale,
      containerSize.height / 2 - contentY * finalScale,
      finalScale,
      400,
      'easeOut',
    );
  }, [putInView]); // reference equality — callers control when this fires

  const contextValue = useMemo(
    () => ({
      scale: quantisedScale,
      clusteredElementIds,
      basePixelsPerViewBoxUnit,
    }),
    [quantisedScale, clusteredElementIds, basePixelsPerViewBoxUnit],
  );

  const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  return (
    <ZoomPanContext.Provider value={contextValue}>
      <TransformComponent
        wrapperClass={styles.transformWrapper}
        contentClass={styles.transformContent}
      >
        <svg
          className={styles.svg}
          viewBox={viewBoxString}
          preserveAspectRatio="xMidYMid meet"
        >
          {children}
          <AnimatePresence>
            {clusters.map((cluster) => (
              <ClusterBadge
                key={cluster.elementIds.join(',')}
                cluster={cluster}
                matchedCount={countMatchedInCluster(cluster, elementStates, clustering?.countedState)}
                elementStates={elementStates}
                scale={quantisedScale}
                basePixelsPerViewBoxUnit={basePixelsPerViewBoxUnit}
                onClick={handleClusterClick}
              />
            ))}
          </AnimatePresence>
        </svg>
      </TransformComponent>
      {showResetButton && (
        <button className={styles.resetButton} onClick={handleReset}>
          Reset
        </button>
      )}
    </ZoomPanContext.Provider>
  );
}
