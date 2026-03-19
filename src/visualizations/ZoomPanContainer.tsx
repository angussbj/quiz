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
import type { ClusteringConfig, ElementCluster } from './VisualizationRendererProps';
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
  readonly initialViewBox?: ViewBox;
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

export function ZoomPanContainer({
  children,
  elements,
  elementStates,
  clustering,
  onClusterClick,
  initialViewBox,
}: ZoomPanContainerProps) {
  const viewBox = useMemo(
    () => initialViewBox ?? computeViewBox(elements),
    [elements, initialViewBox],
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

  return (
    <div ref={containerRef} className={styles.container}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={20}
        centerOnInit
        limitToBounds={false}
        smooth
        pinch={{ step: 3 }}
        wheel={{ smoothStep: 0.03 }}
      >
        <ZoomPanInner
          viewBox={viewBox}
          containerSize={containerSize}
          elements={elements}
          elementStates={elementStates}
          clustering={clustering}
          onClusterClick={onClusterClick}
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
}

function ZoomPanInner({
  children,
  viewBox,
  containerSize,
  elements,
  elementStates,
  clustering,
  onClusterClick,
}: ZoomPanInnerProps) {
  const { setTransform } = useControls();
  const scaleRef = useRef(1);
  const quantisedScaleRef = useRef(1);
  const [quantisedScale, setQuantisedScale] = useState(1);

  useTransformEffect(({ state }) => {
    scaleRef.current = state.scale;
    const q = quantise(state.scale, SCALE_QUANTUM);
    if (q !== quantisedScaleRef.current) {
      quantisedScaleRef.current = q;
      setQuantisedScale(q);
    }
  });

  const basePixelsPerViewBoxUnit =
    containerSize.width > 0
      ? Math.min(containerSize.width / viewBox.width, containerSize.height / viewBox.height)
      : 1;

  const screenPixelsPerViewBoxUnit = basePixelsPerViewBoxUnit * quantisedScale;

  const clusters = useMemo(() => {
    if (!clustering || quantisedScale >= clustering.disableAboveScale) return [];
    return computeClusters(elements, clustering.minScreenPixelDistance, screenPixelsPerViewBoxUnit);
  }, [elements, clustering, quantisedScale, screenPixelsPerViewBoxUnit]);

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

      const ZOOM_PADDING = 0.7;
      const targetScale = Math.min(
        20,
        ZOOM_PADDING *
          Math.min(
            containerSize.width / (bboxWidth * basePixelsPerViewBoxUnit),
            containerSize.height / (bboxHeight * basePixelsPerViewBoxUnit),
          ),
      );

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

  const contextValue = useMemo(
    () => ({
      scale: quantisedScale,
      clusteredElementIds,
    }),
    [quantisedScale, clusteredElementIds],
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
                scale={quantisedScale}
                basePixelsPerViewBoxUnit={basePixelsPerViewBoxUnit}
                onClick={handleClusterClick}
              />
            ))}
          </AnimatePresence>
        </svg>
      </TransformComponent>
    </ZoomPanContext.Provider>
  );
}
