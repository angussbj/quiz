/**
 * Generate public/data/bones-3d/bones.csv from the GLB model.
 *
 * Columns:
 *   id              — kebab-case unique ID (includes side for bilateral bones)
 *   name            — human-readable display name
 *   mesh_name       — original GLB mesh name (always the .r or no-suffix version)
 *   x,y,z           — center in cm (GLB metres × 100)
 *   side            — right | left | midline
 *   direct_mesh     — true if the mesh is directly in the GLB (vs. left side via x-mirror)
 *   region          — skull | torso | limbs | hands | feet
 *   bone_type       — bone | teeth | costal_cartilage | sesamoid
 *   bilateral_partner   — partner element ID (empty for midline)
 *   group_representative — group rep ID for numbered series (e.g. all ribs share 'rib-1-right')
 *
 * Usage:
 *   node scripts/generateBones3dCsv.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── GLB parsing ──────────────────────────────────────────────────────────────

const GLB_PATH = resolve('public/data/bones-3d/overview-skeleton.glb');
const buf = readFileSync(GLB_PATH);

const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) throw new Error('Not a GLB file');

const chunk0Length = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

const IGNORE = new Set(['Bones', 'Bones_right', 'Cartilages_right', 'Armature', 'Scene']);

function getMeshBounds(meshIdx) {
  const mesh = gltf.meshes[meshIdx];
  if (!mesh) return null;
  let combined = null;
  for (const prim of mesh.primitives) {
    const posIdx = prim.attributes?.POSITION;
    if (posIdx == null) continue;
    const acc = gltf.accessors[posIdx];
    if (!acc?.min || !acc?.max) continue;
    if (!combined) {
      combined = { min: [...acc.min], max: [...acc.max] };
    } else {
      for (let i = 0; i < 3; i++) {
        combined.min[i] = Math.min(combined.min[i], acc.min[i]);
        combined.max[i] = Math.max(combined.max[i], acc.max[i]);
      }
    }
  }
  return combined;
}

const modelCenters = {}; // meshName → {cx, cy, cz} in metres

function traverseNode(nodeIdx, parentT = [0, 0, 0]) {
  const node = gltf.nodes[nodeIdx];
  if (!node) return;
  const t = node.translation ?? [0, 0, 0];
  const worldT = [parentT[0] + t[0], parentT[1] + t[1], parentT[2] + t[2]];
  const name = node.name ?? '';
  if (!IGNORE.has(name) && node.mesh != null) {
    const b = getMeshBounds(node.mesh);
    if (b) {
      modelCenters[name] = {
        cx: (b.min[0] + b.max[0]) / 2 + worldT[0],
        cy: (b.min[1] + b.max[1]) / 2 + worldT[1],
        cz: (b.min[2] + b.max[2]) / 2 + worldT[2],
      };
    }
  }
  for (const childIdx of node.children ?? []) {
    traverseNode(childIdx, worldT);
  }
}
for (const scene of gltf.scenes ?? []) {
  for (const nodeIdx of scene.nodes ?? []) {
    traverseNode(nodeIdx);
  }
}

// ─── Classification table ────────────────────────────────────────────────────
// Each entry: { meshName, id, name, side, directMesh, region, bone_type, numberedGroup }
// directMesh: true if the mesh is directly in the GLB (not generated via x-mirror).
//   Most right-side bones: directMesh=true. Left-side entries: directMesh=false (mirrored).
//   Exception: Parietal bone left/right — both are directly in the GLB.

const SCALE = 100; // metres → cm

const bones = [];

function toId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function addMidline(meshName, displayName, region, bone_type = 'bone', numberedGroup = '') {
  bones.push({ meshName, id: toId(displayName), name: displayName, side: 'midline', directMesh: true, region, bone_type, numberedGroup });
}

function addBilateral(meshName, displayName, region, bone_type = 'bone', numberedGroup = '') {
  // Right entry — uses .r mesh directly
  const rightId = toId(displayName + ' right');
  const leftId  = toId(displayName + ' left');
  bones.push({ meshName, id: rightId, name: displayName + ' (right)', side: 'right', directMesh: true,  region, bone_type, numberedGroup });
  bones.push({ meshName, id: leftId,  name: displayName + ' (left)',  side: 'left',  directMesh: false, region, bone_type, numberedGroup });
}

function addDirectBilateral(rightMeshName, leftMeshName, displayBase, region, bone_type = 'bone') {
  // Both meshes exist directly in the GLB (e.g. Parietal bone left/right)
  const rightId = toId(displayBase + ' right');
  const leftId  = toId(displayBase + ' left');
  bones.push({ meshName: rightMeshName, id: rightId, name: displayBase + ' (right)', side: 'right', directMesh: true, region, bone_type, numberedGroup: '' });
  bones.push({ meshName: leftMeshName,  id: leftId,  name: displayBase + ' (left)',  side: 'left',  directMesh: true, region, bone_type, numberedGroup: '' });
}

// ── Skull ──────────────────────────────────────────────────────────────────

addMidline('Frontal bone',                   'Frontal bone',                   'skull');
addDirectBilateral('Parietal bone right', 'Parietal bone left', 'Parietal bone', 'skull');
addMidline('Occipital bone',                 'Occipital bone',                  'skull');
addMidline('Ethmoid Bone',                   'Ethmoid bone',                   'skull');
addMidline('Sphenoid bone',                  'Sphenoid bone',                  'skull');
addMidline('Vomer',                          'Vomer',                          'skull');
addMidline('Mandible bone',                  'Mandible',                       'skull');

addBilateral('Temporal bone.r',             'Temporal bone',                  'skull');
addBilateral('Zygomatic bone.r',            'Zygomatic bone',                 'skull');
addBilateral('Nasal bone.r',                'Nasal bone',                     'skull');
addBilateral('Lacrimal bone.r',             'Lacrimal bone',                  'skull');
addBilateral('Maxilla bone.r',              'Maxilla',                        'skull');
addBilateral('Palatine bone.r',             'Palatine bone',                  'skull');
addBilateral('Inferior nasal concha bone.r','Inferior nasal concha',          'skull');

// ── Teeth ──────────────────────────────────────────────────────────────────

addBilateral('Upper medial incisor.r',      'Upper medial incisor',           'skull', 'teeth');
addBilateral('Upper lateral incisor.r',     'Upper lateral incisor',          'skull', 'teeth');
addBilateral('Upper canine.r',              'Upper canine',                   'skull', 'teeth');
addBilateral('Upper first premolar.r',      'Upper first premolar',           'skull', 'teeth');
addBilateral('Upper second premolar.r',     'Upper second premolar',          'skull', 'teeth');
addBilateral('Upper first molar tooth.r',   'Upper first molar',              'skull', 'teeth');
addBilateral('Upper second molar tooth.r',  'Upper second molar',             'skull', 'teeth');
addBilateral('Lower medial incisor.r',      'Lower medial incisor',           'skull', 'teeth');
addBilateral('Lower lateral incisor.r',     'Lower lateral incisor',          'skull', 'teeth');
addBilateral('Lower canine.r',              'Lower canine',                   'skull', 'teeth');
addBilateral('Lower first premolar.r',      'Lower first premolar',           'skull', 'teeth');
addBilateral('Lower second premolar.r',     'Lower second premolar',          'skull', 'teeth');
addBilateral('Lower first molar tooth.r',   'Lower first molar',              'skull', 'teeth');
addBilateral('Lower second molar tooth.r',  'Lower second molar',             'skull', 'teeth');

// ── Vertebral column ────────────────────────────────────────────────────────

addMidline('Atlas (C1)',                    'Atlas (C1)',                      'torso', 'bone', 'cervical-vertebra');
addMidline('Axis (C2)',                     'Axis (C2)',                       'torso', 'bone', 'cervical-vertebra');
addMidline('Cervical vertebrae (C3)',       'Cervical vertebra (C3)',          'torso', 'bone', 'cervical-vertebra');
addMidline('Cervical vertebrae (C4)',       'Cervical vertebra (C4)',          'torso', 'bone', 'cervical-vertebra');
addMidline('Cervical vertebrae (C5)',       'Cervical vertebra (C5)',          'torso', 'bone', 'cervical-vertebra');
addMidline('Cervical vertebrae (C6)',       'Cervical vertebra (C6)',          'torso', 'bone', 'cervical-vertebra');
addMidline('Cervical vertebrae (C7)',       'Cervical vertebra (C7)',          'torso', 'bone', 'cervical-vertebra');

for (let i = 1; i <= 12; i++) {
  addMidline(`Thoracic vertebrae (T${i})`, `Thoracic vertebra (T${i})`,      'torso', 'bone', 'thoracic-vertebra');
}
for (let i = 1; i <= 5; i++) {
  addMidline(`Lumbar vertebrae (L${i})`,   `Lumbar vertebra (L${i})`,        'torso', 'bone', 'lumbar-vertebra');
}
addMidline('Sacrum',                       'Sacrum',                          'torso');
addMidline('Coccyx',                       'Coccyx',                          'torso');

// ── Thorax ─────────────────────────────────────────────────────────────────

addMidline('Manubrium of sternum',         'Manubrium',                       'torso');
addMidline('Body of sternum',              'Body of sternum',                 'torso');

for (let i = 1; i <= 12; i++) {
  const ord = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'][i-1];
  addBilateral(`Rib (${ord}).r`,           `Rib ${i}`,                       'torso', 'bone', 'rib');
}

// Costal cartilages (only ribs 1–10 have cartilage in the model)
for (let i = 1; i <= 10; i++) {
  const ord = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'][i-1];
  addBilateral(`Costal cart of ${ord} rib.r`, `Costal cartilage of rib ${i}`, 'torso', 'costal_cartilage', 'costal-cartilage');
}

// ── Shoulder / upper limb ──────────────────────────────────────────────────

addBilateral('Clavicle.r',                 'Clavicle',                        'limbs');
addBilateral('Scapula.r.',                 'Scapula',                         'limbs'); // note trailing-dot typo in model
addBilateral('Humerus.r',                  'Humerus',                         'limbs');
addBilateral('Radius.r',                   'Radius',                          'limbs');
addBilateral('Ulna.r',                     'Ulna',                            'limbs');

// ── Pelvis ─────────────────────────────────────────────────────────────────

addBilateral('Hip bone.r',                 'Hip bone',                        'torso');

// ── Lower limb ─────────────────────────────────────────────────────────────

addBilateral('Femur.r',                    'Femur',                           'limbs');
addBilateral('Patella.r',                  'Patella',                         'limbs');
addBilateral('Tibia.r',                    'Tibia',                           'limbs');
addBilateral('Fibula.r',                   'Fibula',                          'limbs');

// ── Carpals ────────────────────────────────────────────────────────────────

addBilateral('Scaphoid.r',                 'Scaphoid',                        'hands');
addBilateral('Lunate bone.r',              'Lunate',                          'hands');
addBilateral('Triquetrum.r',               'Triquetrum',                      'hands');
addBilateral('Pisiform.r',                 'Pisiform',                        'hands');
addBilateral('Trapezium.r',                'Trapezium',                       'hands');
addBilateral('Trapezoid.r',                'Trapezoid',                       'hands');
addBilateral('Capitate.r',                 'Capitate',                        'hands');
addBilateral('Hamate.r',                   'Hamate',                          'hands');

// ── Metacarpals ────────────────────────────────────────────────────────────

const fingerOrd = ['1st','2nd','3rd','4th','5th'];
for (let i = 1; i <= 5; i++) {
  addBilateral(`${fingerOrd[i-1]} metacarpal bone.r`, `Metacarpal ${i}`,     'hands', 'bone', 'metacarpal');
}

// ── Finger phalanges ────────────────────────────────────────────────────────
// 1st finger has only proximal and distal (no middle)

addBilateral('Proximal phalanx of 1st finger.r', 'Proximal phalanx of finger 1', 'hands', 'bone', 'proximal-finger-phalanx');
for (let i = 2; i <= 5; i++) {
  const ord = ['2d','3rd','4th','5th'][i-2];
  addBilateral(`Proximal phalanx of ${ord} finger.r`, `Proximal phalanx of finger ${i}`, 'hands', 'bone', 'proximal-finger-phalanx');
}
addBilateral('Distal phalanx of 1st finger.r', 'Distal phalanx of finger 1', 'hands', 'bone', 'distal-finger-phalanx');
for (let i = 2; i <= 5; i++) {
  const ord = ['2d','3rd','4th','5th'][i-2];
  addBilateral(`Middle phalanx of ${ord} finger.r`, `Middle phalanx of finger ${i}`, 'hands', 'bone', 'middle-finger-phalanx');
  // Note: GLB uses "3d" (not "3rd") for the 3rd finger distal phalanx
  const distalOrd = ord === '3rd' ? '3d' : ord;
  addBilateral(`Distal phalanx of ${distalOrd} finger.r`, `Distal phalanx of finger ${i}`, 'hands', 'bone', 'distal-finger-phalanx');
}

addBilateral('Sesamoid_bones_of_hand.r',   'Sesamoid bones of hand',          'hands', 'sesamoid');

// ── Tarsals ─────────────────────────────────────────────────────────────────

addBilateral('Calcaneus.r',                'Calcaneus',                       'feet');
addBilateral('Talus.r',                    'Talus',                           'feet');
addBilateral('Navicular bone.r',           'Navicular',                       'feet');
addBilateral('Medial cuneiform bone.r',    'Medial cuneiform',                'feet');
addBilateral('Intermediate cuneiform bone.r','Intermediate cuneiform',        'feet');
addBilateral('Lateral cuneiform bone.r',   'Lateral cuneiform',               'feet');
addBilateral('Cuboid bone.r',              'Cuboid',                          'feet');

// ── Metatarsals ─────────────────────────────────────────────────────────────

const toeOrd = ['First','Second','Third','Fourth','Fifth'];
for (let i = 1; i <= 5; i++) {
  addBilateral(`${toeOrd[i-1]} metatarsal bone.r`, `Metatarsal ${i}`,        'feet', 'bone', 'metatarsal');
}

// ── Toe phalanges ───────────────────────────────────────────────────────────
// Big toe (1st) has no middle phalanx

const toeWordOrd = ['first','second','third','fourth','fifth'];
addBilateral('Proximal phalanx of first finger of foot.r',  'Proximal phalanx of toe 1', 'feet', 'bone', 'proximal-toe-phalanx');
addBilateral('Distal phalanx of first finger of foot.r',    'Distal phalanx of toe 1',   'feet', 'bone', 'distal-toe-phalanx');
for (let i = 2; i <= 5; i++) {
  const w = toeWordOrd[i-1];
  addBilateral(`Proximal phalanx of ${w} finger of foot.r`, `Proximal phalanx of toe ${i}`, 'feet', 'bone', 'proximal-toe-phalanx');
  addBilateral(`Middle phalanx of ${w} finger of foot.r`,   `Middle phalanx of toe ${i}`,   'feet', 'bone', 'middle-toe-phalanx');
  addBilateral(`Distal phalanx of ${w} finger of foot.r`,   `Distal phalanx of toe ${i}`,   'feet', 'bone', 'distal-toe-phalanx');
}

addBilateral('Sesamoid bones of foot.r',   'Sesamoid bones of foot',          'feet', 'sesamoid');

// ─── Verify all meshes were classified ─────────────────────────────────────

const classifiedMeshNames = new Set(bones.map(b => b.meshName));
const missing = Object.keys(modelCenters).filter(n => !classifiedMeshNames.has(n));
if (missing.length > 0) {
  console.error('WARNING: unclassified meshes:', missing);
}

// ─── Build final rows with coordinates and group_representative ─────────────

// For numbered groups, the representative is the first right-side (or midline) entry in that group
const groupReps = {}; // groupName → representative id
for (const b of bones) {
  if (b.numberedGroup) {
    if (!groupReps[b.numberedGroup]) {
      // Prefer right-side as representative; fall back to midline if no right-side exists
      if (b.side === 'right' || b.side === 'midline') {
        groupReps[b.numberedGroup] = b.id;
      }
    } else if (groupReps[b.numberedGroup] && b.side === 'right') {
      // Upgrade from midline to right-side representative
      const repIsMiddline = bones.find(x => x.id === groupReps[b.numberedGroup])?.side === 'midline';
      if (repIsMiddline) groupReps[b.numberedGroup] = b.id;
    }
  }
}

// Build bilateral partner map
const bilateralPartnerOf = {}; // id → partnerId
for (const b of bones) {
  if (b.side !== 'midline') {
    // Find the opposite side
    const oppSide = b.side === 'right' ? 'left' : 'right';
    const partnerId = b.id.endsWith('-right')
      ? b.id.replace(/-right$/, '-left')
      : b.id.replace(/-left$/, '-right');
    const partner = bones.find(o => o.meshName === b.meshName && o.side === oppSide) ??
      bones.find(o => o.id === partnerId);
    if (partner) bilateralPartnerOf[b.id] = partner.id;
  }
}

// Build CSV rows
const rows = bones.map(b => {
  const center = modelCenters[b.meshName];
  let x = 0, y = 0, z = 0;
  if (center) {
    x = center.cx * SCALE;
    y = center.cy * SCALE;
    z = center.cz * SCALE;
    // For left-side bones (directMesh=false, side='left'), mirror x
    if (b.side === 'left' && !b.directMesh) {
      x = -x;
    }
  } else {
    console.error(`WARNING: no center data for mesh "${b.meshName}" (${b.id})`);
  }

  return {
    id:                  b.id,
    name:                b.name,
    mesh_name:           b.meshName,
    x:                   x.toFixed(2),
    y:                   y.toFixed(2),
    z:                   z.toFixed(2),
    side:                b.side,
    direct_mesh:         b.directMesh ? 'true' : 'false',
    region:              b.region,
    bone_type:           b.bone_type,
    bilateral_partner:   bilateralPartnerOf[b.id] ?? '',
    group_representative: b.numberedGroup ? (groupReps[b.numberedGroup] ?? '') : '',
  };
});

// ─── Write CSV ───────────────────────────────────────────────────────────────

const COLS = ['id','name','mesh_name','x','y','z','side','direct_mesh','region','bone_type','bilateral_partner','group_representative'];

function escCsv(v) {
  if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return String(v);
}

const lines = [
  COLS.join(','),
  ...rows.map(r => COLS.map(c => escCsv(r[c])).join(',')),
];

const outPath = resolve('public/data/bones-3d/bones.csv');
writeFileSync(outPath, lines.join('\n') + '\n');
console.log(`Wrote ${rows.length} rows to ${outPath}`);
