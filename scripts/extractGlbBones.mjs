/**
 * Extract bone names and bounding-box centers from the GLB file.
 * Outputs a JSON array of { name, cx, cy, cz } objects in model units (metres).
 *
 * Usage:
 *   node scripts/extractGlbBones.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const GLB_PATH = resolve('public/data/bones-3d/overview-skeleton.glb');

const buf = readFileSync(GLB_PATH);

// --- Parse GLB header ----------------------------------------------------------
// Magic (4) + version (4) + length (4)
const magic = buf.readUInt32LE(0);
if (magic !== 0x46546c67) throw new Error('Not a GLB file');

// Chunk 0 must be JSON
const chunk0Length = buf.readUInt32LE(12);
const chunk0Type   = buf.readUInt32LE(16);
if (chunk0Type !== 0x4e4f534a) throw new Error('First chunk is not JSON');

const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
const gltf    = JSON.parse(jsonStr);

// Chunk 1 is binary (optional)
const chunk1Start  = 20 + chunk0Length;
let   binChunk     = null;
if (chunk1Start + 8 <= buf.length) {
  const chunk1Length = buf.readUInt32LE(chunk1Start);
  const chunk1Type   = buf.readUInt32LE(chunk1Start + 4);
  if (chunk1Type === 0x004e4942) {
    binChunk = buf.subarray(chunk1Start + 8, chunk1Start + 8 + chunk1Length);
  }
}

// --- Helpers ------------------------------------------------------------------

/** Read a float32 at a byte offset in the binary chunk. */
function readF32(offset) {
  return binChunk.readFloatLE(offset);
}

/** Get the POSITION accessor min/max for a primitive. Returns null if missing. */
function getPrimitiveBounds(primitive) {
  const posIdx = primitive.attributes?.POSITION;
  if (posIdx == null) return null;
  const acc = gltf.accessors[posIdx];
  if (!acc?.min || !acc?.max) return null;
  return { min: acc.min, max: acc.max };
}

/** Get combined bounds for a mesh (union of all primitives). */
function getMeshBounds(meshIdx) {
  const mesh = gltf.meshes[meshIdx];
  if (!mesh) return null;
  let combined = null;
  for (const prim of mesh.primitives) {
    const b = getPrimitiveBounds(prim);
    if (!b) continue;
    if (!combined) {
      combined = { min: [...b.min], max: [...b.max] };
    } else {
      for (let i = 0; i < 3; i++) {
        combined.min[i] = Math.min(combined.min[i], b.min[i]);
        combined.max[i] = Math.max(combined.max[i], b.max[i]);
      }
    }
  }
  return combined;
}

// --- Traverse nodes -----------------------------------------------------------

const IGNORE_NAMES = new Set(['Bones', 'Bones_right', 'Cartilages_right', 'Armature', 'Scene']);

const results = [];

function traverseNode(nodeIdx, parentTranslation = [0, 0, 0]) {
  const node = gltf.nodes[nodeIdx];
  if (!node) return;

  // Accumulate translation only (nodes in this model have no rotation/scale)
  const t = node.translation ?? [0, 0, 0];
  const worldT = [
    parentTranslation[0] + t[0],
    parentTranslation[1] + t[1],
    parentTranslation[2] + t[2],
  ];

  const name = node.name ?? '';

  if (!IGNORE_NAMES.has(name) && node.mesh != null) {
    const bounds = getMeshBounds(node.mesh);
    if (bounds) {
      const cx = (bounds.min[0] + bounds.max[0]) / 2 + worldT[0];
      const cy = (bounds.min[1] + bounds.max[1]) / 2 + worldT[1];
      const cz = (bounds.min[2] + bounds.max[2]) / 2 + worldT[2];
      results.push({ name, cx, cy, cz });
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

// Sort by y descending (skull → feet)
results.sort((a, b) => b.cy - a.cy);

// Pretty-print
for (const r of results) {
  const name = r.name.padEnd(50);
  const cx = r.cx.toFixed(4).padStart(8);
  const cy = r.cy.toFixed(4).padStart(8);
  const cz = r.cz.toFixed(4).padStart(8);
  console.log(`${name}  cx=${cx}  cy=${cy}  cz=${cz}`);
}

console.error(`\nTotal: ${results.length} bone meshes`);
