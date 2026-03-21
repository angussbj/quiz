/**
 * Quick exploration script to understand Natural Earth admin-1 data structure.
 * Not committed — just for development.
 */
import * as shapefile from 'shapefile';
import { resolve, dirname } from 'path';

const scriptDir = dirname(new URL(import.meta.url).pathname);
const shpPath = resolve(scriptDir, 'source-data/ne_10m_admin_1/ne_10m_admin_1_states_provinces.shp');

const TARGET_COUNTRIES = ['US', 'IN', 'CN', 'BR', 'RU', 'MX', 'ID', 'JP', 'NG'];

function clean(val: unknown): string {
  if (typeof val !== 'string') return String(val ?? '');
  return val.replace(/\0+$/, '').trim();
}

async function main() {
  const source = await shapefile.open(shpPath);

  const byCountry = new Map<string, Array<{ name: string; nameEn: string; type: string; region: string; regionSub: string; postal: string; nameAlt: string }>>();

  let result = await source.read();
  while (!result.done) {
    const feature = result.value;
    const iso2 = clean(feature.properties.iso_a2);
    if (TARGET_COUNTRIES.includes(iso2)) {
      if (!byCountry.has(iso2)) byCountry.set(iso2, []);
      byCountry.get(iso2)!.push({
        name: clean(feature.properties.name),
        nameEn: clean(feature.properties.name_en),
        type: clean(feature.properties.type_en),
        region: clean(feature.properties.region),
        regionSub: clean(feature.properties.region_sub),
        postal: clean(feature.properties.postal),
        nameAlt: clean(feature.properties.name_alt),
      });
    }
    result = await source.read();
  }

  for (const iso of TARGET_COUNTRIES) {
    const features = byCountry.get(iso) ?? [];
    const types = new Map<string, number>();
    for (const f of features) {
      types.set(f.type, (types.get(f.type) ?? 0) + 1);
    }
    const regions = new Set(features.map(f => f.region));

    console.log(`\n=== ${iso} (${features.length} features) ===`);
    console.log('Types:', [...types.entries()].map(([t, c]) => `${t} (${c})`).join(', '));
    console.log('Regions:', [...regions].join(', '));
    console.log('Subdivisions:');
    for (const f of features.sort((a, b) => a.name.localeCompare(b.name))) {
      const alt = f.nameAlt ? ` [alt: ${f.nameAlt}]` : '';
      const en = f.nameEn && f.nameEn !== f.name ? ` (en: ${f.nameEn})` : '';
      console.log(`  ${f.name}${en}${alt} — ${f.type} — ${f.region}/${f.regionSub} — postal: ${f.postal}`);
    }
  }
}

main().catch(console.error);
