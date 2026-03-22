/**
 * Anatomy3DRenderer — React Three Fiber renderer for the 3D human skeleton quiz.
 *
 * Receives VisualizationRendererProps and renders a GLB skeleton model.
 * Per-bone colors follow element-state rules (element-states.md).
 * Bones not in the quiz element list are shown in the 'context' style.
 *
 * Toggle keys understood by this renderer (from VisualizationRendererProps.toggles):
 *   labelMode  — via selectToggles: 'off' | 'hover' | 'on'  (stored as string in toggles via prefix)
 *   showLabels — boolean (if select toggle is not available, fall back to this)
 *
 * The sidebar (camera presets) is rendered inside the component.
 */
import {
  Suspense,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { ElementVisualState } from '@/visualizations/VisualizationElement';
import type { VisualizationRendererProps } from '../VisualizationRendererProps';
import { isAnatomy3DElement } from './Anatomy3DElement';
import { assetPath } from '@/utilities/assetPath';
import styles from './Anatomy3DRenderer.module.css';

const MODEL_URL = assetPath('/data/bones-3d/overview-skeleton.glb');
const FOV_DEG = 45;

// ─── State colours ────────────────────────────────────────────────────────────
// Mirrors element-states.md rules; using CSS custom property names for theme support.
// Three.js materials use hex, so we resolve via a hidden DOM element at init.

function resolveVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

type ColorSet = { mesh: string; emissive: string; opacity: number };

function stateColorSet(state: ElementVisualState | undefined): ColorSet {
  switch (state) {
    case 'default':
      return { mesh: resolveVar('--color-bone-default', '#c8a96e'), emissive: '#000000', opacity: 1 };
    case 'hidden':
      return { mesh: '#888888', emissive: '#000000', opacity: 0 };
    case 'highlighted':
      return { mesh: resolveVar('--color-highlighted', '#ffdd00'), emissive: '#443300', opacity: 1 };
    case 'context':
      return { mesh: resolveVar('--color-bone-context', '#aaaaaa'), emissive: '#000000', opacity: 0.55 };
    case 'correct':
      return { mesh: resolveVar('--color-correct', '#22c55e'), emissive: '#003311', opacity: 1 };
    case 'correct-second':
      return { mesh: resolveVar('--color-correct-second', '#86efac'), emissive: '#002200', opacity: 1 };
    case 'correct-third':
      return { mesh: resolveVar('--color-correct-third', '#bbf7d0'), emissive: '#001100', opacity: 1 };
    case 'incorrect':
      return { mesh: resolveVar('--color-incorrect', '#ef4444'), emissive: '#330000', opacity: 1 };
    case 'missed':
      return { mesh: resolveVar('--color-missed', '#f97316'), emissive: '#221100', opacity: 1 };
    default:
      return { mesh: resolveVar('--color-bone-default', '#c8a96e'), emissive: '#000000', opacity: 1 };
  }
}

/** Default bone color (shown for meshes not part of the active quiz). */
const CONTEXT_COLORS: ColorSet = { mesh: '#b0a080', emissive: '#000000', opacity: 0.5 };

// ─── GLB node-key helpers ─────────────────────────────────────────────────────

/** Three.js GLTFLoader sanitizes node names: spaces → underscores, dots stripped. */
function toNodeKey(name: string): string {
  return name.replace(/ /g, '_').replace(/\./g, '');
}

// ─── Mesh→element mapping ─────────────────────────────────────────────────────

interface MeshEntry {
  readonly elementId: string;
  readonly side: 'left' | 'right' | 'midline';
  readonly directMesh: boolean;
}

/**
 * Build a lookup from (scene type × sanitized mesh name) → element ID.
 * scene type: 'original' | 'mirrored'
 */
function buildMeshMap(
  elements: VisualizationRendererProps['elements'],
): Map<string, MeshEntry> {
  const map = new Map<string, MeshEntry>();
  for (const el of elements) {
    if (!isAnatomy3DElement(el)) continue;
    const key = toNodeKey(el.meshName);
    if (el.side === 'midline') {
      // Midline: same element in both scenes — original only (mirrored overlaps at x=0)
      map.set(`original:${key}`, { elementId: el.id, side: 'midline', directMesh: true });
    } else if (el.side === 'right') {
      if (el.directMesh) {
        map.set(`original:${key}`, { elementId: el.id, side: 'right', directMesh: true });
      } else {
        // Right-side .r bone: lives in original scene
        map.set(`original:${key}`, { elementId: el.id, side: 'right', directMesh: false });
      }
    } else {
      // left
      if (el.directMesh) {
        // Direct-mesh left (e.g. Parietal bone left): in original scene by its own name
        map.set(`original:${key}`, { elementId: el.id, side: 'left', directMesh: true });
      } else {
        // Mirrored left (normal .r bone): same mesh name, in mirrored scene
        map.set(`mirrored:${key}`, { elementId: el.id, side: 'left', directMesh: false });
      }
    }
  }
  return map;
}

// ─── Camera helpers ───────────────────────────────────────────────────────────

export interface CameraView {
  readonly position: THREE.Vector3;
  readonly target: THREE.Vector3;
}

function frontView(box: THREE.Box3, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y);
  const dist = (maxDim / 2 / Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) * padding;
  return {
    position: new THREE.Vector3(center.x, center.y, center.z + dist),
    target: center.clone(),
  };
}

function backView(box: THREE.Box3, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y);
  const dist = (maxDim / 2 / Math.tan(((FOV_DEG / 2) * Math.PI) / 180)) * padding;
  return {
    position: new THREE.Vector3(center.x, center.y, center.z - dist),
    target: center.clone(),
  };
}

function symmetricBox(box: THREE.Box3): THREE.Box3 {
  const halfWidth = Math.max(Math.abs(box.min.x), Math.abs(box.max.x));
  return new THREE.Box3(
    new THREE.Vector3(-halfWidth, box.min.y, box.min.z),
    new THREE.Vector3(halfWidth, box.max.y, box.max.z),
  );
}

// ─── CameraAnimator ───────────────────────────────────────────────────────────

interface CameraAnimatorProps {
  readonly target: CameraView | null;
  readonly controlsRef: RefObject<OrbitControlsImpl | null>;
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

const LABEL_FONT = 'bold 13px system-ui, sans-serif';
const LABEL_H_PADDING = 12;
const LABEL_HEIGHT = 0.022;
const LABEL_OFFSET = 0.08;
const BILATERAL_THRESHOLD = 0.04;

function makeLabelTexture(text: string): { texture: THREE.CanvasTexture; aspect: number } {
  const scale = 2;
  const h = 28;
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

interface BoneLabelProps {
  readonly center: THREE.Vector3;
  readonly text: string;
  readonly mirrorX?: boolean;
  readonly scale?: number;
}

function BoneLabel({ center, text, mirrorX = false, scale = 1 }: BoneLabelProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  const { texture, aspect } = useMemo(() => makeLabelTexture(text), [text]);
  const effectiveCenter = useMemo(
    () => mirrorX ? new THREE.Vector3(-center.x, center.y, center.z) : center.clone(),
    [center, mirrorX],
  );
  const dirScratch = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!spriteRef.current) return;
    dirScratch.current.subVectors(camera.position, effectiveCenter).normalize();
    spriteRef.current.position.copy(effectiveCenter).addScaledVector(dirScratch.current, LABEL_OFFSET);
  });
  const h = LABEL_HEIGHT * scale;
  return (
    <sprite ref={spriteRef} scale={[h * aspect, h, 1]}>
      <spriteMaterial map={texture} transparent depthTest />
    </sprite>
  );
}

function zoneScale(center: THREE.Vector3, yMin: number, yMax: number): number {
  const yRange = yMax - yMin;
  const yNorm = (center.y - yMin) / yRange;
  if (yNorm > 0.83 || yNorm < 0.13) return 0.4;
  if (Math.abs(center.x) > yRange * 0.12 && yNorm > 0.28 && yNorm < 0.62) return 0.4;
  return 1;
}

interface BoneLabelsProps {
  readonly centers: ReadonlyArray<{ id: string; center: THREE.Vector3; label: string; state: ElementVisualState | undefined }>;
  readonly yMin: number;
  readonly yMax: number;
  readonly hoveredElementId: string | null;
  readonly labelMode: 'off' | 'hover' | 'on';
}

function BoneLabels({ centers, yMin, yMax, hoveredElementId, labelMode }: BoneLabelsProps) {
  if (labelMode === 'off') return null;

  return (
    <>
      {centers.map(({ id, center, label, state }) => {
        if (state === 'hidden') return null;
        if (labelMode === 'hover' && id !== hoveredElementId) return null;
        const isBilateral = Math.abs(center.x) > BILATERAL_THRESHOLD;
        const sc = zoneScale(center, yMin, yMax);
        return (
          <Fragment key={id}>
            <BoneLabel center={center} text={label} scale={sc} />
            {isBilateral && <BoneLabel center={center} text={label} mirrorX scale={sc} />}
          </Fragment>
        );
      })}
    </>
  );
}

// ─── SkeletonMeshes (the model + coloring) ────────────────────────────────────

interface SkeletonMeshesProps {
  readonly meshMap: Map<string, MeshEntry>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHover: (elementId: string | null) => void;
  readonly onModelReady: (yMin: number, yMax: number, centers: Map<string, THREE.Vector3>, views: Record<string, CameraView>) => void;
}

function SkeletonMeshes({
  meshMap,
  elementStates,
  onElementClick,
  onElementHover,
  onModelReady,
}: SkeletonMeshesProps) {
  const { scene } = useGLTF(MODEL_URL);
  const { gl } = useThree();
  const canvasRef = useRef<HTMLElement | null>(null);
  useEffect(() => { canvasRef.current = gl.domElement; }, [gl]);

  // Clone scene for mirrored left-side bones
  const mirroredScene = useMemo(() => scene.clone(true), [scene]);

  // Deep-clone all materials so we can color each mesh independently
  useLayoutEffect(() => {
    const cloneMaterials = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m: THREE.Material) => m.clone());
        } else {
          obj.material = (obj.material as THREE.Material).clone();
        }
      }
      for (const child of obj.children) cloneMaterials(child);
    };
    cloneMaterials(scene);
    cloneMaterials(mirroredScene);
  }, [scene, mirroredScene]);

  // Compute model metadata (bounds, bone centers, camera views) on first load
  useLayoutEffect(() => {
    const fullBox = new THREE.Box3().setFromObject(scene);
    const yMin = fullBox.min.y;
    const yMax = fullBox.max.y;

    // Bone centers (right-side meshes only for bilateral; midline for midline)
    const centers = new Map<string, THREE.Vector3>();
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.name) return;
      const key = toNodeKey(obj.name);
      const entry = meshMap.get(`original:${key}`);
      if (!entry) return;
      const box = new THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) centers.set(entry.elementId, box.getCenter(new THREE.Vector3()));
    });

    // Camera views
    const getBox = (names: ReadonlyArray<string>) => {
      const sanitized = names.map(n => toNodeKey(n));
      let box: THREE.Box3 | null = null;
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (sanitized.includes(toNodeKey(obj.name))) {
          const b = new THREE.Box3().setFromObject(obj);
          box = box ? box.union(b) : b;
        }
      });
      return box ?? new THREE.Box3();
    };

    const fullSymBox = symmetricBox(fullBox);
    const faceBones = ['Frontal bone', 'Parietal bone right', 'Parietal bone left', 'Cervical vertebrae (C4)'];
    const torsoBones = ['Manubrium of sternum', 'Body of sternum', 'Rib (1st).r', 'Rib (7th).r', 'Rib (12th).r', 'Thoracic vertebrae (T7)', 'Lumbar vertebrae (L3)', 'Hip bone.r'];
    const legBones = ['Femur.r', 'Tibia.r', 'Fibula.r', 'Patella.r', 'Distal phalanx of first finger of foot.r'];
    const handBones = ['1st metacarpal bone.r', '5th metacarpal bone.r', 'Capitate.r', 'Distal phalanx of 3d finger.r'];
    const footBones = ['Calcaneus.r', 'Talus.r', 'First metatarsal bone.r', 'Fifth metatarsal bone.r'];

    const fullBodyFront = frontView(fullSymBox, 1);
    const fullBodyFrontRaised = {
      position: fullBodyFront.position.clone().add(new THREE.Vector3(0, 0.15, 0)),
      target: fullBodyFront.target.clone(),
    };

    const views: Record<string, CameraView> = {
      full: fullBodyFrontRaised,
      back: backView(symmetricBox(getBox(['Frontal bone', 'Parietal bone right', 'Parietal bone left', 'Rib (12th).r', 'Thoracic vertebrae (T7)', 'Manubrium of sternum'])), 1.3),
      face: frontView(symmetricBox(getBox(faceBones)), 1.5),
      torso: frontView(symmetricBox(getBox(torsoBones)), 1.2),
      legs: frontView(symmetricBox(getBox(legBones)), 1.2),
      hand: frontView(getBox(handBones), 1.4),
      foot: (() => {
        const footBox = getBox(footBones);
        const fc = footBox.getCenter(new THREE.Vector3());
        const fs = footBox.getSize(new THREE.Vector3());
        const fd = Math.max(fs.x, fs.y, fs.z) * 2.5;
        return {
          position: new THREE.Vector3(fc.x, fc.y + fd * 0.55, fc.z + fd * 0.75),
          target: fc.clone(),
        };
      })(),
    };

    onModelReady(yMin, yMax, centers, views);
  }, [scene, meshMap, onModelReady]);

  // Apply colors to all meshes based on element states
  useEffect(() => {
    const applyColors = (obj: THREE.Object3D, sceneType: 'original' | 'mirrored') => {
      if (obj instanceof THREE.Mesh && obj.name) {
        const key = toNodeKey(obj.name);
        const entry = meshMap.get(`${sceneType}:${key}`);
        const state = entry ? elementStates[entry.elementId] : undefined;
        // Midline in mirrored scene: skip (handled in original scene, mirrored copy overlaps)
        if (sceneType === 'mirrored' && entry?.side === 'midline') return;
        const colors = entry ? stateColorSet(state) : CONTEXT_COLORS;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color.set(colors.mesh);
            mat.emissive.set(colors.emissive);
            mat.opacity = colors.opacity;
            mat.transparent = colors.opacity < 1;
          }
        }
      }
      for (const child of obj.children) applyColors(child, sceneType);
    };
    applyColors(scene, 'original');
    applyColors(mirroredScene, 'mirrored');
  }, [scene, mirroredScene, meshMap, elementStates]);

  // Drag detection (suppress click during camera drag)
  const dragRef = useRef({ startX: 0, startY: 0, wasDrag: false });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, wasDrag: false };
  }, []);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (dx * dx + dy * dy > 25) dragRef.current.wasDrag = true; // 5px threshold
  }, []);

  const handlePointerOver = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!e.object.name) return;
      const key = toNodeKey(e.object.name);
      // Try both original and mirrored to find which scene this mesh belongs to
      const entry = meshMap.get(`original:${key}`) ?? meshMap.get(`mirrored:${key}`);
      if (entry) {
        if (canvasRef.current) canvasRef.current.style.cursor = 'pointer';
        onElementHover(entry.elementId);
      }
    },
    [canvasRef, meshMap, onElementHover],
  );

  const handlePointerOut = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (canvasRef.current) canvasRef.current.style.cursor = 'default';
      onElementHover(null);
    },
    [canvasRef, onElementHover],
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (dragRef.current.wasDrag) return;
      e.stopPropagation();
      if (!e.object.name || !onElementClick) return;
      const key = toNodeKey(e.object.name);
      const entry = meshMap.get(`original:${key}`) ?? meshMap.get(`mirrored:${key}`);
      if (entry) onElementClick(entry.elementId);
    },
    [meshMap, onElementClick],
  );

  return (
    <>
      <primitive
        object={scene}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <group scale={[-1, 1, 1]}>
        <primitive
          object={mirroredScene}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        />
      </group>
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

interface SceneProps {
  readonly meshMap: Map<string, MeshEntry>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly elementLabels: ReadonlyArray<{ id: string; label: string; state: ElementVisualState | undefined }>;
  readonly onElementClick?: (elementId: string) => void;
  readonly animTarget: CameraView | null;
  readonly onAnimDone: () => void;
  readonly labelMode: 'off' | 'hover' | 'on';
  readonly onModelReady: (yMin: number, yMax: number, centers: Map<string, THREE.Vector3>, views: Record<string, CameraView>) => void;
}

function Scene({
  meshMap,
  elementStates,
  elementLabels,
  onElementClick,
  animTarget,
  onAnimDone,
  labelMode,
  onModelReady,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [yRange, setYRange] = useState({ yMin: 0, yMax: 1 });
  const [boneCenters, setBoneCenters] = useState<Map<string, THREE.Vector3>>(new Map());

  // Single callback: SkeletonMeshes calls this once with all model data so we
  // never capture stale boneCenters state (which caused an infinite re-render loop).
  const handleModelReady = useCallback(
    (yMin: number, yMax: number, centers: Map<string, THREE.Vector3>, views: Record<string, CameraView>) => {
      const full = views['full'];
      if (full) {
        camera.position.copy(full.position);
        const controls = controlsRef.current;
        if (controls) {
          controls.target.copy(full.target);
          controls.update();
        }
      }
      setYRange({ yMin, yMax });
      setBoneCenters(centers);
      onModelReady(yMin, yMax, centers, views);
    },
    [camera, onModelReady],
  );

  // Build label centers from boneCenters map + elementLabels
  const labelCenters = useMemo(() => {
    return elementLabels.flatMap(({ id, label, state }) => {
      const center = boneCenters.get(id);
      if (!center) return [];
      return [{ id, center, label, state }];
    });
  }, [elementLabels, boneCenters]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />
      <directionalLight position={[-5, -5, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <SkeletonMeshes
          meshMap={meshMap}
          elementStates={elementStates}
          onElementClick={onElementClick}
          onElementHover={setHoveredElementId}
          onModelReady={handleModelReady}
        />
      </Suspense>
      <OrbitControls ref={controlsRef} makeDefault />
      <CameraAnimator target={animTarget} controlsRef={controlsRef} onDone={onAnimDone} />
      <BoneLabels
        centers={labelCenters}
        yMin={yRange.yMin}
        yMax={yRange.yMax}
        hoveredElementId={hoveredElementId}
        labelMode={labelMode}
      />
    </>
  );
}

// ─── Camera preset sidebar ────────────────────────────────────────────────────

const PRESETS: ReadonlyArray<{ readonly key: string; readonly label: string; readonly hotkey: string }> = [
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

// ─── Main renderer ────────────────────────────────────────────────────────────

/**
 * 3D skeleton renderer implementing the VisualizationRendererProps contract.
 *
 * Toggle keys:
 *   labelMode (selectToggle): 'off' | 'hover' | 'on'
 */
export function Anatomy3DRenderer({
  elements,
  elementStates,
  onElementClick,
  toggles,
}: VisualizationRendererProps) {
  const [views, setViews] = useState<Record<string, CameraView>>({});
  const [animTarget, setAnimTarget] = useState<CameraView | null>(null);

  const meshMap = useMemo(() => buildMeshMap(elements), [elements]);

  // Label mode from toggles (select toggle value stored as string in a 'labelMode' key)
  // Fallback: 'hover' if not set
  const labelModeRaw = (toggles as Readonly<Record<string, string | boolean>>)['labelMode'];
  const labelMode: 'off' | 'hover' | 'on' =
    labelModeRaw === 'off' || labelModeRaw === 'hover' || labelModeRaw === 'on'
      ? labelModeRaw
      : 'hover';

  // Element labels for the label overlay
  const elementLabels = useMemo(
    () => elements.map((el) => ({ id: el.id, label: el.label, state: elementStates[el.id] })),
    [elements, elementStates],
  );

  const handleModelReady = useCallback(
    (_yMin: number, _yMax: number, _centers: Map<string, THREE.Vector3>, modelViews: Record<string, CameraView>) => {
      setViews(modelViews);
    },
    [],
  );

  const goToPreset = useCallback(
    (key: string) => {
      setAnimTarget(views[key] ?? null);
    },
    [views],
  );

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
      <nav className={styles.sidebar}>
        <span className={styles.sidebarHeading}>Camera</span>
        <div className={styles.presets}>
          {PRESETS.map(({ key, label, hotkey }) => (
            <button
              key={key}
              className={styles.presetButton}
              onClick={() => goToPreset(key)}
              disabled={Object.keys(views).length === 0}
              title={`${label} (${hotkey})`}
            >
              <span className={styles.presetLabel}>{label}</span>
              <kbd className={styles.hotkey}>{hotkey}</kbd>
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
          meshMap={meshMap}
          elementStates={elementStates}
          elementLabels={elementLabels}
          onElementClick={onElementClick}
          animTarget={animTarget}
          onAnimDone={() => setAnimTarget(null)}
          labelMode={labelMode}
          onModelReady={handleModelReady}
        />
      </Canvas>
    </div>
  );
}
