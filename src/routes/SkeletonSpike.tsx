import {
  Suspense,
  Fragment,
  useState,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
  useEffect,
  type RefObject,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { assetPath } from '@/utilities/assetPath';
import styles from './SkeletonSpike.module.css';

const MODEL_URL = assetPath('/data/bones-3d/overview-skeleton.glb');
const FOV_DEG = 45;

useGLTF.preload(MODEL_URL);

/** Three.js GLTFLoader replaces spaces with underscores in node names. */
function toNodeKey(name: string): string {
  return name.replace(/ /g, '_').replace(/\./g, '');
}

/**
 * Strip side suffix and convert underscores back to spaces.
 * Handles both ".r"/".l"/"_r"/"_l" (separator preserved) and bare "r"/"l" appended
 * directly when the GLTF exporter drops the dot (e.g. "Tibiar", "1st_metacarpal_boner").
 * The bare-suffix strip is only applied when no separator-based match was found,
 * to avoid incorrectly trimming midline bones whose names end in 'r' (e.g. "Vomer").
 */
function canonicalBoneName(nodeName: string): string {
  const stripped = nodeName.replace(/[._][lr]$/i, '');
  const hadSeparator = stripped.length !== nodeName.length;
  const spaced = stripped.replace(/_/g, ' ');
  return hadSeparator ? spaced : spaced.replace(/[lr]$/i, '');
}

/** Apply human-friendly substitutions to a canonical bone name for display. */
function formatBoneName(name: string): string {
  return name.replace(/finger of foot/gi, 'toe');
}

export type LabelMode = 'off' | 'hover' | 'on';

// ─── Region bone sets ────────────────────────────────────────────────────────

const FULL_BODY_BONES = [
  'Frontal bone',
  'Parietal bone left',
  'Parietal bone right',
  'Rib (1st).r',
  'Hip bone.r',
  'Femur.r',
  'Tibia.r',
  'Distal phalanx of first finger of foot.r',
  'Distal phalanx of fifth finger of foot.r',
];
const BACK_VIEW_BONES = [
  'Frontal bone',
  'Parietal bone left',
  'Parietal bone right',
  'Rib (12th).r',
  'Thoracic vertebrae (T7)',
  'Manubrium of sternum',
];
const FACE_BONES = [
  'Frontal bone',
  'Parietal bone left',
  'Parietal bone right',
  'Cervical vertebrae (C4)',
];
const TORSO_BONES = [
  'Manubrium of sternum',
  'Body of sternum',
  'Rib (1st).r',
  'Rib (7th).r',
  'Rib (12th).r',
  'Thoracic vertebrae (T7)',
  'Lumbar vertebrae (L3)',
  'Hip bone.r',
];
const LEG_BONES = [
  'Femur.r',
  'Tibia.r',
  'Fibula.r',
  'Patella.r',
  'Distal phalanx of first finger of foot.r',
];
const HAND_BONES = [
  '1st metacarpal bone.r',
  '5th metacarpal bone.r',
  'Distal phalanx of 1st finger.r',
  'Distal phalanx of 3d finger.r',
  'Distal phalanx of 5th finger.r',
  'Proximal phalanx of 2d finger.r',
  'Capitate.r',
];
const FOOT_BONES = [
  'Calcaneus.r',
  'Talus.r',
  'First metatarsal bone.r',
  'Fifth metatarsal bone.r',
  'Distal phalanx of first finger of foot.r',
  'Distal phalanx of fifth finger of foot.r',
];

// ─── Region bounding box computation ────────────────────────────────────────

function getGroupBox(
  nodes: Readonly<Record<string, THREE.Object3D>>,
  names: ReadonlyArray<string>,
): THREE.Box3 {
  let box: THREE.Box3 | undefined;
  for (const name of names) {
    const node = nodes[toNodeKey(name)];
    if (!node) continue;
    const nodeBox = new THREE.Box3().setFromObject(node);
    if (box) box.union(nodeBox);
    else box = nodeBox;
  }
  return box ?? new THREE.Box3();
}

// ─── Camera view types ───────────────────────────────────────────────────────

export interface CameraView {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
}

export interface ModelData {
  readonly yMin: number;
  readonly yMax: number;
  readonly views: Readonly<Record<string, CameraView>>;
  /** Canonical bone name → world-space center of the right-side (or midline) mesh. */
  readonly boneCenters: Readonly<Record<string, THREE.Vector3>>;
}

/**
 * Expand a bounding box to be symmetric around X=0.
 * Use this for bilateral regions (face, torso, legs) whose bones are only
 * on the right side in the model — the mirrored left side is identical.
 */
function symmetricBox(box: THREE.Box3): THREE.Box3 {
  const halfWidth = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
  return new THREE.Box3(
    new THREE.Vector3(-halfWidth, box.min.y, box.min.z),
    new THREE.Vector3(halfWidth, box.max.y, box.max.z),
  );
}

/** Compute a front-facing view that frames the given box with padding. */
function frontView(box: THREE.Box3, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y);
  const dist = (maxDim / 2 / Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) * padding;
  return {
    position: new THREE.Vector3(center.x, center.y, center.z + dist),
    target: new THREE.Vector3(center.x, center.y, center.z),
  };
}

/** Compute a rear-facing view that frames the given box with padding. */
function backView(box: THREE.Box3, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y);
  const dist = (maxDim / 2 / Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) * padding;
  return {
    position: new THREE.Vector3(center.x, center.y, center.z - dist),
    target: new THREE.Vector3(center.x, center.y, center.z),
  };
}

function raiseView(view: CameraView, height: number): CameraView {
  return {...view, position: view.position.add(new THREE.Vector3(0, height, 0))}
}

function computeModelData(
  scene: THREE.Group,
  nodes: Readonly<Record<string, THREE.Object3D>>,
): ModelData {
  const fullBox = new THREE.Box3().setFromObject(scene);

  const footBox = getGroupBox(nodes, FOOT_BONES);
  const footCenter = footBox.getCenter(new THREE.Vector3());
  const footSize = footBox.getSize(new THREE.Vector3());
  const footDist = Math.max(footSize.x, footSize.y, footSize.z) * 2.5;

  // ─────────────────────────────────────────────────────────────────────────
  // BONE CENTERS — world-space center per canonical bone name (right-side wins)
  // ─────────────────────────────────────────────────────────────────────────
  const boneCenters: Record<string, THREE.Vector3> = {};
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name) {
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        const canonical = canonicalBoneName(obj.name);
        if (!boneCenters[canonical]) {
          boneCenters[canonical] = box.getCenter(new THREE.Vector3());
        }
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CAMERA PRESETS — edit these to tune each view.
  //
  // Each entry is { position: Vector3, target: Vector3 }
  //   position — where the camera sits in world space (x, y, z)
  //   target   — the point the camera orbits around / looks at
  //
  // For front-facing views: keep position.y == target.y so the camera looks
  // straight ahead (not up/down). Increase the padding arg to zoom out.
  // For the foot view the camera is elevated to look down at a diagonal.
  // ─────────────────────────────────────────────────────────────────────────
  return {
    yMin: fullBox.min.y,
    yMax: fullBox.max.y,
    boneCenters,
    views: {
      full: raiseView(frontView(symmetricBox(getGroupBox(nodes, FULL_BODY_BONES)), 1), 1),
      back: backView(symmetricBox(getGroupBox(nodes, BACK_VIEW_BONES)), 1.3),
      face: frontView(symmetricBox(getGroupBox(nodes, FACE_BONES)), 1.5),
      torso: frontView(symmetricBox(getGroupBox(nodes, TORSO_BONES)), 1.2),
      legs: frontView(symmetricBox(getGroupBox(nodes, LEG_BONES)), 1.2),
      hand: frontView(getGroupBox(nodes, HAND_BONES), 1.4),
      // Foot: angled from front+above
      foot: {
        position: new THREE.Vector3(
          footCenter.x,
          footCenter.y + footDist * 0.55,
          footCenter.z + footDist * 0.75,
        ),
        target: footCenter.clone(),
      },
    },
  };
}

// ─── SkeletonModel ───────────────────────────────────────────────────────────

interface SkeletonModelProps {
  readonly onBoneClick: (name: string) => void;
  readonly onBoneHover: (name: string | null) => void;
  readonly onModelData: (data: ModelData) => void;
}

function SkeletonModel({ onBoneClick, onBoneHover, onModelData }: SkeletonModelProps) {
  const { scene } = useGLTF(MODEL_URL);
  const { gl } = useThree();
  const canvasRef = useRef<HTMLElement | null>(null);
  useEffect(() => { canvasRef.current = gl.domElement; }, [gl]);
  const mirroredScene = useMemo(() => scene.clone(true), [scene]);

  // Build name→node map from scene traversal. Drei's `nodes` sanitizes keys to
  // underscores; we need the originals for toNodeKey lookups to work correctly.
  const nodesByName = useMemo(() => {
    const map: Record<string, THREE.Object3D> = {};
    scene.traverse((obj) => {
      if (obj.name) map[obj.name] = obj;
    });
    return map;
  }, [scene]);

  useLayoutEffect(() => {
    onModelData(computeModelData(scene, nodesByName));
  }, [scene, nodesByName, onModelData]);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.object.name) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
        onBoneHover(canonicalBoneName(e.object.name));
      }
    },
    [canvasRef, onBoneHover],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      onBoneHover(null);
    },
    [canvasRef, onBoneHover],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const name = canonicalBoneName(e.object.name);
      if (name) onBoneClick(name);
    },
    [onBoneClick],
  );

  return (
    <>
      <primitive
        object={scene}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <group scale={[-1, 1, 1]}>
        <primitive
          object={mirroredScene}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      </group>
    </>
  );
}

// ─── Camera animation ────────────────────────────────────────────────────────

interface CameraAnimatorProps {
  readonly target: CameraView | null;
  readonly controlsRef: RefObject<OrbitControlsImpl>;
  readonly onDone: () => void;
}

/** Smoothly lerps the camera toward `target` using frame-rate-independent easing. */
function CameraAnimator({ target, controlsRef, onDone }: CameraAnimatorProps) {
  useFrame((_, delta) => {
    if (!target || !controlsRef.current) return;
    const controls = controlsRef.current;
    const cam = controls.object as THREE.Camera;

    // Frame-rate independent: ~10% per frame at 60fps, reaches 99% in ~0.6s
    const t = 1 - Math.pow(0.001, delta);
    cam.position.lerp(target.position, t);
    controls.target.lerp(target.target, t);
    controls.update();

    if (
      cam.position.distanceTo(target.position) < 0.0005 &&
      controls.target.distanceTo(target.target) < 0.0005
    ) {
      cam.position.copy(target.position);
      controls.target.copy(target.target);
      controls.update();
      onDone();
    }
  });
  return null;
}

// ─── Bone labels ─────────────────────────────────────────────────────────────

/** Distance (world units) the label is pushed toward the camera from the bone center. */
const LABEL_OFFSET = 0.08;

/**
 * Minimum X distance from center to treat a bone as bilateral (not midline).
 * Midline bones (spine, sternum, skull) have x ≈ 0 and should not be mirrored.
 */
const BILATERAL_THRESHOLD = 0.04;

interface BoneLabelProps {
  readonly center: THREE.Vector3;
  readonly text: string;
  readonly mirrorX?: boolean;
  /** Scale multiplier for the sprite; use < 1.0 in dense areas. */
  readonly scale?: number;
}

/** Height of a label sprite in world units. */
const LABEL_HEIGHT = 0.022;

const LABEL_FONT = 'bold 13px system-ui, sans-serif';
const LABEL_H_PADDING = 12; // px each side

/** Build a canvas texture sized to the text, with a dark pill background. */
function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const scale = 2; // retina
  const h = 28;
  // Measure actual text width before allocating the canvas.
  const tmp = document.createElement('canvas').getContext('2d')!;
  tmp.font = LABEL_FONT;
  const w = Math.max(40, Math.ceil(tmp.measureText(text).width) + LABEL_H_PADDING * 2);

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

/**
 * Renders a label sprite in 3D space positioned just in front of a bone surface.
 * THREE.Sprite auto-billboards toward the camera; we update its position each frame
 * to keep the camera-relative offset as the user orbits.
 */
function BoneLabel({ center, text, mirrorX = false, scale = 1 }: BoneLabelProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();

  const { texture, aspect } = useMemo(() => makeLabelTexture(text), [text]);

  const effectiveCenter = useMemo(
    () =>
      mirrorX ? new THREE.Vector3(-center.x, center.y, center.z) : center.clone(),
    [center, mirrorX],
  );

  // Reuse a single Vector3 for the direction computation to avoid GC churn.
  const dirScratch = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!spriteRef.current) return;
    dirScratch.current
      .subVectors(camera.position, effectiveCenter)
      .normalize();
    spriteRef.current.position
      .copy(effectiveCenter)
      .addScaledVector(dirScratch.current, LABEL_OFFSET);
  });

  const h = LABEL_HEIGHT * scale;
  return (
    <sprite ref={spriteRef} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthTest />
    </sprite>
  );
}

interface BoneLabelsProps {
  readonly boneCenters: Readonly<Record<string, THREE.Vector3>>;
  readonly yMin: number;
  readonly yMax: number;
  /** When set, only the label for this bone is shown (hover mode). */
  readonly hoveredBone: string | null;
}

/**
 * Returns a scale < 1 for areas that have many overlapping labels:
 * face (top), feet/ankles (bottom), and hands (large horizontal offset).
 */
function zoneScale(center: THREE.Vector3, yMin: number, yMax: number): number {
  const yRange = yMax - yMin;
  const yNorm = (center.y - yMin) / yRange; // 0 = feet, 1 = skull top
  if (yNorm > 0.83 || yNorm < 0.13) return 0.4; // face or feet/ankles
  // Hands: mid-height and far to the sides
  if (Math.abs(center.x) > yRange * 0.12 && yNorm > 0.28 && yNorm < 0.62) return 0.4;
  return 1;
}

function BoneLabels({ boneCenters, yMin, yMax, hoveredBone }: BoneLabelsProps) {
  return (
    <>
      {Object.entries(boneCenters).map(([name, center]) => {
        if (hoveredBone !== null && name !== hoveredBone) return null;
        const isBilateral = Math.abs(center.x) > BILATERAL_THRESHOLD;
        const labelText = formatBoneName(name);
        const scale = zoneScale(center, yMin, yMax);
        return (
          <Fragment key={name}>
            <BoneLabel center={center} text={labelText} scale={scale} />
            {isBilateral && (
              <BoneLabel center={center} text={labelText} mirrorX scale={scale} />
            )}
          </Fragment>
        );
      })}
    </>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────

interface SceneProps {
  readonly onBoneClick: (name: string) => void;
  readonly onModelData: (data: ModelData) => void;
  readonly animTarget: CameraView | null;
  readonly onAnimDone: () => void;
  readonly labelMode: LabelMode;
}

function Scene({ onBoneClick, onModelData, animTarget, onAnimDone, labelMode }: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const [boneCenters, setBoneCenters] = useState<Readonly<Record<string, THREE.Vector3>>>({});
  const [yRange, setYRange] = useState<{ yMin: number; yMax: number }>({ yMin: 0, yMax: 1 });
  const [hoveredBone, setHoveredBone] = useState<string | null>(null);

  const handleModelData = useCallback(
    (data: ModelData) => {
      onModelData(data);
      setBoneCenters(data.boneCenters);
      setYRange({ yMin: data.yMin, yMax: data.yMax });
      // Jump to full-body view on first load (no animation)
      const full = data.views.full;
      camera.position.copy(full.position);
      const controls = controlsRef.current;
      if (controls) {
        controls.target.copy(full.target);
        controls.update();
      }
    },
    [onModelData, camera],
  );

  const showLabels =
    labelMode === 'on' || (labelMode === 'hover' && hoveredBone !== null);
  // null hoveredBone passed to BoneLabels = show all; non-null = filter to that bone
  const labelFilter = labelMode === 'hover' ? hoveredBone : null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <SkeletonModel
          onBoneClick={onBoneClick}
          onBoneHover={setHoveredBone}
          onModelData={handleModelData}
        />
      </Suspense>
      <OrbitControls ref={controlsRef} makeDefault />
      <CameraAnimator target={animTarget} controlsRef={controlsRef} onDone={onAnimDone} />
      {showLabels && (
        <BoneLabels
          boneCenters={boneCenters}
          yMin={yRange.yMin}
          yMax={yRange.yMax}
          hoveredBone={labelFilter}
        />
      )}
    </>
  );
}

// ─── Preset config ────────────────────────────────────────────────────────────

const PRESETS: ReadonlyArray<{
  readonly key: string;
  readonly label: string;
  readonly hotkey: string;
}> = [
  { key: 'full', label: 'Full body', hotkey: 'F' },
  { key: 'face', label: 'Skull', hotkey: 'S' },
  { key: 'torso', label: 'Torso', hotkey: 'T' },
  { key: 'legs', label: 'Legs', hotkey: 'L' },
  { key: 'hand', label: 'Hand', hotkey: 'H' },
  { key: 'foot', label: 'Foot', hotkey: 'O' },
  { key: 'back', label: 'Back', hotkey: 'B' },
];

const HOTKEY_MAP: Readonly<Record<string, string>> = Object.fromEntries(
  PRESETS.map(({ hotkey, key }) => [hotkey.toLowerCase(), key]),
);

// ─── Main component ──────────────────────────────────────────────────────────

export default function SkeletonSpike() {
  const [clickedBone, setClickedBone] = useState<string | null>(null);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [animTarget, setAnimTarget] = useState<CameraView | null>(null);
  const [labelMode, setLabelMode] = useState<LabelMode>('off');

  const goToPreset = useCallback(
    (key: string) => {
      if (!modelData) return;
      setAnimTarget(modelData.views[key] ?? null);
    },
    [modelData],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const presetKey = HOTKEY_MAP[e.key.toLowerCase()];
      if (presetKey) goToPreset(presetKey);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goToPreset]);

  return (
    <div className={styles.page}>
      <div className={styles.label}>
        {clickedBone ? (
          <>
            <span className={styles.labelKey}>Clicked bone:</span>{' '}
            <span className={styles.labelValue}>{formatBoneName(clickedBone)}</span>
          </>
        ) : (
          <span className={styles.labelHint}>Click a bone to identify it</span>
        )}
      </div>

      <nav className={styles.sidebar}>
        <span className={styles.sidebarHeading}>Camera positions</span>
        <div className={styles.presets}>
          {PRESETS.map(({ key, label, hotkey }) => (
            <button
              key={key}
              className={styles.presetButton}
              onClick={() => goToPreset(key)}
              disabled={!modelData}
              title={`${label} (${hotkey})`}
            >
              <span className={styles.presetLabel}>{label}</span>
              <kbd className={styles.hotkey}>{hotkey}</kbd>
            </button>
          ))}
        </div>
        <span className={styles.sidebarHeading}>Labels</span>
        <div className={styles.labelModeGroup}>
          {(['off', 'hover', 'on'] as const).map((mode) => (
            <button
              key={mode}
              className={`${styles.labelModeButton} ${labelMode === mode ? styles.labelModeActive : ''}`}
              onClick={() => setLabelMode(mode)}
            >
              {mode === 'off' ? 'Off' : mode === 'hover' ? 'Hover' : 'On'}
            </button>
          ))}
        </div>
      </nav>

      <Canvas
        className={styles.canvas}
        camera={{ position: [0, 0, 3], fov: FOV_DEG }}
        gl={{ antialias: true }}
      >
        <Scene
          onBoneClick={setClickedBone}
          onModelData={setModelData}
          animTarget={animTarget}
          onAnimDone={() => setAnimTarget(null)}
          labelMode={labelMode}
        />
      </Canvas>
    </div>
  );
}
