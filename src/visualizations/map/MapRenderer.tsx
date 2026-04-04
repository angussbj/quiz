import { memo, useCallback, useMemo } from 'react';
import { assetPath } from '../../utilities/assetPath';
import type { VisualizationRendererProps, ClusteringConfig } from '../VisualizationRendererProps';
import type { ElementVisualState, ViewBoxPosition, VisualizationElement } from '../VisualizationElement';
import { STATUS_COLORS } from '../elementStateColors';
import { ZoomPanContainer } from '../ZoomPanContainer';
import { RevealPulseOverlay } from '../RevealPulse';
import { useZoomPan } from '../ZoomPanContext';
import { elementToggle } from '../elementToggle';
import { isMapElement } from './MapElement';
import type { BackgroundLabel } from './BackgroundLabel';
import { MapCountryLabels } from './MapCountryLabels';
import { computeElementLabels } from './computeElementLabels';
import { shouldShowLabel } from '../shouldShowLabel';
import { MapElementShapes } from './MapElementOverlays';
import { useDragDetector } from './useDragDetector';
import styles from './MapRenderer.module.css';

/** Default clustering for map quizzes: cluster overlapping city dots. */
const DEFAULT_MAP_CLUSTERING: ClusteringConfig = {
  minScreenPixelDistance: 10,
  clusterAbsorptionDistance: 25,
  clusterMergeDistance: 40,
  countedState: 'correct',
};

/** City dot radius in screen pixels. Converted to viewBox units at render time. */
const DOT_SCREEN_RADIUS = 5;
export function MapRenderer({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  clustering,
  onClusterClick,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  svgOverlay,
  initialCameraPosition,
  putInView,
  elementStateColorOverrides,
  autoRevealElementIds,
}: VisualizationRendererProps) {
  const uniqueGroups = useMemo(
    () => Array.from(new Set(elements.map((e) => e.group).filter((g): g is string => g !== undefined))),
    [elements],
  );
  const showBorders = toggles['showBorders'] !== false;
  // Disable default clustering for stroke-style elements since clustering
  // by centroid doesn't make sense for line features spread across the map.
  const hasStrokeElements = elements.some((e) => isMapElement(e) && e.pathRenderStyle === 'stroke');
  const effectiveClustering = clustering ?? (hasStrokeElements ? undefined : DEFAULT_MAP_CLUSTERING);

  const showRegionColors = toggles['showRegionColors'] === true;

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={elementStates}
      clustering={effectiveClustering}
      onClusterClick={onClusterClick}
      initialCameraPosition={initialCameraPosition}
      backgroundPaths={backgroundPaths}
      putInView={putInView}
    >
      <MapContent
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onPositionClick={onPositionClick}
        onElementHoverStart={onElementHoverStart}
        onElementHoverEnd={onElementHoverEnd}
        showBorders={showBorders}
        toggles={toggles}
        elementToggles={elementToggles}
        backgroundPaths={backgroundPaths}
        lakePaths={lakePaths}
        backgroundLabels={backgroundLabels}
        uniqueGroups={uniqueGroups}
        showRegionColors={showRegionColors}
        elementStateColorOverrides={elementStateColorOverrides}
      />
      {svgOverlay}
      <RevealPulseOverlay elements={elements} elementStates={elementStates} autoRevealElementIds={autoRevealElementIds} />
    </ZoomPanContainer>
  );
}

type LabelPosition = NonNullable<VisualizationElement['labelPosition']>;

/** Compute SVG text positioning props for a label at a given position relative to an anchor point. */
function computeLabelProps(
  anchor: ViewBoxPosition,
  position: LabelPosition | undefined,
  offset: number,
): { x: number; y: number; textAnchor: 'start' | 'middle' | 'end'; dominantBaseline: 'central' | 'auto' | 'hanging' } {
  const pos = position ?? 'right';
  const isLeft = pos === 'left' || pos === 'above-left' || pos === 'below-left';
  const isRight = pos === 'right' || pos === 'above-right' || pos === 'below-right';
  const isAbove = pos === 'above' || pos === 'above-left' || pos === 'above-right';
  const isBelow = pos === 'below' || pos === 'below-left' || pos === 'below-right';

  const x = anchor.x + (isRight ? offset : isLeft ? -offset : 0);
  const y = anchor.y + (isBelow ? offset : isAbove ? -offset : 0);

  const textAnchor = isLeft ? 'end' as const
    : isRight ? 'start' as const
    : 'middle' as const;

  const dominantBaseline = isAbove ? 'auto' as const
    : isBelow ? 'hanging' as const
    : 'central' as const;

  return { x, y, textAnchor, dominantBaseline };
}

interface MapContentProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: VisualizationRendererProps['elementStates'];
  readonly onElementClick?: (elementId: string) => void;
  readonly onPositionClick?: VisualizationRendererProps['onPositionClick'];
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly showBorders: boolean;
  readonly toggles: Readonly<Record<string, boolean>>;
  readonly elementToggles: VisualizationRendererProps['elementToggles'];
  readonly backgroundPaths: VisualizationRendererProps['backgroundPaths'];
  readonly lakePaths: VisualizationRendererProps['lakePaths'];
  readonly backgroundLabels: VisualizationRendererProps['backgroundLabels'];
  readonly uniqueGroups: ReadonlyArray<string>;
  readonly showRegionColors: boolean;
  readonly elementStateColorOverrides: VisualizationRendererProps['elementStateColorOverrides'];
}

const MapContent = memo(function MapContent({
  elements,
  elementStates,
  onElementClick,
  onPositionClick,
  onElementHoverStart,
  onElementHoverEnd,
  showBorders,
  toggles,
  elementToggles,
  backgroundPaths,
  lakePaths,
  backgroundLabels,
  uniqueGroups,
  showRegionColors,
  elementStateColorOverrides,
}: MapContentProps) {
  const { clusteredElementIds, scale, basePixelsPerViewBoxUnit } = useZoomPan();
  const { onPointerDown, isDrag } = useDragDetector();

  const dotRadius = DOT_SCREEN_RADIUS / (scale * basePixelsPerViewBoxUnit);

  // Map from element label → element state, used by MapCountryLabels for state-aware colours.
  const elementNameToState = useMemo(() => {
    const map: Record<string, ElementVisualState | undefined> = {};
    for (const el of elements) {
      if (isMapElement(el) && el.svgPathData && el.pathRenderStyle !== 'stroke') {
        map[el.label] = elementStates[el.id];
      }
    }
    return map;
  }, [elements, elementStates]);

  // Map from element label → element id, used by MapCountryLabels for hover.
  const nameToElementId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const el of elements) {
      if (isMapElement(el) && el.svgPathData && el.pathRenderStyle !== 'stroke') {
        map[el.label] = el.id;
      }
    }
    return map;
  }, [elements]);

  // Build BackgroundLabel objects from polygon quiz elements so they pass through the
  // full label placement system (polylabel positioning, area-based sizing, collision detection).
  const elementPolygonLabels = useMemo(
    () => computeElementLabels(elements),
    [elements],
  );

  // Merge background labels (excluding polygon element names to avoid duplicates) with
  // element-derived labels for a single unified placement pass.
  const allLabels = useMemo((): ReadonlyArray<BackgroundLabel> => {
    const polygonElementNames = new Set(elementPolygonLabels.map((l) => l.name));
    const filteredBg = (backgroundLabels ?? []).filter((l) => !polygonElementNames.has(l.name));
    return [...filteredBg, ...elementPolygonLabels];
  }, [backgroundLabels, elementPolygonLabels]);

  const hasShowCityDotsToggle = 'showCityDots' in toggles;
  const visibleDotPositions = useMemo(
    () => {
      // Only compute avoid points when the quiz defines a showCityDots toggle.
      // Without this check, elementToggle defaults to true for undefined toggles,
      // causing all element centers to become avoid points even for fill-style
      // polygon quizzes (like subdivisions) that don't render dots at all.
      if (!hasShowCityDotsToggle) return [];
      return elements
        .filter((el) => {
          if (!elementToggle(elementToggles, toggles, el.id, 'showCityDots')) return false;
          const state = elementStates[el.id];
          return state !== 'hidden';
        })
        .map((el) => el.viewBoxCenter);
    },
    [elements, elementToggles, toggles, elementStates, hasShowCityDotsToggle],
  );

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (!onPositionClick) return;
      if (isDrag(event)) return;
      const svg = (event.currentTarget as SVGElement).ownerSVGElement;
      if (!svg) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const svgPoint = point.matrixTransform(ctm.inverse());
      onPositionClick({ x: svgPoint.x, y: svgPoint.y });
    },
    [onPositionClick, isDrag],
  );

  return (
    <g onPointerDown={onPointerDown} onClick={handleBackgroundClick}>
      {/* Invisible rect to catch clicks on empty SVG space.
          Without this, clicks on areas with no visible children
          don't trigger the <g>'s onClick handler. */}
      {onPositionClick && (
        <rect
          x={-1e4} y={-1e4} width={2e4} height={2e4}
          fill="transparent"
        />
      )}

      {/* Ocean background tint (clamped to ±90° latitude) */}
      {toggles['showLakes'] !== false && (
        <rect
          x={-1e4} y={-90} width={2e4} height={180}
          className={styles.oceanBackground}
        />
      )}

      {/* Background country borders */}
      {showBorders && backgroundPaths?.map((path) => (
        <path
          key={path.id}
          d={path.svgPathData}
          fillRule="evenodd"
          className={styles.borderPath}
        />
      ))}

      {/* Lake polygons */}
      {toggles['showLakes'] !== false && lakePaths?.map((lake) => (
        <path
          key={lake.id}
          d={lake.svgPathData}
          className={styles.lakePath}
        />
      ))}

      {/* Quiz element shapes (countries, rivers) — sorted by state so highlighted
          elements paint on top of correct, correct on top of default, etc. */}
      <MapElementShapes
        elements={elements}
        elementStates={elementStates}
        uniqueGroups={uniqueGroups}
        onElementClick={onElementClick}
        onElementHoverStart={onElementHoverStart}
        onElementHoverEnd={onElementHoverEnd}
        showRegionColors={showRegionColors}
        elementStateColorOverrides={elementStateColorOverrides}
        isDrag={isDrag}
        clusteredElementIds={clusteredElementIds}
      />

      {/* Country/region name labels and flags — background context labels merged with polygon
          quiz element labels, run through unified placement (polylabel, collision detection). */}
      {allLabels.length > 0 && (
        <MapCountryLabels
          labels={allLabels}
          showNames={toggles['showCountryNames'] ?? false}
          showFlags={toggles['showMapFlags'] ?? false}
          avoidPoints={visibleDotPositions}
          elementNameToState={elementNameToState}
          nameToElementId={nameToElementId}
          onElementHoverStart={onElementHoverStart}
          onElementHoverEnd={onElementHoverEnd}
        />
      )}

      {/* River name labels (for stroke-style path elements like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!isMapElement(element) || element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (!shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showRiverNames'))) return null;
        const color = (state !== undefined && state !== 'hidden')
          ? (elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main)
          : 'var(--color-text-primary)';
        const anchor = element.labelAnchor ?? element.viewBoxCenter;
        const pos = element.labelPosition;
        const labelOffset = 0.8; // viewBox units
        const labelProps = computeLabelProps(anchor, pos, labelOffset);
        return (
          <text
            key={`river-label-${element.id}`}
            {...labelProps}
            className={onElementHoverStart ? styles.riverLabelHoverable : styles.riverLabel}
            style={{
              fill: color,
              strokeOpacity: 0.75,
              paintOrder: 'stroke',
              stroke: 'var(--color-label-halo)',
              strokeWidth: 0.5,
              strokeLinejoin: 'round',
            }}
            onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverEnd}
          >
            {element.label}
          </text>
        );
      })}

      {/* Flag images near city dots (capitals quizzes — not for stroke-style paths like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
        if (!isMapElement(element) || !element.code) return null;
        if (element.pathRenderStyle === 'stroke') return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const flagHeight = dotRadius * 4;
        const flagWidth = flagHeight * 4 / 3;
        return (
          <image
            key={`flag-${element.id}`}
            href={assetPath(`/flags/${element.code}.svg`)}
            x={element.viewBoxCenter.x + dotRadius + 0.15}
            y={element.viewBoxCenter.y - flagHeight / 2}
            width={flagWidth}
            height={flagHeight}
            className={styles.flagImage}
          />
        );
      })}

      {/* City dot markers (rendered last = on top of flags — not for stroke-style paths like rivers or large fill polygons) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        // Skip dots for fill-style polygon elements unless the polygon is tiny
        if (isMapElement(element) && element.svgPathData && element.pathRenderStyle !== 'stroke') {
          const { minX, minY, maxX, maxY } = element.viewBoxBounds;
          const dx = maxX - minX;
          const dy = maxY - minY;
          if (dx > 1.5 || dy > 1.5) return null;
        }
        if (!elementToggle(elementToggles, toggles, element.id, 'showCityDots')) return null;
        const state = elementStates[element.id];
        if (state === 'hidden') return null;
        const color = state !== undefined ? STATUS_COLORS[state].main : 'var(--color-city-dot)';
        return (
          <circle
            key={`dot-${element.id}`}
            cx={element.viewBoxCenter.x}
            cy={element.viewBoxCenter.y}
            r={dotRadius}
            fill={color}
            stroke={'var(--color-bg-primary)'}
            strokeWidth={dotRadius * 0.27}
            className={onElementClick ? styles.interactiveDot : onElementHoverStart ? styles.hoverableDot : undefined}
            onClick={
              onElementClick
                ? (e) => {
                    if (isDrag(e)) return;
                    e.stopPropagation();
                    onElementClick(element.id);
                  }
                : undefined
            }
            onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverEnd}
          />
        );
      })}

      {/* City name labels (rendered on top of dots — not for stroke-style paths like rivers or fill shapes like countries) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (isMapElement(element) && element.pathRenderStyle === 'stroke') return null;
        // Shape elements (countries/states) use the "Region polygon labels" section above
        if (isMapElement(element) && element.svgPathData && element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        if (!shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showCityNames'))) return null;
        const offset = dotRadius * 1.5;
        const fontSize = dotRadius * 2;
        const labelProps = computeLabelProps(element.viewBoxCenter, element.labelPosition, offset);
        return (
          <text
            key={`city-label-${element.id}`}
            {...labelProps}
            className={onElementHoverStart ? styles.cityLabelHoverable : styles.cityLabel}
            style={{ fontSize: `${fontSize}px` }}
            onMouseEnter={onElementHoverStart ? () => onElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverEnd}
          >
            {element.label}
          </text>
        );
      })}
    </g>
  );
});
