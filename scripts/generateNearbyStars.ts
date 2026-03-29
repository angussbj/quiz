/**
 * Generate nearby-stars.csv from the HYG star database.
 *
 * Reads the HYG v4.1 database, groups binary/multiple star systems,
 * sorts by distance from Sol, and outputs the nearest 1000 systems.
 *
 * Usage:
 *   npx tsx scripts/generateNearbyStars.ts
 *
 * Input:
 *   scripts/source-data/hygdata_v41.csv  (HYG database v4.1)
 *
 * Output:
 *   public/data/stars/nearby-stars.csv
 *
 * Source file (gitignored). Download before running:
 *   curl -L https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv \
 *     -o scripts/source-data/hygdata_v41.csv
 *
 * HYG database: CC BY-SA 4.0, https://github.com/astronexus/HYG-Database
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PARSEC_TO_LY = 3.26156;
const MAX_SYSTEMS = 1000;

// ------------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------------

function parseCsvLine(line: string): ReadonlyArray<string> {
  const fields: Array<string> = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text: string): ReadonlyArray<Readonly<Record<string, string>>> {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      record[headers[i]] = values[i] ?? '';
    }
    return record;
  });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface HygStar {
  readonly id: string;
  readonly proper: string;
  readonly gl: string;
  readonly bf: string;
  readonly hd: string;
  readonly hip: string;
  readonly dist: number; // parsecs
  readonly x: number; // parsecs
  readonly y: number; // parsecs
  readonly z: number; // parsecs
  readonly spect: string;
  readonly lum: number;
  readonly mag: number;
  readonly absmag: number;
  readonly base: string; // multi-star system ID
  readonly comp: string; // component number
  readonly compPrimary: string; // primary component ID
  readonly ci: number;
}

interface StarSystem {
  readonly name: string;
  readonly nameAlternates: string;
  readonly distanceLy: number;
  readonly x: number; // light-years
  readonly y: number; // light-years
  readonly z: number; // light-years
  readonly spectralClass: string; // primary star spectral class letter (O/B/A/F/G/K/M)
  readonly spectralType: string; // full spectral type of primary
  readonly luminosity: number; // total system luminosity (solar luminosities)
  readonly magnitude: number; // apparent magnitude of brightest component
  readonly starCount: number;
  readonly wikipediaSlug: string;
}

// ------------------------------------------------------------------
// Spectral class extraction
// ------------------------------------------------------------------

function extractSpectralClass(spect: string): string {
  // Extract the single-letter spectral class from the full type
  // e.g., "G2V" -> "G", "M5Ve" -> "M", "sdM4" -> "M", "DA2" -> "D"
  const match = spect.match(/([OBAFGKM])\d/i);
  if (match) return match[1].toUpperCase();
  // White dwarfs
  if (/^[Dd][ABCOQZX]?/.test(spect)) return 'D';
  // Subdwarfs: "sdM4" etc.
  const sdMatch = spect.match(/sd([OBAFGKM])/i);
  if (sdMatch) return sdMatch[1].toUpperCase();
  // Bare letter classifications: "m", "k", "M:", "K:..."
  const bareMatch = spect.match(/^([OBAFGKM])[^a-zA-Z0-9]?/i);
  if (bareMatch) return bareMatch[1].toUpperCase();
  // Single letter: "m", "k" at end of string
  if (/^[OBAFGKMobafgkm]$/.test(spect.trim())) return spect.trim().toUpperCase();
  return '';
}

// ------------------------------------------------------------------
// Name generation
// ------------------------------------------------------------------

/** Build a display name for a star or system. */
function buildStarName(stars: ReadonlyArray<HygStar>): { name: string; alternates: string } {
  if (stars.length === 1) {
    return buildSingleStarName(stars[0]);
  }
  return buildSystemName(stars);
}

function buildSingleStarName(star: HygStar): { name: string; alternates: string } {
  const alts: Array<string> = [];

  // Primary: proper name > Gliese > Bayer/Flamsteed > HD
  let name = '';
  if (star.proper) {
    name = star.proper;
    if (star.gl) alts.push(star.gl);
    if (star.bf) alts.push(formatBayerFlamsteed(star.bf));
  } else if (star.gl) {
    name = star.gl;
    if (star.bf) alts.push(formatBayerFlamsteed(star.bf));
  } else if (star.bf) {
    name = formatBayerFlamsteed(star.bf);
  } else if (star.hd) {
    name = `HD ${star.hd}`;
  } else if (star.hip) {
    name = `HIP ${star.hip}`;
  } else {
    name = `HYG ${star.id}`;
  }

  return { name, alternates: alts.join('|') };
}

function buildSystemName(stars: ReadonlyArray<HygStar>): { name: string; alternates: string } {
  // Sort by component number (primary first)
  const sorted = [...stars].sort((a, b) => {
    const ca = parseInt(a.comp) || 0;
    const cb = parseInt(b.comp) || 0;
    return ca - cb;
  });

  const primary = sorted[0];
  const alts: Array<string> = [];

  // Check if all stars share a proper-name root or if individual stars have proper names
  const properNames = sorted.filter((s) => s.proper).map((s) => s.proper);
  const glNames = sorted.map((s) => s.gl).filter(Boolean);

  let name: string;

  if (properNames.length > 0) {
    // Use proper names: "Sirius A and B" or "Rigil Kentaurus and Toliman"
    // Check if names share a common root (e.g., "Struve 2398 A" and "Struve 2398 B")
    const commonRoot = findCommonNameRoot(properNames);
    if (commonRoot) {
      const suffixes = properNames.map((n) => n.slice(commonRoot.length).trim()).filter(Boolean);
      name = suffixes.length > 0 ? `${commonRoot} ${suffixes.join(' and ')}` : commonRoot;
      alts.push(commonRoot);
    } else if (properNames.length === sorted.length) {
      // All stars have different proper names
      name = properNames.join(' and ');
    } else {
      // Mix of proper names and unnamed — use primary's proper name
      name = primary.proper || primary.gl || formatBayerFlamsteed(primary.bf) || `HD ${primary.hd}`;
      const componentLabels = sorted.map((_, i) => String.fromCharCode(65 + i)).join(' and ');
      name = `${name} ${componentLabels}`.trim();
    }

    // Add catalog names as alternates
    if (primary.gl) {
      const glBase = primary.gl.replace(/[AB]$/, '').trim();
      if (glBase !== name && !alts.includes(glBase)) alts.push(glBase);
    }
    if (primary.bf) {
      const bfBase = formatBayerFlamsteed(primary.bf).replace(/ [AB]$/, '').trim();
      if (bfBase && !alts.includes(bfBase)) alts.push(bfBase);
    }
  } else if (glNames.length > 0) {
    // Use Gliese catalog base name
    const glBase = findCommonNameRoot(glNames);
    if (glBase) {
      const suffixes = glNames.map((n) => n.slice(glBase.length).trim()).filter(Boolean);
      name = suffixes.length > 0 ? `${glBase} ${suffixes.join(' and ')}` : glBase;
      alts.push(glBase);
    } else {
      name = glNames.join(' and ');
    }
    if (primary.bf) {
      const bfFormatted = formatBayerFlamsteed(primary.bf);
      if (bfFormatted) alts.push(bfFormatted);
    }
  } else {
    // Fallback to Bayer/Flamsteed or HD
    name = primary.bf ? formatBayerFlamsteed(primary.bf) : primary.hd ? `HD ${primary.hd}` : `HYG ${primary.id}`;
  }

  return { name, alternates: [...new Set(alts)].join('|') };
}

function findCommonNameRoot(names: ReadonlyArray<string>): string | null {
  if (names.length < 2) return null;
  // Find the longest common prefix
  let prefix = names[0];
  for (const name of names.slice(1)) {
    while (!name.startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }
  // Must have a meaningful prefix (>2 chars)
  if (prefix.length <= 2) return null;
  // Trim trailing spaces
  return prefix.trimEnd();
}

/** Convert HYG Bayer/Flamsteed format to readable form.
 *  e.g., "21Alp And" -> "Alpha Andromedae" (simplified: "21 Alpha And") */
function formatBayerFlamsteed(bf: string): string {
  if (!bf) return '';
  // The bf field is like "21Alp And" or "Kap1Scl"
  return bf.trim();
}

// ------------------------------------------------------------------
// Wikipedia slug
// ------------------------------------------------------------------

function buildWikipediaSlug(stars: ReadonlyArray<HygStar>): string {
  const primary = stars.sort((a, b) => (parseInt(a.comp) || 0) - (parseInt(b.comp) || 0))[0];
  if (primary.proper) {
    return primary.proper.replace(/ /g, '_');
  }
  return '';
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

function main() {
  const inputPath = resolve(__dirname, 'source-data/hygdata_v41.csv');
  if (!existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    console.error('Download it with:');
    console.error('  curl -L https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv \\');
    console.error('    -o scripts/source-data/hygdata_v41.csv');
    process.exit(1);
  }

  console.log('Reading HYG database...');
  const raw = readFileSync(inputPath, 'utf-8');
  const rows = parseCsv(raw);
  console.log(`  ${rows.length} rows`);

  // Parse all stars (excluding Sol, which is id=0, dist=0)
  const allStars: Array<HygStar> = [];
  for (const row of rows) {
    const dist = parseFloat(row.dist);
    if (isNaN(dist) || dist >= 100000) continue; // Missing/dubious parallax

    const star: HygStar = {
      id: row.id,
      proper: row.proper.trim(),
      gl: row.gl.trim(),
      bf: row.bf.trim(),
      hd: row.hd.trim(),
      hip: row.hip.trim(),
      dist,
      x: parseFloat(row.x) || 0,
      y: parseFloat(row.y) || 0,
      z: parseFloat(row.z) || 0,
      spect: row.spect.trim(),
      lum: parseFloat(row.lum) || 0,
      mag: parseFloat(row.mag) || 0,
      absmag: parseFloat(row.absmag) || 0,
      base: row.base.trim(),
      comp: row.comp.trim(),
      compPrimary: row.comp_primary.trim(),
      ci: parseFloat(row.ci) || 0,
    };

    if (dist === 0) {
      continue;
    }

    allStars.push(star);
  }

  console.log(`  ${allStars.length} valid stars (excluding Sol)`);

  // Group into systems using comp_primary field
  // Stars with the same comp_primary value are in the same system
  const systemMap = new Map<string, Array<HygStar>>();
  for (const star of allStars) {
    const key = star.compPrimary || star.id;
    const existing = systemMap.get(key);
    if (existing) {
      existing.push(star);
    } else {
      systemMap.set(key, [star]);
    }
  }

  console.log(`  ${systemMap.size} unique systems`);

  // Build system records
  const systems: Array<StarSystem> = [];
  for (const [, stars] of systemMap) {
    // Use the primary star's position for the system
    const primary = stars.reduce((best, s) => (s.lum > best.lum ? s : best), stars[0]);
    const distLy = primary.dist * PARSEC_TO_LY;

    const { name, alternates } = buildStarName(stars);
    const spectClass = extractSpectralClass(primary.spect);
    const totalLum = stars.reduce((sum, s) => sum + s.lum, 0);
    const brightestMag = Math.min(...stars.map((s) => s.mag));

    systems.push({
      name,
      nameAlternates: alternates,
      distanceLy: Math.round(distLy * 100) / 100,
      x: Math.round(primary.x * PARSEC_TO_LY * 100) / 100,
      y: Math.round(primary.y * PARSEC_TO_LY * 100) / 100,
      z: Math.round(primary.z * PARSEC_TO_LY * 100) / 100,
      spectralClass: spectClass,
      spectralType: primary.spect,
      luminosity: totalLum,
      magnitude: brightestMag,
      starCount: stars.length,
      wikipediaSlug: buildWikipediaSlug(stars),
    });
  }

  // Sort by distance
  systems.sort((a, b) => a.distanceLy - b.distanceLy);

  // Take nearest 1000
  const nearest = systems.slice(0, MAX_SYSTEMS);
  console.log(`  Taking nearest ${nearest.length} systems`);
  console.log(`  Farthest: ${nearest[nearest.length - 1].distanceLy.toFixed(1)} ly (${nearest[nearest.length - 1].name})`);

  // Count spectral classes
  const classCount = new Map<string, number>();
  for (const s of nearest) {
    const c = s.spectralClass || '?';
    classCount.set(c, (classCount.get(c) || 0) + 1);
  }
  console.log('  Spectral class distribution:');
  for (const [c, n] of [...classCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${c}: ${n}`);
  }

  // Write CSV
  const outputDir = resolve(__dirname, '../public/data/stars');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const header = 'id,rank,name,name_alternates,distance_ly,x,y,z,spectral_class,spectral_type,luminosity,magnitude,star_count,wikipedia';
  const csvLines = nearest.map((s, i) => {
    const id = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return [
      escapeCsvField(id),
      i + 1,
      escapeCsvField(s.name),
      escapeCsvField(s.nameAlternates),
      s.distanceLy,
      s.x,
      s.y,
      s.z,
      s.spectralClass,
      escapeCsvField(s.spectralType),
      s.luminosity,
      s.magnitude,
      s.starCount,
      escapeCsvField(s.wikipediaSlug),
    ].join(',');
  });

  const outputPath = resolve(outputDir, 'nearby-stars.csv');
  writeFileSync(outputPath, header + '\n' + csvLines.join('\n') + '\n');
  console.log(`\nWrote ${nearest.length} systems to ${outputPath}`);
}

main();
