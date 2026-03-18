/**
 * Fetch Natural Earth 1:110m GeoJSON and generate SVG path data
 * for countries missing from world-borders.csv.
 *
 * Usage: node scripts/add-missing-borders.mjs
 *
 * Outputs CSV rows to stdout. Paste into world-borders.csv.
 */

const GEOJSON_URL_110M =
  'https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson';
const GEOJSON_URL_50M =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';

// Countries missing from world-borders.csv, keyed by Natural Earth ADMIN name
// value = { id, name, region, group } for the CSV row
const MISSING = {
  'France': { id: 'france', name: 'France', region: 'Europe', group: 'Western Europe' },
  'Norway': { id: 'norway', name: 'Norway', region: 'Europe', group: 'Northern Europe' },
  'Kosovo': { id: 'kosovo', name: 'Kosovo', region: 'Europe', group: 'Southeast Europe' },
  'Vatican': { id: 'vatican-city', name: 'Vatican City', region: 'Europe', group: 'Southern Europe' },
  'Sao Tome and Principe': { id: 'sao-tome-and-principe', name: 'São Tomé and Príncipe', region: 'Africa', group: 'Middle Africa' },
};

// Also try alternate names
const NAME_ALIASES = {
  'Holy See': 'Vatican',
  'Vatican City': 'Vatican',
  'Republic of Kosovo': 'Kosovo',
  'São Tomé and Príncipe': 'Sao Tome and Principe',
  'São Tomé and Principe': 'Sao Tome and Principe',
  'Sao Tome and Principe': 'Sao Tome and Principe',
};

function coordToSvg(lng, lat) {
  // Equirectangular: x = lng, y = -lat, rounded to 2dp
  return `${lng.toFixed(2)} ${(-lat).toFixed(2)}`;
}

function ringToPath(ring) {
  if (ring.length === 0) return '';
  const parts = [`M ${coordToSvg(ring[0][0], ring[0][1])}`];
  for (let i = 1; i < ring.length; i++) {
    parts.push(`L ${coordToSvg(ring[i][0], ring[i][1])}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function geometryToPaths(geometry) {
  const paths = [];
  if (geometry.type === 'Polygon') {
    // Only use outer ring (index 0)
    paths.push(ringToPath(geometry.coordinates[0]));
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      paths.push(ringToPath(polygon[0]));
    }
  }
  return paths.filter(p => p.length > 0);
}

function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('|')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function fetchGeoJSON(url) {
  console.error(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

function findFeature(geojson, targetName) {
  for (const feature of geojson.features) {
    const props = feature.properties;
    // Try various name fields
    const names = [
      props.ADMIN,
      props.NAME,
      props.name,
      props.NAME_LONG,
      props.FORMAL_EN,
      props.SOVEREIGNT,
    ].filter(Boolean);

    for (const name of names) {
      const resolved = NAME_ALIASES[name] ?? name;
      if (resolved === targetName) {
        return feature;
      }
    }
  }
  return null;
}

async function main() {
  // Try 110m first, fall back to 50m for tiny countries
  let geojson110;
  let geojson50;

  try {
    geojson110 = await fetchGeoJSON(GEOJSON_URL_110M);
  } catch (e) {
    console.error(`Failed to fetch 110m: ${e.message}`);
  }

  const found = new Map();
  const notFound = [];

  for (const [targetName, meta] of Object.entries(MISSING)) {
    const feature = geojson110 ? findFeature(geojson110, targetName) : null;
    if (feature) {
      found.set(targetName, { feature, meta });
    } else {
      notFound.push(targetName);
    }
  }

  // Try 50m for anything not found at 110m
  if (notFound.length > 0) {
    console.error(`Not found at 110m: ${notFound.join(', ')}. Trying 50m...`);
    try {
      geojson50 = await fetchGeoJSON(GEOJSON_URL_50M);
    } catch (e) {
      console.error(`Failed to fetch 50m: ${e.message}`);
    }

    if (geojson50) {
      for (const targetName of notFound) {
        const feature = findFeature(geojson50, targetName);
        if (feature) {
          found.set(targetName, { feature, meta: MISSING[targetName] });
        } else {
          console.error(`NOT FOUND at any resolution: ${targetName}`);
          // List names containing partial match for debugging
          const lowerTarget = targetName.toLowerCase().split(' ')[0];
          const allNames = geojson50.features.map(f => {
            const names = [f.properties.ADMIN, f.properties.NAME, f.properties.name, f.properties.NAME_LONG, f.properties.FORMAL_EN].filter(Boolean);
            return names;
          }).flat().filter(n => n.toLowerCase().includes(lowerTarget) || n.toLowerCase().includes('tom'));
          console.error(`Partial matches: ${allNames.join(', ')}`);
        }
      }
    }
  }

  // Output CSV rows
  for (const [, { feature, meta }] of found) {
    const paths = geometryToPaths(feature.geometry);
    const pathsStr = paths.join('|');
    const row = [meta.id, meta.name, meta.region, meta.group, escapeCSV(pathsStr)];
    console.log(row.join(','));
  }

  console.error(`\nGenerated ${found.size}/${Object.keys(MISSING).length} countries.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
