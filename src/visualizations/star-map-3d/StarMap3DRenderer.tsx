/**
 * StarMap3DRenderer — React Three Fiber renderer for the nearby stars quiz.
 *
 * Renders stars as glowing spheres in 3D space, sized by luminosity and
 * colored by spectral class. The Sun sits at the origin as a glowing green
 * marker. A galactic plane disc and center arrow provide orientation.
 *
 * Camera presets: Neighborhood (pulled back ~60 ly), Earth (at origin looking out).
 */
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { isStarMap3DElement } from './StarMap3DElement';
import { useWindowSize } from '@/utilities/useWindowSize';
import { NARROW_WIDTH } from '@/utilities/breakpoints';
import styles from './StarMap3DRenderer.module.css';

// --- Constants ---

const FOV_DEG = 50;
const NEIGHBORHOOD_DISTANCE = 60; // ly — how far the camera pulls back

// Spectral class colors (approximate real-star colors)
const SPECTRAL_COLORS: Readonly<Record<string, string>> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffd2a1',
  M: '#ffcc6f',
  D: '#f0f0ff', // white dwarfs
};
const UNKNOWN_STAR_COLOR = '#cccccc';

// State colors — resolved from CSS vars
function resolveVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

function stateColor(state: ElementVisualState | undefined): string | null {
  switch (state) {
    case 'correct': return resolveVar('--color-correct', '#22c55e');
    case 'correct-second': return resolveVar('--color-correct-second', '#86efac');
    case 'correct-third': return resolveVar('--color-correct-third', '#bbf7d0');
    case 'incorrect': return resolveVar('--color-incorrect', '#ef4444');
    case 'missed': return resolveVar('--color-missed', '#f97316');
    case 'highlighted': return resolveVar('--color-highlighted', '#ffdd00');
    default: return null;
  }
}

import { starRadius } from './starRadius';

// --- Camera views ---

interface CameraView {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
}

function neighborhoodView(): CameraView {
  return {
    position: new THREE.Vector3(0, NEIGHBORHOOD_DISTANCE * 0.6, NEIGHBORHOOD_DISTANCE),
    target: new THREE.Vector3(0, 0, 0),
  };
}

function earthView(): CameraView {
  // At origin, looking toward the galactic center
  // Galactic center is roughly at (x=0, y=0, z=-26000) in our coordinate system
  // but we just point outward in an interesting direction
  return {
    position: new THREE.Vector3(0, 0, 0),
    target: new THREE.Vector3(10, 5, 10),
  };
}

// --- CameraAnimator ---

interface CameraAnimatorProps {
  readonly target: CameraView | null;
  readonly controlsRef: React.RefObject<OrbitControlsImpl | null>;
  readonly onDone: () => void;
}

function CameraAnimator({ target, controlsRef, onDone }: CameraAnimatorProps) {
  useFrame((_, delta) => {
    if (!target || !controlsRef.current) return;
    const controls = controlsRef.current;
    const cam = controls.object as THREE.Camera;
    const t = 1 - Math.pow(0.001, delta);
    cam.position.lerp(target.position, t);
    controls.target.lerp(target.target, t);
    controls.update();
    if (
      cam.position.distanceTo(target.position) < 0.01 &&
      controls.target.distanceTo(target.target) < 0.01
    ) {
      cam.position.copy(target.position);
      controls.target.copy(target.target);
      controls.update();
      onDone();
    }
  });
  return null;
}

// --- Star label sprites ---

const LABEL_FONT = 'bold 13px system-ui, sans-serif';

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const scale = 2;
  const h = 28;
  const tmp = document.createElement('canvas').getContext('2d');
  if (!tmp) return { texture: new THREE.CanvasTexture(document.createElement('canvas')), aspect: 1 };
  tmp.font = LABEL_FONT;
  const hPad = 12;
  const w = Math.max(40, Math.ceil(tmp.measureText(text).width) + hPad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { texture: new THREE.CanvasTexture(canvas), aspect: w / h };
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.roundRect(1, 1, w - 2, h - 2, 5);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = LABEL_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  return { texture: new THREE.CanvasTexture(canvas), aspect: w / h };
}

interface StarLabelProps {
  readonly position: THREE.Vector3;
  readonly text: string;
}

function StarLabel({ position, text }: StarLabelProps) {
  const { texture, aspect } = useMemo(() => makeLabelTexture(text), [text]);
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  const offset = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!spriteRef.current) return;
    // Position label slightly toward camera from the star
    offset.current.subVectors(camera.position, position).normalize().multiplyScalar(1.0);
    spriteRef.current.position.copy(position).add(offset.current);
  });

  const h = 0.8;
  return (
    <sprite ref={spriteRef} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

// --- Sol marker ---

function SolMarker() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (glowRef.current) {
      const s = 0.8 + 0.2 * Math.sin(clock.getElapsedTime() * 2);
      glowRef.current.scale.setScalar(s);
    }
  });

  const labelData = useMemo(() => makeLabelTexture('Sol (You are here)'), []);

  return (
    <group position={[0, 0, 0]}>
      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#22c55e" emissive="#115522" emissiveIntensity={0.8} />
      </mesh>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.15} />
      </mesh>
      {/* Label */}
      <sprite position={[0, 1.2, 0]} scale={[labelData.aspect * 0.9, 0.9, 1]}>
        <spriteMaterial map={labelData.texture} transparent depthTest={false} />
      </sprite>
      {/* Point light for ambient glow */}
      <pointLight color="#22c55e" intensity={2} distance={8} />
    </group>
  );
}

// --- Galactic plane indicator ---

/** The galactic center is ~26,000 ly away. In HYG's equatorial coordinate system:
 *  the galactic center is roughly toward (RA ~17h45m, Dec ~-29°).
 *  In equatorial Cartesian: x≈-8.3, y≈-0.5, z≈-5.0 (unit vector).
 *  We'll just use a normalized direction arrow.
 */
const GALACTIC_CENTER_DIR = new THREE.Vector3(-0.87, -0.05, -0.49).normalize();

function GalacticIndicators({ visible }: { readonly visible: boolean }) {
  const arrowLength = 45;
  const arrowStart = useMemo(() => GALACTIC_CENTER_DIR.clone().multiplyScalar(15), []);
  const arrowEnd = useMemo(() => GALACTIC_CENTER_DIR.clone().multiplyScalar(arrowLength), []);

  // The galactic plane is tilted ~63° to the celestial equator.
  const discQuaternion = useMemo(() => {
    const galacticNorth = new THREE.Vector3(-0.0549, 0.4942, -0.8677).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), galacticNorth);
  }, []);

  const labelData = useMemo(() => makeLabelTexture('Galactic Center'), []);
  const edgeLabelData = useMemo(() => makeLabelTexture('Galactic Edge'), []);

  const edgeDir = useMemo(() => GALACTIC_CENTER_DIR.clone().negate(), []);
  const edgePos = useMemo(() => edgeDir.clone().multiplyScalar(arrowLength), [edgeDir]);
  const edgeStart = useMemo(() => edgeDir.clone().multiplyScalar(15), [edgeDir]);

  const coneQuaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), GALACTIC_CENTER_DIR),
    [],
  );

  const centerLinePoints = useMemo(
    (): ReadonlyArray<[number, number, number]> => [
      [arrowStart.x, arrowStart.y, arrowStart.z],
      [arrowEnd.x, arrowEnd.y, arrowEnd.z],
    ],
    [arrowStart, arrowEnd],
  );
  const edgeLinePoints = useMemo(
    (): ReadonlyArray<[number, number, number]> => [
      [edgeStart.x, edgeStart.y, edgeStart.z],
      [edgePos.x, edgePos.y, edgePos.z],
    ],
    [edgeStart, edgePos],
  );

  if (!visible) return null;

  return (
    <group>
      {/* Galactic plane disc */}
      <mesh quaternion={discQuaternion}>
        <ringGeometry args={[20, 50, 64]} />
        <meshBasicMaterial
          color="#4488aa"
          transparent
          opacity={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Arrow toward galactic center */}
      <Line points={centerLinePoints} color="#4488aa" transparent opacity={0.5} lineWidth={1} />

      {/* Arrowhead cone */}
      <mesh position={arrowEnd} quaternion={coneQuaternion}>
        <coneGeometry args={[0.6, 2, 8]} />
        <meshBasicMaterial color="#4488aa" transparent opacity={0.6} />
      </mesh>

      {/* Center label */}
      <sprite
        position={[arrowEnd.x + GALACTIC_CENTER_DIR.x * 2, arrowEnd.y + GALACTIC_CENTER_DIR.y * 2 + 1.5, arrowEnd.z + GALACTIC_CENTER_DIR.z * 2]}
        scale={[labelData.aspect * 0.9, 0.9, 1]}
      >
        <spriteMaterial map={labelData.texture} transparent depthTest={false} />
      </sprite>

      {/* Galactic edge arrow (opposite direction) */}
      <Line points={edgeLinePoints} color="#886644" transparent opacity={0.3} lineWidth={1} />

      {/* Edge label */}
      <sprite
        position={[edgePos.x + edgeDir.x * 2, edgePos.y + edgeDir.y * 2 + 1.5, edgePos.z + edgeDir.z * 2]}
        scale={[edgeLabelData.aspect * 0.9, 0.9, 1]}
      >
        <spriteMaterial map={edgeLabelData.texture} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

// --- Grid reference ---

function ReferenceGrid({ visible }: { readonly visible: boolean }) {
  if (!visible) return null;

  return (
    <gridHelper
      args={[100, 10, '#333333', '#222222']}
      rotation={[0, 0, 0]}
    />
  );
}

// --- Star spheres ---

interface StarSpheresProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHover: (elementId: string | null) => void;
  readonly showSpectralColors: boolean;
}

function StarSpheres({
  elements,
  elementStates,
  onElementClick,
  onElementHover,
  showSpectralColors,
}: StarSpheresProps) {
  const { gl } = useThree();
  const canvasRef = useRef<HTMLElement | null>(null);
  useEffect(() => { canvasRef.current = gl.domElement; }, [gl]);

  const dragRef = useRef({ startX: 0, startY: 0, wasDrag: false });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, wasDrag: false };
  }, []);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (dx * dx + dy * dy > 25) dragRef.current.wasDrag = true;
  }, []);

  return (
    <>
      {elements.map((el) => {
        if (!isStarMap3DElement(el)) return null;
        const state = elementStates[el.id];
        if (state === 'hidden') return null;

        const pos = el.viewBoxCenter;
        const radius = starRadius(el.luminosity);

        // Determine color
        let color: string;
        const overrideColor = stateColor(state);
        if (overrideColor) {
          color = overrideColor;
        } else if (showSpectralColors) {
          color = SPECTRAL_COLORS[el.spectralClass] || UNKNOWN_STAR_COLOR;
        } else {
          color = '#dddddd';
        }

        const isContext = state === 'context';
        const opacity = isContext ? 0.4 : 1;
        const emissiveIntensity = state === 'highlighted' ? 1.5 : 0.3;

        return (
          <mesh
            key={el.id}
            position={[pos.x, pos.z ?? 0, pos.y]}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
              onElementHover(el.id);
            }}
            onPointerOut={(e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (canvasRef.current) canvasRef.current.style.cursor = 'default';
              onElementHover(null);
            }}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (dragRef.current.wasDrag) return;
              e.stopPropagation();
              onElementClick?.(el.id);
            }}
          >
            <sphereGeometry args={[radius, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={emissiveIntensity}
              transparent={opacity < 1}
              opacity={opacity}
            />
          </mesh>
        );
      })}
    </>
  );
}

// --- Star labels ---

interface StarLabelsProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly hoveredElementId: string | null;
  readonly labelMode: 'off' | 'hover' | 'on';
}

function shouldShowStarLabel(
  state: ElementVisualState | undefined,
  labelMode: 'off' | 'hover' | 'on',
  id: string,
  hoveredElementId: string | null,
): boolean {
  if (labelMode === 'off') return false;
  // Only answered/resolved states can show labels (avoid revealing answers)
  if (state !== 'correct' && state !== 'correct-second' && state !== 'correct-third' &&
      state !== 'incorrect' && state !== 'missed' && state !== 'context') {
    return false;
  }
  if (labelMode === 'on') return true;
  return id === hoveredElementId;
}

function StarLabels({ elements, elementStates, hoveredElementId, labelMode }: StarLabelsProps) {
  return (
    <>
      {elements.map((el) => {
        if (!isStarMap3DElement(el)) return null;
        const state = elementStates[el.id];
        if (!shouldShowStarLabel(state, labelMode, el.id, hoveredElementId)) return null;

        const pos = el.viewBoxCenter;
        return (
          <StarLabel
            key={el.id}
            position={new THREE.Vector3(pos.x, pos.z ?? 0, pos.y)}
            text={el.label}
          />
        );
      })}
    </>
  );
}

// --- Scene ---

interface SceneProps {
  readonly elements: VisualizationRendererProps['elements'];
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly animTarget: CameraView | null;
  readonly onAnimDone: () => void;
  readonly showSpectralColors: boolean;
  readonly showGalacticIndicators: boolean;
  readonly showGrid: boolean;
  readonly labelMode: 'off' | 'hover' | 'on';
  readonly putInView?: ReadonlyArray<string>;
  readonly onPutInViewTarget: (view: CameraView) => void;
}

function Scene({
  elements,
  elementStates,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  animTarget,
  onAnimDone,
  showSpectralColors,
  showGalacticIndicators,
  showGrid,
  labelMode,
  putInView,
  onPutInViewTarget,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const handleElementHover = useCallback((elementId: string | null) => {
    setHoveredElementId(elementId);
    if (elementId) {
      onElementHoverStart?.(elementId);
    } else {
      onElementHoverEnd?.();
    }
  }, [onElementHoverStart, onElementHoverEnd]);

  // Set initial camera position
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current || !controlsRef.current) return;
    initializedRef.current = true;
    const view = neighborhoodView();
    camera.position.copy(view.position);
    controlsRef.current.target.copy(view.target);
    controlsRef.current.update();
  });

  // putInView: animate to frame target stars
  useEffect(() => {
    if (!putInView || putInView.length === 0) return;
    const targetPositions: Array<THREE.Vector3> = [];
    for (const el of elements) {
      if (putInView.includes(el.id) && isStarMap3DElement(el)) {
        targetPositions.push(new THREE.Vector3(el.viewBoxCenter.x, el.viewBoxCenter.z ?? 0, el.viewBoxCenter.y));
      }
    }
    if (targetPositions.length === 0) return;

    const box = new THREE.Box3();
    for (const p of targetPositions) box.expandByPoint(p);
    box.expandByScalar(3);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.5;

    onPutInViewTarget({
      position: new THREE.Vector3(center.x, center.y + dist * 0.3, center.z + dist),
      target: center,
    });
  }, [putInView, elements, onPutInViewTarget]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 50, 50]} intensity={0.5} />

      <SolMarker />
      <GalacticIndicators visible={showGalacticIndicators} />
      <ReferenceGrid visible={showGrid} />

      <StarSpheres
        elements={elements}
        elementStates={elementStates}
        onElementClick={onElementClick}
        onElementHover={handleElementHover}
        showSpectralColors={showSpectralColors}
      />

      <StarLabels
        elements={elements}
        elementStates={elementStates}
        hoveredElementId={hoveredElementId}
        labelMode={labelMode}
      />

      <OrbitControls ref={controlsRef} makeDefault />
      <CameraAnimator target={animTarget} controlsRef={controlsRef} onDone={onAnimDone} />
    </>
  );
}

// --- Camera presets ---

const PRESETS: ReadonlyArray<{ readonly key: string; readonly label: string; readonly hotkey: string }> = [
  { key: 'neighborhood', label: 'Overview', hotkey: 'N' },
  { key: 'earth', label: 'Earth', hotkey: 'E' },
];

const HOTKEY_MAP: Readonly<Record<string, string>> = Object.fromEntries(
  PRESETS.map(({ hotkey, key }) => [hotkey.toLowerCase(), key]),
);

const CAMERA_VIEWS: Readonly<Record<string, () => CameraView>> = {
  neighborhood: neighborhoodView,
  earth: earthView,
};

// --- Floating sidebar for narrow screens ---

function FloatingSidebar({ children }: { readonly children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && e.target instanceof Node && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className={styles.floatingContainer} ref={containerRef}>
      <button
        className={styles.floatingTrigger}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="View options"
        aria-expanded={open}
        type="button"
      >
        &#x22EF;
      </button>
      {open && (
        <nav className={styles.floatingPanel}>
          {children}
        </nav>
      )}
    </div>
  );
}

// --- Main renderer ---

export function StarMap3DRenderer({
  elements,
  elementStates,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  toggles,
  putInView,
}: VisualizationRendererProps) {
  const [animTarget, setAnimTarget] = useState<CameraView | null>(null);
  const [labelMode, setLabelMode] = useState<'off' | 'hover' | 'on'>('hover');

  const showSpectralColors = toggles['showSpectralColors'] !== false;
  const showGalacticIndicators = toggles['showGalacticIndicators'] !== false;
  const showGrid = toggles['showGrid'] === true;

  const goToPreset = useCallback((key: string) => {
    const viewFn = CAMERA_VIEWS[key];
    if (viewFn) setAnimTarget(viewFn());
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const presetKey = HOTKEY_MAP[e.key.toLowerCase()];
      if (presetKey) goToPreset(presetKey);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToPreset]);

  const { width } = useWindowSize();
  const isNarrow = width < NARROW_WIDTH;

  const sidebarContent = (
    <>
      <span className={styles.sidebarHeading}>Camera</span>
      <div className={styles.presets}>
        {PRESETS.map(({ key, label, hotkey }) => (
          <button
            key={key}
            className={styles.presetButton}
            onClick={() => goToPreset(key)}
            title={`${label} (${hotkey})`}
          >
            <span className={styles.presetLabel}>{label}</span>
            <kbd className={styles.hotkey}>{hotkey}</kbd>
          </button>
        ))}
      </div>
      <span className={styles.sidebarHeading}>Labels</span>
      <div className={styles.labelToggle}>
        {(['off', 'hover', 'on'] as const).map((mode) => (
          <button
            key={mode}
            className={`${styles.labelButton} ${mode === labelMode ? styles.labelButtonActive : ''}`}
            onClick={() => setLabelMode(mode)}
          >
            {mode === 'off' ? 'Off' : mode === 'hover' ? 'Hover' : 'On'}
          </button>
        ))}
      </div>
      <div className={styles.attribution}>
        {'Data: '}
        <a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noopener noreferrer">HYG Database</a>
        {' v4.1, '}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a>
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      {isNarrow ? (
        <FloatingSidebar>{sidebarContent}</FloatingSidebar>
      ) : (
        <nav className={styles.sidebar}>
          {sidebarContent}
        </nav>
      )}

      <Canvas
        className={styles.canvas}
        camera={{ position: [0, NEIGHBORHOOD_DISTANCE * 0.6, NEIGHBORHOOD_DISTANCE], fov: FOV_DEG, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene
            elements={elements}
            elementStates={elementStates}
            onElementClick={onElementClick}
            onElementHoverStart={onElementHoverStart}
            onElementHoverEnd={onElementHoverEnd}
            animTarget={animTarget}
            onAnimDone={() => setAnimTarget(null)}
            showSpectralColors={showSpectralColors}
            showGalacticIndicators={showGalacticIndicators}
            showGrid={showGrid}
            labelMode={labelMode}
            putInView={putInView}
            onPutInViewTarget={setAnimTarget}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
