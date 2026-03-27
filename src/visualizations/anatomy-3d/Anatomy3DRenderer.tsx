/**
 * Anatomy3DRenderer — React Three Fiber renderer for the 3D human skeleton quiz.
 * See docs/anatomy-3d-renderer.md for architecture, label visibility rules, and color mapping.
 */
import {
  Suspense,
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
      return { mesh: resolveVar('--color-bone-default', '#e4ccb1'), emissive: '#000000', opacity: 1 };
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
      return { mesh: resolveVar('--color-bone-default', '#e4ccb1'), emissive: '#000000', opacity: 1 };
  }
}

/** Default bone color (shown for meshes not part of the active quiz). */
const CONTEXT_COLORS: ColorSet = { mesh: '#c8bba8', emissive: '#000000', opacity: 0.5 };

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
 *
 * Grouped elements (bilateral/numbered) have multiple meshEntries — each maps
 * to the same element ID so they all color, click, and label identically.
 */
function buildMeshMap(
  elements: VisualizationRendererProps['elements'],
): Map<string, MeshEntry> {
  const map = new Map<string, MeshEntry>();
  for (const el of elements) {
    if (!isAnatomy3DElement(el)) continue;
    for (const entry of el.meshEntries) {
      const key = toNodeKey(entry.meshName);
      if (entry.side === 'midline') {
        map.set(`original:${key}`, { elementId: el.id, side: 'midline', directMesh: true });
      } else if (entry.side === 'right') {
        map.set(`original:${key}`, { elementId: el.id, side: 'right', directMesh: entry.directMesh });
      } else {
        // left
        if (entry.directMesh) {
          map.set(`original:${key}`, { elementId: el.id, side: 'left', directMesh: true });
        } else {
          map.set(`mirrored:${key}`, { elementId: el.id, side: 'left', directMesh: false });
        }
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

/** Compute camera distance to fit box in view, accounting for canvas aspect ratio.
 *  PerspectiveCamera FOV is vertical — for portrait canvases the horizontal FOV is
 *  narrower, so wide objects need the camera further back. */
function fitDistance(size: THREE.Vector3, aspect: number, padding: number): number {
  const vFovRad = ((FOV_DEG / 2) * Math.PI) / 180;
  const distY = (size.y / 2) / Math.tan(vFovRad);
  const hFovRad = Math.atan(aspect * Math.tan(vFovRad));
  const distX = (size.x / 2) / Math.tan(hFovRad);
  return Math.max(distX, distY) * padding;
}

function frontView(box: THREE.Box3, aspect: number, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dist = fitDistance(size, aspect, padding);
  return {
    position: new THREE.Vector3(center.x, center.y, center.z + dist),
    target: center.clone(),
  };
}

function backView(box: THREE.Box3, aspect: number, padding = 1.4): CameraView {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dist = fitDistance(size, aspect, padding);
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
  readonly scale?: number;
}

function BoneLabel({ center, text, scale = 1 }: BoneLabelProps) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  const { texture, aspect } = useMemo(() => makeLabelTexture(text), [text]);
  const dirScratch = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!spriteRef.current) return;
    dirScratch.current.subVectors(camera.position, center).normalize();
    spriteRef.current.position.copy(center).addScaledVector(dirScratch.current, LABEL_OFFSET);
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
  readonly centers: ReadonlyArray<{ id: string; center: THREE.Vector3; label: string; state: ElementVisualState | undefined; meshKey: string }>;
  readonly yMin: number;
  readonly yMax: number;
  readonly hoveredElementId: string | null;
  readonly labelMode: 'off' | 'hover' | 'on';
}

/** Should this element's label be visible given its state and the label mode?
 *  Labels only appear for answered/resolved states — never for default/highlighted/hidden
 *  (those would reveal answers). The label mode controls noise reduction among the
 *  already-answered labels: 'on' shows all, 'hover' shows only the hovered one, 'off' hides all. */
function shouldShowBoneLabel(
  state: ElementVisualState | undefined,
  labelMode: 'off' | 'hover' | 'on',
  id: string,
  hoveredElementId: string | null,
): boolean {
  if (labelMode === 'off') return false;
  // Only answered/resolved states can show labels
  if (state !== 'correct' && state !== 'correct-second' && state !== 'correct-third' &&
      state !== 'incorrect' && state !== 'missed' && state !== 'context') {
    return false;
  }
  if (labelMode === 'on') return true;
  // 'hover': only show the hovered bone's label
  return id === hoveredElementId;
}

function BoneLabels({ centers, yMin, yMax, hoveredElementId, labelMode }: BoneLabelsProps) {
  return (
    <>
      {centers.map(({ id, center, label, state, meshKey }) => {
        if (!shouldShowBoneLabel(state, labelMode, id, hoveredElementId)) return null;
        const sc = zoneScale(center, yMin, yMax);
        return <BoneLabel key={meshKey} center={center} text={label} scale={sc} />;
      })}
    </>
  );
}

// ─── SkeletonMeshes (the model + coloring) ────────────────────────────────────

/** Per-mesh center used for label placement. Grouped elements have multiple entries. */
interface MeshCenter {
  readonly elementId: string;
  readonly center: THREE.Vector3;
}

interface SkeletonMeshesProps {
  readonly meshMap: Map<string, MeshEntry>;
  readonly elementStates: Readonly<Record<string, ElementVisualState>>;
  readonly onElementClick?: (elementId: string) => void;
  readonly onElementHover: (elementId: string | null) => void;
  readonly onModelReady: (yMin: number, yMax: number, centers: Map<string, MeshCenter>, views: Record<string, CameraView>) => void;
}

function SkeletonMeshes({
  meshMap,
  elementStates,
  onElementClick,
  onElementHover,
  onModelReady,
}: SkeletonMeshesProps) {
  const { scene } = useGLTF(MODEL_URL);
  const { gl, viewport } = useThree();
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
    const aspect = viewport.aspect || 1;
    const fullBox = new THREE.Box3().setFromObject(scene);
    const yMin = fullBox.min.y;
    const yMax = fullBox.max.y;

    // Bone centers: one entry per mesh (not per element) so grouped elements
    // get a label at each constituent mesh position.
    // Key: "elementId:original:meshKey" or "elementId:mirrored:meshKey"
    const centers = new Map<string, { elementId: string; center: THREE.Vector3 }>();
    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.name) return;
      const key = toNodeKey(obj.name);
      const origEntry = meshMap.get(`original:${key}`);
      if (origEntry) {
        const box = new THREE.Box3().setFromObject(obj);
        if (!box.isEmpty()) {
          const c = box.getCenter(new THREE.Vector3());
          centers.set(`${origEntry.elementId}:original:${key}`, { elementId: origEntry.elementId, center: c });
          // If this mesh also has a mirrored entry, add a mirrored center
          const mirEntry = meshMap.get(`mirrored:${key}`);
          if (mirEntry) {
            centers.set(`${mirEntry.elementId}:mirrored:${key}`, {
              elementId: mirEntry.elementId,
              center: new THREE.Vector3(-c.x, c.y, c.z),
            });
          }
        }
      }
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

    const fullBodyFront = frontView(fullSymBox, aspect, 1.2);
    const fullBodyFrontRaised = {
      position: fullBodyFront.position.clone().add(new THREE.Vector3(0, 0.08, 0)),
      target: fullBodyFront.target.clone(),
    };

    const views: Record<string, CameraView> = {
      full: fullBodyFrontRaised,
      back: backView(symmetricBox(getBox(['Frontal bone', 'Parietal bone right', 'Parietal bone left', 'Rib (12th).r', 'Thoracic vertebrae (T7)', 'Manubrium of sternum'])), aspect, 1.3),
      face: frontView(symmetricBox(getBox(faceBones)), aspect, 1.5),
      torso: frontView(symmetricBox(getBox(torsoBones)), aspect, 1.2),
      legs: frontView(symmetricBox(getBox(legBones)), aspect, 1.2),
      hand: frontView(getBox(handBones), aspect, 1.4),
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- viewport.aspect is read at init; re-running on resize would recompute all bone data
  }, [scene, meshMap, onModelReady]);

  // Apply colors to all meshes based on element states.
  // The mirrored scene only renders meshes with `mirrored:` entries — all others
  // are hidden to prevent z-fighting with the original scene.
  useEffect(() => {
    const applyMeshColors = (obj: THREE.Mesh, colors: ColorSet) => {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.color.set(colors.mesh);
          mat.emissive.set(colors.emissive);
          mat.opacity = colors.opacity;
          mat.transparent = colors.opacity < 1;
        }
      }
      obj.visible = true;
    };

    const hideMesh = (obj: THREE.Mesh) => {
      obj.visible = false;
    };

    const applyColors = (obj: THREE.Object3D, sceneType: 'original' | 'mirrored') => {
      if (obj instanceof THREE.Mesh && obj.name) {
        const key = toNodeKey(obj.name);
        if (sceneType === 'mirrored') {
          // Mirrored scene visibility rules:
          // 1. Has mirrored: entry → show with quiz state (left-side bone via x-flip)
          // 2. Has original: entry but no mirrored: → hide (midline/direct-mesh already in original)
          // 3. No entry at all → non-quiz context bone, show mirrored for symmetry
          const mirroredEntry = meshMap.get(`mirrored:${key}`);
          if (mirroredEntry) {
            const state = elementStates[mirroredEntry.elementId];
            applyMeshColors(obj, stateColorSet(state));
          } else if (meshMap.has(`original:${key}`)) {
            hideMesh(obj);
          } else {
            applyMeshColors(obj, CONTEXT_COLORS);
          }
        } else {
          // Original scene: quiz elements get state colors, non-quiz get context colors
          const entry = meshMap.get(`original:${key}`);
          const colors = entry ? stateColorSet(elementStates[entry.elementId]) : CONTEXT_COLORS;
          applyMeshColors(obj, colors);
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
  readonly onElementHoverStart?: (elementId: string) => void;
  readonly onElementHoverEnd?: () => void;
  readonly animTarget: CameraView | null;
  readonly onAnimDone: () => void;
  readonly onPutInViewTarget: (view: CameraView) => void;
  readonly putInView?: ReadonlyArray<string>;
  readonly labelMode: 'off' | 'hover' | 'on';
  readonly onModelReady: (yMin: number, yMax: number, centers: Map<string, MeshCenter>, views: Record<string, CameraView>) => void;
}

function Scene({
  meshMap,
  elementStates,
  elementLabels,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  animTarget,
  onAnimDone,
  onPutInViewTarget,
  putInView,
  labelMode,
  onModelReady,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, viewport } = useThree();
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const handleElementHover = useCallback((elementId: string | null) => {
    setHoveredElementId(elementId);
    if (elementId) {
      onElementHoverStart?.(elementId);
    } else {
      onElementHoverEnd?.();
    }
  }, [onElementHoverStart, onElementHoverEnd]);
  const [yRange, setYRange] = useState({ yMin: 0, yMax: 1 });
  const [meshCenters, setMeshCenters] = useState<Map<string, MeshCenter>>(new Map());

  // Pending initial camera view: set by handleModelReady, applied by useEffect
  // after OrbitControls has mounted. When the GLB is cached, SkeletonMeshes'
  // useLayoutEffect fires before OrbitControls' ref is set (sibling ordering),
  // so we can't apply the view inline — we defer to a useEffect.
  const pendingViewRef = useRef<CameraView | null>(null);

  const handleModelReady = useCallback(
    (yMin: number, yMax: number, centers: Map<string, MeshCenter>, views: Record<string, CameraView>) => {
      const full = views['full'];
      if (full) {
        pendingViewRef.current = full;
      }
      setYRange({ yMin, yMax });
      setMeshCenters(centers);
      onModelReady(yMin, yMax, centers, views);
    },
    [onModelReady],
  );

  // Apply the initial camera view once OrbitControls is available.
  // useEffect runs after all useLayoutEffects (including OrbitControls' ref setup).
  useEffect(() => {
    const view = pendingViewRef.current;
    if (!view) return;
    const controls = controlsRef.current;
    if (!controls) return;
    pendingViewRef.current = null;
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  });

  // Build label centers: one per mesh position, keyed by the meshCenter map key
  // so each constituent mesh in a grouped element gets its own label sprite.
  const labelCenters = useMemo(() => {
    const labelMap = new Map<string, { label: string; state: ElementVisualState | undefined }>();
    for (const { id, label, state } of elementLabels) {
      labelMap.set(id, { label, state });
    }
    const result: Array<{ id: string; center: THREE.Vector3; label: string; state: ElementVisualState | undefined; meshKey: string }> = [];
    for (const [meshKey, { elementId, center }] of meshCenters) {
      const info = labelMap.get(elementId);
      if (!info) continue;
      result.push({ id: elementId, center, label: info.label, state: info.state, meshKey });
    }
    return result;
  }, [elementLabels, meshCenters]);

  // putInView: animate camera to frame target element(s).
  // Computes a front-facing view that comfortably frames the bone(s).
  const putInViewLatestRef = useRef({ meshCenters, viewport });
  putInViewLatestRef.current = { meshCenters, viewport };

  useEffect(() => {
    if (!putInView || putInView.length === 0) return;
    const { meshCenters: centers, viewport: vp } = putInViewLatestRef.current;
    if (centers.size === 0) return;

    const targetCenters: Array<THREE.Vector3> = [];
    for (const [, { elementId, center }] of centers) {
      if (putInView.includes(elementId)) {
        targetCenters.push(center);
      }
    }
    if (targetCenters.length === 0) return;

    // Build bounding box from centers, then expand generously — centers are
    // single points, not mesh volumes, so the actual bone extends well beyond.
    const box = new THREE.Box3();
    for (const c of targetCenters) {
      box.expandByPoint(c);
    }
    box.expandByScalar(0.12);

    const view = frontView(symmetricBox(box), vp.aspect || 1, 1.8);
    onPutInViewTarget(view);
  }, [putInView, onPutInViewTarget]);

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
          onElementHover={handleElementHover}
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
 * Label mode is managed locally in the sidebar (not a quiz toggle)
 * to keep it close to the 3D viewport. Labels respect element state
 * visibility rules (element-states.md) to avoid revealing answers.
 */
export function Anatomy3DRenderer({
  elements,
  elementStates,
  onElementClick,
  onElementHoverStart,
  onElementHoverEnd,
  putInView,
}: VisualizationRendererProps) {
  const [views, setViews] = useState<Record<string, CameraView>>({});
  const [modelReady, setModelReady] = useState(false);
  const [animTarget, setAnimTarget] = useState<CameraView | null>(null);
  const [labelMode, setLabelMode] = useState<'off' | 'hover' | 'on'>('hover');

  const meshMap = useMemo(() => buildMeshMap(elements), [elements]);

  // Element labels for the label overlay
  const elementLabels = useMemo(
    () => elements.map((el) => ({ id: el.id, label: el.label, state: elementStates[el.id] })),
    [elements, elementStates],
  );

  const handleModelReady = useCallback(
    (_yMin: number, _yMax: number, _centers: Map<string, MeshCenter>, modelViews: Record<string, CameraView>) => {
      setViews(modelViews);
      setModelReady(true);
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
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
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
          <a href="https://anatomytool.org/content/open3dmodel-skeleton-english-labels" target="_blank" rel="noopener noreferrer">Open3DModel - Skeleton</a>
          {' by '}
          <a href="https://anatomytool.org/open3Dmodel-about" target="_blank" rel="noopener noreferrer">Open3D project</a>
          {', '}
          <a href="https://www.researchgate.net/profile/George-Maat" target="_blank" rel="noopener noreferrer">George J.R. Maat</a>
          {', LUMC, '}
          <a href="https://www.eungyeol-lee.com/" target="_blank" rel="noopener noreferrer">Eungyeol Lee</a>
          {', LUMC et al, '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA</a>
        </div>
      </nav>

      <Canvas
        className={styles.canvas}
        style={modelReady ? undefined : { visibility: 'hidden' }}
        camera={{ position: [0, 0, 3], fov: FOV_DEG }}
        gl={{ antialias: true }}
      >
        <Scene
          meshMap={meshMap}
          elementStates={elementStates}
          elementLabels={elementLabels}
          onElementClick={onElementClick}
          onElementHoverStart={onElementHoverStart}
          onElementHoverEnd={onElementHoverEnd}
          animTarget={animTarget}
          onAnimDone={() => setAnimTarget(null)}
          onPutInViewTarget={setAnimTarget}
          putInView={putInView}
          labelMode={labelMode}
          onModelReady={handleModelReady}
        />
      </Canvas>
    </div>
  );
}
