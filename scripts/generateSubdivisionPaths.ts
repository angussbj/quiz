/**
 * Generate per-country subdivision CSVs from Natural Earth admin-1 data.
 *
 * Reads the Natural Earth ne_10m_admin_1_states_provinces shapefile,
 * converts polygon coordinates to equirectangular SVG path `d` strings
 * (x = longitude, y = -latitude), and outputs one CSV per target country.
 *
 * Usage:
 *   npx tsx scripts/generateSubdivisionPaths.ts
 *
 * Input:
 *   scripts/source-data/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp
 *
 * Output:
 *   public/data/subdivisions/{country-slug}.csv
 *
 * Source: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
 *   Download: curl -L "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip" \
 *     -o scripts/source-data/ne_10m_admin_1_states_provinces.zip
 *   Unzip: unzip scripts/source-data/ne_10m_admin_1_states_provinces.zip -d scripts/source-data/ne_10m_admin_1
 */

import * as shapefile from 'shapefile';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface TargetCountry {
  readonly iso2: string;
  readonly slug: string;
  readonly label: string;
  /** Manual region assignments for countries without NE region data */
  readonly regionOverrides?: Readonly<Record<string, string>>;
  /** Features to exclude by name */
  readonly excludeNames?: ReadonlyArray<string>;
  /** Whether to prefer name_en over name */
  readonly preferEnglishNames?: boolean;
  /** Suffix to strip from names (e.g., ' Prefecture' for Japan) */
  readonly nameSuffix?: string;
}

// ------------------------------------------------------------------
// Target countries configuration
// ------------------------------------------------------------------

const TARGET_COUNTRIES: ReadonlyArray<TargetCountry> = [
  {
    iso2: 'US',
    slug: 'united-states',
    label: 'United States',
  },
  {
    iso2: 'IN',
    slug: 'india',
    label: 'India',
    regionOverrides: {
      'Andaman and Nicobar': 'South',
      'Ladakh': 'North',
    },
  },
  {
    iso2: 'CN',
    slug: 'china',
    label: 'China',
    excludeNames: ['Paracel Islands'],
    regionOverrides: {
      'Fujian': 'East China',
    },
  },
  {
    iso2: 'BR',
    slug: 'brazil',
    label: 'Brazil',
    regionOverrides: {
      'Acre': 'North',
      'Amazonas': 'North',
      'Amapá': 'North',
      'Pará': 'North',
      'Rondônia': 'North',
      'Roraima': 'North',
      'Tocantins': 'North',
      'Alagoas': 'Northeast',
      'Bahia': 'Northeast',
      'Ceará': 'Northeast',
      'Maranhão': 'Northeast',
      'Paraíba': 'Northeast',
      'Pernambuco': 'Northeast',
      'Piauí': 'Northeast',
      'Rio Grande do Norte': 'Northeast',
      'Sergipe': 'Northeast',
      'Distrito Federal': 'Central-West',
      'Goiás': 'Central-West',
      'Mato Grosso': 'Central-West',
      'Mato Grosso do Sul': 'Central-West',
      'Espírito Santo': 'Southeast',
      'Minas Gerais': 'Southeast',
      'Rio de Janeiro': 'Southeast',
      'São Paulo': 'Southeast',
      'Paraná': 'South',
      'Rio Grande do Sul': 'South',
      'Santa Catarina': 'South',
    },
  },
  {
    iso2: 'RU',
    slug: 'russia',
    label: 'Russia',
    excludeNames: ['Crimea', 'Sevastopol'],
  },
  {
    iso2: 'MX',
    slug: 'mexico',
    label: 'Mexico',
    regionOverrides: {
      'Baja California': 'Northwest',
      'Baja California Sur': 'Northwest',
      'Chihuahua': 'Northwest',
      'Durango': 'Northwest',
      'Sinaloa': 'Northwest',
      'Sonora': 'Northwest',
      'Aguascalientes': 'North-Central',
      'Coahuila': 'North-Central',
      'Nuevo León': 'North-Central',
      'San Luis Potosí': 'North-Central',
      'Tamaulipas': 'North-Central',
      'Zacatecas': 'North-Central',
      'Colima': 'West',
      'Guanajuato': 'West',
      'Jalisco': 'West',
      'Michoacán': 'West',
      'Nayarit': 'West',
      'Distrito Federal': 'Central',
      'Hidalgo': 'Central',
      'México': 'Central',
      'Morelos': 'Central',
      'Puebla': 'Central',
      'Querétaro': 'Central',
      'Tlaxcala': 'Central',
      'Campeche': 'Southeast',
      'Chiapas': 'Southeast',
      'Guerrero': 'Southeast',
      'Oaxaca': 'Southeast',
      'Quintana Roo': 'Southeast',
      'Tabasco': 'Southeast',
      'Veracruz': 'Southeast',
      'Yucatán': 'Southeast',
    },
  },
  {
    iso2: 'ID',
    slug: 'indonesia',
    label: 'Indonesia',
    preferEnglishNames: true,
    regionOverrides: {
      'Aceh': 'Sumatra',
      'Sumatera Utara': 'Sumatra',
      'North Sumatra': 'Sumatra',
      'Sumatera Barat': 'Sumatra',
      'West Sumatra': 'Sumatra',
      'Riau': 'Sumatra',
      'Kepulauan Riau': 'Sumatra',
      'Riau Islands': 'Sumatra',
      'Jambi': 'Sumatra',
      'Sumatera Selatan': 'Sumatra',
      'South Sumatra': 'Sumatra',
      'Bangka-Belitung': 'Sumatra',
      'Bangka Belitung Islands': 'Sumatra',
      'Bengkulu': 'Sumatra',
      'Lampung': 'Sumatra',
      'Jakarta Raya': 'Java',
      'Jakarta': 'Java',
      'Banten': 'Java',
      'Jawa Barat': 'Java',
      'West Java': 'Java',
      'Jawa Tengah': 'Java',
      'Central Java': 'Java',
      'Jawa Timur': 'Java',
      'East Java': 'Java',
      'Yogyakarta': 'Java',
      'Bali': 'Lesser Sunda',
      'Nusa Tenggara Barat': 'Lesser Sunda',
      'West Nusa Tenggara': 'Lesser Sunda',
      'Nusa Tenggara Timur': 'Lesser Sunda',
      'East Nusa Tenggara': 'Lesser Sunda',
      'Kalimantan Barat': 'Kalimantan',
      'West Kalimantan': 'Kalimantan',
      'Kalimantan Tengah': 'Kalimantan',
      'Central Kalimantan': 'Kalimantan',
      'Kalimantan Selatan': 'Kalimantan',
      'South Kalimantan': 'Kalimantan',
      'Kalimantan Timur': 'Kalimantan',
      'East Kalimantan': 'Kalimantan',
      'Sulawesi Utara': 'Sulawesi',
      'North Sulawesi': 'Sulawesi',
      'Gorontalo': 'Sulawesi',
      'Sulawesi Tengah': 'Sulawesi',
      'Central Sulawesi': 'Sulawesi',
      'Sulawesi Barat': 'Sulawesi',
      'West Sulawesi': 'Sulawesi',
      'Sulawesi Selatan': 'Sulawesi',
      'South Sulawesi': 'Sulawesi',
      'Sulawesi Tenggara': 'Sulawesi',
      'Southeast Sulawesi': 'Sulawesi',
      'Maluku': 'Maluku',
      'Maluku Utara': 'Maluku',
      'North Maluku': 'Maluku',
      'Papua': 'Papua',
      'Papua Barat': 'Papua',
      'West Papua': 'Papua',
    },
  },
  {
    iso2: 'JP',
    slug: 'japan',
    label: 'Japan',
    preferEnglishNames: true,
    /** Strip " Prefecture" suffix from name_en; keep original as alternate */
    nameSuffix: ' Prefecture',
    regionOverrides: {
      'Nagasaki': 'Kyushu',
      'Saga': 'Kyushu',
      'Nagasaki Prefecture': 'Kyushu',
      'Saga Prefecture': 'Kyushu',
    },
  },
  {
    iso2: 'NG',
    slug: 'nigeria',
    label: 'Nigeria',
    regionOverrides: {
      'Borno': 'North East',
      'Yobe': 'North East',
      'Bauchi': 'North East',
      'Gombe': 'North East',
      'Adamawa': 'North East',
      'Taraba': 'North East',
      'Jigawa': 'North West',
      'Kano': 'North West',
      'Katsina': 'North West',
      'Kaduna': 'North West',
      'Zamfara': 'North West',
      'Sokoto': 'North West',
      'Kebbi': 'North West',
      'Federal Capital Territory': 'North Central',
      'Nassarawa': 'North Central',
      'Plateau': 'North Central',
      'Benue': 'North Central',
      'Kogi': 'North Central',
      'Kwara': 'North Central',
      'Niger': 'North Central',
      'Lagos': 'South West',
      'Ogun': 'South West',
      'Oyo': 'South West',
      'Osun': 'South West',
      'Ondo': 'South West',
      'Ekiti': 'South West',
      'Edo': 'South South',
      'Delta': 'South South',
      'Bayelsa': 'South South',
      'Rivers': 'South South',
      'Akwa Ibom': 'South South',
      'Cross River': 'South South',
      'Abia': 'South East',
      'Imo': 'South East',
      'Ebonyi': 'South East',
      'Enugu': 'South East',
      'Anambra': 'South East',
    },
  },
];

// ------------------------------------------------------------------
// Path simplification: Douglas-Peucker (same as generateBorderPaths.ts)
// ------------------------------------------------------------------

type Point = readonly [number, number];

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd[0] - lineStart[0];
  const dy = lineEnd[1] - lineStart[1];
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    const ex = point[0] - lineStart[0];
    const ey = point[1] - lineStart[1];
    return Math.sqrt(ex * ex + ey * ey);
  }
  const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / lengthSq;
  const projX = lineStart[0] + t * dx;
  const projY = lineStart[1] + t * dy;
  const ex = point[0] - projX;
  const ey = point[1] - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

function douglasPeucker(points: ReadonlyArray<Point>, epsilon: number): ReadonlyArray<Point> {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const right = douglasPeucker(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[end]];
}

// ------------------------------------------------------------------
// Coordinate conversion
// ------------------------------------------------------------------

function ringToPath(ring: ReadonlyArray<ReadonlyArray<number>>, epsilon: number): string {
  const points: Array<Point> = ring.map(([lng, lat]) => [lng, -lat] as Point);
  const simplified = douglasPeucker(points, epsilon);

  if (simplified.length < 3) return '';

  const parts: Array<string> = [];
  for (let i = 0; i < simplified.length; i++) {
    const [x, y] = simplified[i];
    const rx = Math.round(x * 100) / 100;
    const ry = Math.round(y * 100) / 100;
    parts.push(i === 0 ? `M ${rx} ${ry}` : `L ${rx} ${ry}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

interface Geometry {
  readonly type: 'Polygon' | 'MultiPolygon';
  readonly coordinates: ReadonlyArray<unknown>;
}

function featureToSvgPaths(geometry: Geometry, epsilon: number): ReadonlyArray<string> {
  const paths: Array<string> = [];

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>;
    const path = ringToPath(rings[0], epsilon);
    if (path) paths.push(path);
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>>;
    for (const polygon of polygons) {
      const path = ringToPath(polygon[0], epsilon);
      if (path) paths.push(path);
    }
  }

  return paths;
}

// ------------------------------------------------------------------
// CSV escaping
// ------------------------------------------------------------------

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('|') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// String cleaning
// ------------------------------------------------------------------

function clean(val: unknown): string {
  if (typeof val !== 'string') return String(val ?? '');
  return val.replace(/\0+/g, '').trim();
}

function toSlug(name: string): string {
  return name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const scriptDir = dirname(new URL(import.meta.url).pathname);
const shpPath = resolve(scriptDir, 'source-data/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp');
const outputDir = resolve(scriptDir, '..', 'public', 'data', 'subdivisions');

// Simplification epsilon — slightly smaller than country borders since
// state boundaries need more detail for smaller shapes
const EPSILON = 0.03;

async function main() {
  const source = await shapefile.open(shpPath, undefined, { encoding: 'utf-8' });

  // Collect features by country
  const countryLookup = new Map<string, TargetCountry>();
  for (const tc of TARGET_COUNTRIES) {
    countryLookup.set(tc.iso2, tc);
  }

  interface FeatureData {
    readonly name: string;
    readonly nameLocal: string;
    readonly nameAlt: string;
    readonly strippedSuffix: string;
    readonly region: string;
    readonly regionSub: string;
    readonly type: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly geometry: Geometry;
  }

  const byCountry = new Map<string, Array<FeatureData>>();

  let result = await source.read();
  while (!result.done) {
    const feature = result.value;
    const iso2 = clean(feature.properties.iso_a2);
    if (countryLookup.has(iso2)) {
      if (!byCountry.has(iso2)) byCountry.set(iso2, []);

      const tc = countryLookup.get(iso2)!;
      const rawName = clean(feature.properties.name);
      const nameEn = clean(feature.properties.name_en);
      let name = tc.preferEnglishNames && nameEn ? nameEn : rawName;
      const nameLocal = tc.preferEnglishNames ? rawName : '';

      // Strip configured suffix (e.g., " Prefecture" for Japan)
      let strippedSuffix = '';
      if (tc.nameSuffix && name.endsWith(tc.nameSuffix)) {
        strippedSuffix = name;
        name = name.slice(0, -tc.nameSuffix.length);
      }

      byCountry.get(iso2)!.push({
        name,
        nameLocal: nameLocal !== name ? nameLocal : '',
        nameAlt: clean(feature.properties.name_alt),
        strippedSuffix,
        region: clean(feature.properties.region),
        regionSub: clean(feature.properties.region_sub),
        type: clean(feature.properties.type_en),
        latitude: feature.properties.latitude as number,
        longitude: feature.properties.longitude as number,
        geometry: feature.geometry as Geometry,
      });
    }
    result = await source.read();
  }

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Generate CSVs
  for (const tc of TARGET_COUNTRIES) {
    const features = byCountry.get(tc.iso2) ?? [];
    const csvRows: Array<string> = [];

    for (const f of features) {
      // Skip blank names and excluded features
      if (!f.name) continue;
      if (tc.excludeNames?.includes(f.name)) continue;

      const svgPaths = featureToSvgPaths(f.geometry, EPSILON);
      if (svgPaths.length === 0) continue;

      const id = toSlug(f.name);
      const pathsField = svgPaths.join('|');

      // Determine region: use override, then NE region, fallback to type
      let region = '';
      if (tc.regionOverrides) {
        region = tc.regionOverrides[f.name] ?? '';
      }
      if (!region) {
        region = f.region || f.type || '';
      }

      // Build alternates: combine name_alt with local name and stripped suffix
      const altParts: Array<string> = [];
      if (f.strippedSuffix) {
        altParts.push(f.strippedSuffix);
      }
      if (f.nameLocal) {
        altParts.push(f.nameLocal);
      }
      if (f.nameAlt) {
        // name_alt is pipe-separated in the shapefile
        for (const alt of f.nameAlt.split('|')) {
          const trimmed = alt.trim();
          if (trimmed && trimmed !== f.name && !altParts.includes(trimmed)) {
            altParts.push(trimmed);
          }
        }
      }

      csvRows.push(
        [id, f.name, region, pathsField, String(f.latitude), String(f.longitude), altParts.join('|')]
          .map(escapeCsvField)
          .join(','),
      );
    }

    // Sort by name for readability
    csvRows.sort((a, b) => {
      const nameA = a.split(',')[1];
      const nameB = b.split(',')[1];
      return nameA.localeCompare(nameB);
    });

    const header = 'id,name,region,paths,latitude,longitude,name_alternates';
    const output = header + '\n' + csvRows.join('\n') + '\n';
    const outputPath = resolve(outputDir, `${tc.slug}.csv`);
    writeFileSync(outputPath, output);

    console.log(`${tc.label} (${tc.iso2}): ${csvRows.length} subdivisions → ${outputPath}`);
    console.log(`  File size: ${Math.round(output.length / 1024)}KB`);
  }
}

main().catch(console.error);
