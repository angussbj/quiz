/**
 * Fix rib path groupings in human-bones.csv by re-extracting from the source SVG.
 *
 * The source SVG (Human_skeleton_front_en.svg) has style attributes that distinguish
 * main rib outlines (#967348 stroke) from shading/detail paths. The original extraction
 * mis-grouped some paths between adjacent ribs. This script:
 *
 * 1. Parses the source SVG to find the rib group (g845)
 * 2. Identifies main outline paths by their #967348 stroke color
 * 3. Clusters main paths by side (L/R) and Y-position using gap-based clustering
 * 4. Assigns detail paths to the nearest main-path cluster
 * 5. Updates only the rib rows in the CSV (preserving all other data)
 *
 * Usage: node scripts/fixRibPaths.mjs [/path/to/Human_skeleton_front_en.svg]
 */

import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'public/data/science/biology/human-bones.csv';
const SVG_PATH = process.argv[2] || '/tmp/Human_skeleton_front_en.svg';

// ---- CSV helpers ----

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

function toCSVField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

// ---- SVG parsing (regex-based, no DOM dependency) ----

function extractRibPaths(svgContent) {
  // Find the g845 group content
  const g845Match = svgContent.match(/<g[^>]*id="g845"[^>]*>([\s\S]*?)<\/g>/);
  if (!g845Match) {
    // Try nested search - g845 might contain nested groups
    const g845Start = svgContent.indexOf('id="g845"');
    if (g845Start === -1) {
      console.error('Could not find g845 in SVG');
      process.exit(1);
    }
    // Find the opening <g tag
    let tagStart = svgContent.lastIndexOf('<g', g845Start);
    // Count nesting to find the closing </g>
    let depth = 0;
    let pos = tagStart;
    let groupContent = '';
    while (pos < svgContent.length) {
      if (svgContent.startsWith('<g', pos)) {
        depth++;
        const closeAngle = svgContent.indexOf('>', pos);
        pos = closeAngle + 1;
      } else if (svgContent.startsWith('</g>', pos)) {
        depth--;
        if (depth === 0) {
          groupContent = svgContent.slice(tagStart, pos + 4);
          break;
        }
        pos += 4;
      } else {
        pos++;
      }
    }
    return extractPathsFromGroup(groupContent);
  }
  return extractPathsFromGroup(g845Match[0]);
}

function extractPathsFromGroup(groupContent) {
  const paths = [];
  const pathRegex = /<path[^>]*>/g;
  let match;
  while ((match = pathRegex.exec(groupContent)) !== null) {
    const tag = match[0];
    const dMatch = tag.match(/\bd="([^"]*)"/);
    const styleMatch = tag.match(/\bstyle="([^"]*)"/);
    if (dMatch) {
      paths.push({
        d: dMatch[1],
        style: styleMatch ? styleMatch[1] : '',
      });
    }
  }
  return paths;
}

// ---- BBox ----

function pathBBox(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i]), y = parseFloat(nums[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return null;
  return {
    minX, maxX, minY, maxY,
    midX: (minX + maxX) / 2,
    midY: (minY + maxY) / 2,
    height: maxY - minY,
    width: maxX - minX,
  };
}

// ---- Clustering ----

function clusterByYGaps(paths, numClusters) {
  if (paths.length <= numClusters) {
    return paths.map(p => [p]);
  }

  const sorted = [...paths].sort((a, b) => a.bbox.midY - b.bbox.midY);

  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push({ gap: sorted[i].bbox.midY - sorted[i - 1].bbox.midY, index: i });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  const boundaries = gaps.slice(0, numClusters - 1).map(g => g.index).sort((a, b) => a - b);

  const clusters = [];
  let prev = 0;
  for (const b of boundaries) {
    clusters.push(sorted.slice(prev, b));
    prev = b;
  }
  clusters.push(sorted.slice(prev));
  return clusters;
}

// ---- Main ----

console.log(`Reading SVG: ${SVG_PATH}`);
const svgContent = readFileSync(SVG_PATH, 'utf-8');

const rawPaths = extractRibPaths(svgContent);
console.log(`Found ${rawPaths.length} paths in rib group`);

const MIDLINE_X = 203.0;
const BONE_STROKE = '#967348';

// Classify all paths
const allPaths = rawPaths.map(p => {
  const bbox = pathBBox(p.d);
  const isMain = p.style.includes(BONE_STROKE);
  const side = bbox ? (bbox.midX < MIDLINE_X ? 'L' : 'R') : 'L';
  return { ...p, bbox, isMain, side };
}).filter(p => p.bbox);

const mainPaths = allPaths.filter(p => p.isMain);
const detailPaths = allPaths.filter(p => !p.isMain);

console.log(`Main outline paths: ${mainPaths.length}`);
console.log(`Detail/shading paths: ${detailPaths.length}`);

// Cluster main paths by side
const leftMain = mainPaths.filter(p => p.side === 'L');
const rightMain = mainPaths.filter(p => p.side === 'R');

console.log(`Left main: ${leftMain.length}, Right main: ${rightMain.length}`);

const leftClusters = clusterByYGaps(leftMain, 12);
const rightClusters = clusterByYGaps(rightMain, 12);

console.log(`Left clusters: ${leftClusters.length}, Right clusters: ${rightClusters.length}`);

// Build rib assignments
const ribPaths = {};
for (let i = 1; i <= 12; i++) ribPaths[i] = [];

// Add main paths
for (let i = 0; i < leftClusters.length; i++) {
  const ribNum = i + 1;
  const centerY = leftClusters[i].reduce((s, p) => s + p.bbox.midY, 0) / leftClusters[i].length;
  console.log(`Rib ${ribNum} L: ${leftClusters[i].length} main paths, centerY=${centerY.toFixed(1)}`);
  for (const p of leftClusters[i]) ribPaths[ribNum].push(p.d);
}

for (let i = 0; i < rightClusters.length; i++) {
  const ribNum = i + 1;
  const centerY = rightClusters[i].reduce((s, p) => s + p.bbox.midY, 0) / rightClusters[i].length;
  console.log(`Rib ${ribNum} R: ${rightClusters[i].length} main paths, centerY=${centerY.toFixed(1)}`);
  for (const p of rightClusters[i]) ribPaths[ribNum].push(p.d);
}

// Assign detail paths to the nearest rib cluster
for (const detail of detailPaths) {
  let bestRib = 1;
  let bestDist = Infinity;

  const clusters = detail.side === 'L' ? leftClusters : rightClusters;
  for (let i = 0; i < clusters.length; i++) {
    const ribNum = i + 1;
    for (const mainP of clusters[i]) {
      // Weight Y distance more than X since ribs stack vertically
      const dist = Math.abs(detail.bbox.midY - mainP.bbox.midY) +
                   Math.abs(detail.bbox.midX - mainP.bbox.midX) * 0.3;
      if (dist < bestDist) {
        bestDist = dist;
        bestRib = ribNum;
      }
    }
  }

  ribPaths[bestRib].push(detail.d);
}

// Log path counts
for (let i = 1; i <= 12; i++) {
  console.log(`Rib ${i}: ${ribPaths[i].length} total paths`);
}

// Verify total
const total = Object.values(ribPaths).reduce((s, arr) => s + arr.length, 0);
console.log(`Total paths assigned: ${total} (expected ${allPaths.length})`);

// ---- Update CSV ----

const csvContent = readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.split('\n');
const header = parseCSVLine(lines[0]);
const idIdx = header.indexOf('id');
const pathsIdx = header.indexOf('paths');

let updateCount = 0;
const newLines = [...lines];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const fields = parseCSVLine(lines[i]);
  const id = fields[idIdx];
  const match = id.match(/^rib-(\d+)$/);
  if (match) {
    const ribNum = parseInt(match[1]);
    fields[pathsIdx] = ribPaths[ribNum].join('|');
    newLines[i] = fields.map(toCSVField).join(',');
    updateCount++;
  }
}

writeFileSync(CSV_PATH, newLines.join('\n'));
console.log(`\nDone. Updated ${updateCount} rib rows.`);
