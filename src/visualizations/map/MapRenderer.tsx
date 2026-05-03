import { memo, useCallback, useMemo, useRef, useState } from 'react';
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
import { MapHoverOverlay } from './MapHoverOverlay';
import { useDragDetector } from './useDragDetector';
import { useStrokePathCache } from './useStrokePathCache';
import { findClosestStrokeElement } from './findClosestStrokeElement';
import { formatDataValue } from '../formatDataValue';
import { computeElementColors } from '../elementColorScale';
import type { ElementColorMap } from '../elementColorScale';
import { useTheme } from '@/theme/ThemeProvider';
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

/** Select toggle keys that are not data display columns. */
const NON_DATA_DISPLAY_KEYS = new Set([
  'orderBy', 'sortOrder', 'missingValues', 'rangeSortColumn',
  'countryColors', 'riverColors', 'elementColors', // color toggles
  'showPromptFlags', // prompt display toggles
]);

/**
 * Build a state map where elements whose city dot would not render are treated
 * as 'hidden' for clustering. Polygon/stroke elements are untouched because
 * their visibility is not gated by showCityDots. Keeping this derived map
 * separate from the renderer's elementStates means dot-suppression doesn't
 * suppress labels on answered states (shouldShowLabel would otherwise drop
 * labels on 'hidden').
 */
function buildClusterElementStates(
  elements: VisualizationRendererProps['elements'],
  elementStates: VisualizationRendererProps['elementStates'],
  toggles: Readonly<Record<string, boolean>>,
  elementToggles: VisualizationRendererProps['elementToggles'],
): Readonly<Record<string, ElementVisualState>> {
  // No showCityDots toggle → no change to states. Polygon/stroke quizzes don't
  // have this toggle, so we preserve their states as-is.
  if (!('showCityDots' in toggles)) return elementStates;
  const derived: Record<string, ElementVisualState> = { ...elementStates };
  for (const el of elements) {
    // Polygon/stroke elements render via svgPathData, not city dots — leave them alone.
    if (isMapElement(el) && el.svgPathData) continue;
    if (derived[el.id] === 'hidden') continue;
    if (!elementToggle(elementToggles, toggles, el.id, 'showCityDots')) {
      derived[el.id] = 'hidden';
    }
  }
  return derived;
}
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
  selectValues,
  selectValueLabels,
  selectValueMissingLabels,
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

  // Cities with dots toggled off should not contribute to cluster badges.
  // We mark them as 'hidden' only in the state map we hand to ZoomPanContainer,
  // keeping the renderer's elementStates unchanged so label/flag logic behaves
  // normally for answered states.
  const clusterElementStates = useMemo(
    () => buildClusterElementStates(elements, elementStates, toggles, elementToggles),
    [elements, elementStates, toggles, elementToggles],
  );

  // Legacy boolean toggle (used by capitals and other quizzes that don't have the dropdown)
  const showRegionColors = toggles['showRegionColors'] === true;

  return (
    <ZoomPanContainer
      elements={elements}
      elementStates={clusterElementStates}
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
        selectValues={selectValues}
        selectValueLabels={selectValueLabels}
        selectValueMissingLabels={selectValueMissingLabels}
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
  readonly selectValues?: Readonly<Record<string, string>>;
  readonly selectValueLabels?: Readonly<Record<string, string>>;
  readonly selectValueMissingLabels?: Readonly<Record<string, string>>;
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
  selectValues,
  selectValueLabels,
  selectValueMissingLabels,
}: MapContentProps) {
  const { clusteredElementIds, scale, basePixelsPerViewBoxUnit } = useZoomPan();
  const { resolved: theme } = useTheme();
  const darkMode = theme === 'dark';
  const { onPointerDown, isDrag } = useDragDetector();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Only show the hover overlay for clickable elements (identify mode etc.),
  // not for hover-only elements (Wikipedia preview in free recall mode).
  const handleElementHoverStart = useCallback((elementId: string) => {
    if (onElementClick) setHoveredElementId(elementId);
    onElementHoverStart?.(elementId);
  }, [onElementHoverStart, onElementClick]);

  const handleElementHoverEnd = useCallback(() => {
    setHoveredElementId(null);
    onElementHoverEnd?.();
  }, [onElementHoverEnd]);

  // ── Closest-path detection for stroke elements (rivers) ──────────────
  const strokePathCache = useStrokePathCache(elements);

  // Candidate set: stroke elements that are interactive and not hidden/clustered
  const strokeCandidateIds = useMemo(() => {
    if (!onElementClick && !onElementHoverStart) return new Set<string>();
    const ids = new Set<string>();
    for (const el of elements) {
      if (!isMapElement(el) || el.pathRenderStyle !== 'stroke') continue;
      if (clusteredElementIds.has(el.id)) continue;
      const state = elementStates[el.id];
      if (state === 'hidden') continue;
      ids.add(el.id);
    }
    return ids;
  }, [elements, elementStates, clusteredElementIds, onElementClick, onElementHoverStart]);

  // Max detection distance: 20 screen pixels converted to viewBox units (squared)
  const STROKE_HIT_THRESHOLD_PX = 20;
  const pixelsPerViewBoxUnit = scale * basePixelsPerViewBoxUnit;
  const maxDistanceVB = pixelsPerViewBoxUnit > 0 ? STROKE_HIT_THRESHOLD_PX / pixelsPerViewBoxUnit : 2;
  const maxDistanceSq = maxDistanceVB * maxDistanceVB;

  /** Convert a mouse event to viewBox coordinates using the SVG CTM. */
  const toViewBox = useCallback((event: React.MouseEvent): ViewBoxPosition | undefined => {
    const svg = (event.currentTarget as SVGElement).ownerSVGElement ?? (event.currentTarget as unknown as SVGSVGElement);
    if (!svg.createSVGPoint) return undefined;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return undefined;
    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }, []);

  // Track which stroke element is currently hovered via closest-path detection
  const strokeHoveredRef = useRef<string | null>(null);

  const handleStrokeMouseMove = useCallback((event: React.MouseEvent<SVGGElement>) => {
    if (strokeCandidateIds.size === 0) return;
    const vbPoint = toViewBox(event);
    if (!vbPoint) return;

    const closestId = findClosestStrokeElement(vbPoint, strokePathCache, strokeCandidateIds, maxDistanceSq);
    const prevId = strokeHoveredRef.current;

    if (closestId === prevId) return; // no change

    // End hover on previous element
    if (prevId !== null) {
      strokeHoveredRef.current = null;
      handleElementHoverEnd();
    }

    // Start hover on new element
    if (closestId !== undefined) {
      strokeHoveredRef.current = closestId;
      handleElementHoverStart(closestId);
    }
  }, [strokeCandidateIds, strokePathCache, maxDistanceSq, toViewBox, handleElementHoverStart, handleElementHoverEnd]);


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

  // Sort city elements so highlighted render on top of interactive, which render on
  // top of non-interactive. SVG paint order = z-order, so last painted = on top.
  const sortedCityElements = useMemo(() => {
    const cityElements = elements.filter((el) => {
      if (isMapElement(el) && el.pathRenderStyle === 'stroke') return false;
      return true;
    });
    return cityElements.toSorted((a, b) => {
      const stateA = elementStates[a.id];
      const stateB = elementStates[b.id];
      const priorityA = stateA === 'highlighted' ? 2 : a.interactive ? 1 : 0;
      const priorityB = stateB === 'highlighted' ? 2 : b.interactive ? 1 : 0;
      return priorityA - priorityB;
    });
  }, [elements, elementStates]);

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

  // ── Data display: find active data column and build element→value map ──
  const activeDataColumnName = useMemo(() => {
    if (!selectValues || !selectValueLabels) return undefined;
    for (const [key, value] of Object.entries(selectValues)) {
      if (NON_DATA_DISPLAY_KEYS.has(key)) continue;
      if (value && value !== 'none' && selectValueLabels[value]) return value;
    }
    return undefined;
  }, [selectValues, selectValueLabels]);
  const activeDataColumnLabel = activeDataColumnName ? selectValueLabels?.[activeDataColumnName] : undefined;
  const activeDataMissingLabel = activeDataColumnName ? selectValueMissingLabels?.[activeDataColumnName] : undefined;

  // Build maps of element id → formatted data value and element name → formatted data value
  const { elementDataValues, elementNameDataValues } = useMemo(() => {
    if (!activeDataColumnName || !activeDataColumnLabel) {
      return { elementDataValues: undefined, elementNameDataValues: undefined };
    }
    const idMap: Record<string, string> = {};
    const nameMap: Record<string, string> = {};
    for (const el of elements) {
      const raw = el.dataColumns?.[activeDataColumnName];
      const formatted = formatDataValue(raw, activeDataColumnLabel, activeDataMissingLabel);
      if (formatted !== '—') {
        idMap[el.id] = formatted;
        nameMap[el.label] = formatted;
      }
    }
    const hasValues = Object.keys(idMap).length > 0;
    return {
      elementDataValues: hasValues ? idMap : undefined,
      elementNameDataValues: hasValues ? nameMap : undefined,
    };
  }, [elements, activeDataColumnName, activeDataColumnLabel, activeDataMissingLabel]);

  // ── Element color map: color-by-data for fill-style elements ──
  // Look for color toggle keys (countryColors, riverColors, elementColors) in selectValues.
  const colorColumnName = useMemo(() => {
    if (!selectValues) return undefined;
    for (const key of ['countryColors', 'riverColors', 'elementColors']) {
      const value = selectValues[key];
      if (value && value !== 'none') return value;
    }
    return undefined;
  }, [selectValues]);

  const elementColorMap: ElementColorMap | undefined = useMemo(() => {
    if (!colorColumnName) return undefined;
    return computeElementColors(elements, colorColumnName, darkMode);
  }, [elements, colorColumnName, darkMode]);

  const handleBackgroundClick = useCallback(
    (event: React.MouseEvent<SVGGElement>) => {
      if (isDrag(event)) return;

      // Check for stroke element click first (rivers)
      if (onElementClick && strokeCandidateIds.size > 0) {
        const vbPoint = toViewBox(event);
        if (vbPoint) {
          const closestId = findClosestStrokeElement(vbPoint, strokePathCache, strokeCandidateIds, maxDistanceSq);
          if (closestId !== undefined) {
            event.stopPropagation();
            onElementClick(closestId);
            return;
          }
        }
      }

      if (!onPositionClick) return;
      const vbPoint = toViewBox(event);
      if (vbPoint) {
        onPositionClick(vbPoint);
      }
    },
    [onPositionClick, onElementClick, isDrag, strokeCandidateIds, strokePathCache, maxDistanceSq, toViewBox],
  );

  return (
    <g onPointerDown={onPointerDown} onClick={handleBackgroundClick} onMouseMove={handleStrokeMouseMove}>
      {/* Invisible rect to catch clicks and mousemove on empty SVG space.
          Without this, events on areas with no visible children
          don't trigger the <g>'s handlers. Also needed for stroke
          closest-path detection (mousemove + click). */}
      {(onPositionClick || strokeCandidateIds.size > 0) && (
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
        onElementHoverStart={onElementHoverStart ? handleElementHoverStart : undefined}
        onElementHoverEnd={onElementHoverStart ? handleElementHoverEnd : undefined}
        showRegionColors={showRegionColors}
        elementColorMap={elementColorMap}
        elementStateColorOverrides={elementStateColorOverrides}
        isDrag={isDrag}
        clusteredElementIds={clusteredElementIds}
      />

      {/* Semi-transparent overlay on the hovered element — avoids modifying
          original element styles which would trigger SVG-wide repaint. */}
      <MapHoverOverlay elements={elements} hoveredElementId={hoveredElementId} />

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
          onElementHoverStart={onElementHoverStart ? handleElementHoverStart : undefined}
          onElementHoverEnd={onElementHoverStart ? handleElementHoverEnd : undefined}
          dataValues={elementNameDataValues}
        />
      )}

      {/* River name labels and data values (for stroke-style path elements like rivers) */}
      {elements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!isMapElement(element) || element.pathRenderStyle !== 'stroke') return null;
        const state = elementStates[element.id];
        const showName = shouldShowLabel(state, elementToggle(elementToggles, toggles, element.id, 'showRiverNames'));
        const dataValue = elementDataValues?.[element.id];
        if (!showName && !dataValue) return null;
        const color = (state !== undefined && state !== 'hidden')
          ? (elementStateColorOverrides?.[state] ?? STATUS_COLORS[state].main)
          : 'var(--color-text-primary)';
        const anchor = element.labelAnchor ?? element.viewBoxCenter;
        const pos = element.labelPosition;
        const labelOffset = 0.8; // viewBox units
        const labelProps = computeLabelProps(anchor, pos, labelOffset);
        return (
          <g key={`river-label-${element.id}`}>
            {showName && (
              <text
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
                onMouseEnter={onElementHoverStart ? () => handleElementHoverStart(element.id) : undefined}
                onMouseLeave={onElementHoverStart ? handleElementHoverEnd : undefined}
              >
                {element.label}
              </text>
            )}
            {dataValue !== undefined && (
              <text
                {...labelProps}
                y={labelProps.y + (showName ? 1.0 : 0)}
                className={styles.riverLabel}
                style={{
                  fill: color,
                  fontSize: '75%',
                  strokeOpacity: 0.75,
                  paintOrder: 'stroke',
                  stroke: 'var(--color-label-halo)',
                  strokeWidth: 0.4,
                  strokeLinejoin: 'round',
                  opacity: 0.7,
                }}
              >
                {dataValue}
              </text>
            )}
          </g>
        );
      })}

      {/* Flag images near city dots (capitals quizzes — not for stroke-style paths like rivers) */}
      {sortedCityElements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        if (!elementToggle(elementToggles, toggles, element.id, 'showMapFlags')) return null;
        if (!isMapElement(element) || !element.code) return null;
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
      {sortedCityElements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        // Skip dots for fill-style polygon elements unless the polygon is tiny
        if (isMapElement(element) && element.svgPathData) {
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
            onMouseEnter={onElementHoverStart ? () => handleElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverStart ? handleElementHoverEnd : undefined}
          />
        );
      })}

      {/* City name labels (rendered on top of dots — not for stroke-style paths like rivers or fill shapes like countries) */}
      {sortedCityElements.map((element) => {
        if (clusteredElementIds.has(element.id)) return null;
        // Shape elements (countries/states) use the "Region polygon labels" section above
        if (isMapElement(element) && element.svgPathData) return null;
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
            onMouseEnter={onElementHoverStart ? () => handleElementHoverStart(element.id) : undefined}
            onMouseLeave={onElementHoverStart ? handleElementHoverEnd : undefined}
          >
            {element.label}
          </text>
        );
      })}
    </g>
  );
});
