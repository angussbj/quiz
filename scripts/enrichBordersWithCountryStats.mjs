/**
 * Enrich world-borders.csv with country statistics from multiple sources.
 *
 * Primary source: World Bank API v2 (~37 indicators)
 * Secondary sources (loaded from scripts/source-data/):
 *   - CIA World Factbook JSON (elevation, highest point, coastline, median age)
 *   - UNDP HDI data (HDI, mean years of schooling)
 *   - Transparency International (Corruption Perceptions Index)
 *   - Reporters Without Borders (Press Freedom Index)
 *   - The Economist Intelligence Unit (Democracy Index)
 *   - World Prison Brief (incarceration rate)
 *   - World Happiness Report (happiness score)
 *   - UNESCO (World Heritage Sites count)
 *   - OECD DAC (ODA given per capita)
 *   - CRU / World Bank CCKP (average temperature, average rainfall)
 *
 * Usage: node scripts/enrichBordersWithCountryStats.mjs
 *
 * To refresh only World Bank data (skip source-data files):
 *   node scripts/enrichBordersWithCountryStats.mjs --wb-only
 *
 * Reads:
 *   public/data/borders/world-borders.csv
 *   scripts/source-data/country-stats/ (various files)
 * Writes:
 *   public/data/borders/world-borders.csv (in-place update)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

// ─── Configuration ──────────────────────────────────────────────────────────

const BORDERS_PATH = 'public/data/borders/world-borders.csv';
const SOURCE_DATA_DIR = 'scripts/source-data/country-stats';

/** World Bank API date range — pick most recent available per country. */
const WB_DATE_RANGE = '2015:2024';
const WB_BASE_URL = 'https://api.worldbank.org/v2';
const WB_PER_PAGE = 10000; // large enough to get all data in one page for most indicators
const WB_DELAY_MS = 400; // courtesy delay between API calls
const WB_MAX_RETRIES = 3;

/**
 * All output columns added by this script, in order.
 * Each entry maps a CSV column name to its World Bank indicator code (or null for non-WB sources).
 */
const STAT_COLUMNS = [
  // Demographics
  { column: 'population', wbCode: 'SP.POP.TOTL', label: 'Population' },
  { column: 'population_density', wbCode: 'EN.POP.DNST', label: 'Population density (per km²)' },
  { column: 'population_growth_pct', wbCode: 'SP.POP.GROW', label: 'Population growth (% annual)' },
  { column: 'median_age', wbCode: null, label: 'Median age (years)' },
  { column: 'urban_population_pct', wbCode: 'SP.URB.TOTL.IN.ZS', label: 'Urban population (%)' },
  { column: 'fertility_rate', wbCode: 'SP.DYN.TFRT.IN', label: 'Fertility rate (births per woman)' },
  { column: 'net_migration_rate', wbCode: 'SM.POP.NETM', label: 'Net migration' },

  // Economy
  { column: 'gdp_nominal', wbCode: 'NY.GDP.MKTP.CD', label: 'GDP nominal (USD)' },
  { column: 'gdp_per_capita', wbCode: 'NY.GDP.PCAP.CD', label: 'GDP per capita (USD)' },
  { column: 'gdp_ppp_per_capita', wbCode: 'NY.GDP.PCAP.PP.CD', label: 'GDP PPP per capita (USD)' },
  { column: 'gdp_growth_pct', wbCode: 'NY.GDP.MKTP.KD.ZG', label: 'GDP growth (% annual)' },
  { column: 'gini_coefficient', wbCode: 'SI.POV.GINI', label: 'Gini coefficient' },
  { column: 'unemployment_rate', wbCode: 'SL.UEM.TOTL.ZS', label: 'Unemployment rate (%)' },
  { column: 'inflation_rate', wbCode: 'FP.CPI.TOTL.ZG', label: 'Inflation rate (% annual)' },
  { column: 'government_debt_pct_gdp', wbCode: 'GC.DOD.TOTL.GD.ZS', label: 'Government debt (% of GDP)' },
  { column: 'tax_revenue_pct_gdp', wbCode: 'GC.TAX.TOTL.GD.ZS', label: 'Tax revenue (% of GDP)' },

  // Geography & Environment
  { column: 'land_area_km2', wbCode: 'AG.LND.TOTL.K2', label: 'Land area (km²)' },
  { column: 'average_elevation_m', wbCode: null, label: 'Average elevation (m)' },
  { column: 'highest_point_m', wbCode: null, label: 'Highest point (m)' },
  { column: 'coastline_km', wbCode: null, label: 'Coastline (km)' },
  { column: 'forest_cover_pct', wbCode: 'AG.LND.FRST.ZS', label: 'Forest cover (%)' },
  { column: 'average_temperature_c', wbCode: null, label: 'Average temperature (°C)' },
  { column: 'average_rainfall_mm', wbCode: null, label: 'Average rainfall (mm/year)' },
  { column: 'co2_per_capita_tonnes', wbCode: 'EN.GHG.CO2.PC.CE.AR5', label: 'CO₂ per capita (tonnes)' },
  { column: 'co2_total_mt', wbCode: 'EN.GHG.CO2.MT.CE.AR5', label: 'CO₂ total (Mt)' },
  { column: 'pm25_concentration', wbCode: 'EN.ATM.PM25.MC.M3', label: 'PM2.5 (µg/m³)' },
  { column: 'renewable_energy_pct', wbCode: 'EG.FEC.RNEW.ZS', label: 'Renewable energy (%)' },
  { column: 'protected_land_pct', wbCode: 'ER.PTD.TOTL.ZS', label: 'Protected land area (%)' },

  // Health
  { column: 'life_expectancy', wbCode: 'SP.DYN.LE00.IN', label: 'Life expectancy (years)' },
  { column: 'infant_mortality_rate', wbCode: 'SP.DYN.IMRT.IN', label: 'Infant mortality (per 1,000)' },
  { column: 'child_mortality_rate', wbCode: 'SH.DYN.MORT', label: 'Child mortality, under-5 (per 1,000)' },
  { column: 'maternal_mortality_ratio', wbCode: 'SH.STA.MMRT', label: 'Maternal mortality (per 100,000)' },
  { column: 'health_expenditure_pct_gdp', wbCode: 'SH.XPD.CHEX.GD.ZS', label: 'Health expenditure (% of GDP)' },
  { column: 'physicians_per_1000', wbCode: 'SH.MED.PHYS.ZS', label: 'Physicians (per 1,000)' },
  { column: 'hospital_beds_per_1000', wbCode: 'SH.MED.BEDS.ZS', label: 'Hospital beds (per 1,000)' },
  { column: 'obesity_rate_pct', wbCode: 'SH.STA.OWAD.ZS', label: 'Obesity rate (% of adults)' },

  // Education & Development
  { column: 'hdi', wbCode: null, label: 'Human Development Index' },
  { column: 'literacy_rate_pct', wbCode: 'SE.ADT.LITR.ZS', label: 'Literacy rate (%)' },
  { column: 'mean_years_schooling', wbCode: null, label: 'Mean years of schooling' },
  { column: 'education_expenditure_pct_gdp', wbCode: 'SE.XPD.TOTL.GD.ZS', label: 'Education expenditure (% of GDP)' },

  // Governance & Security
  { column: 'military_expenditure_pct_gdp', wbCode: 'MS.MIL.XPND.GD.ZS', label: 'Military expenditure (% of GDP)' },
  { column: 'military_expenditure_per_capita', wbCode: null, label: 'Military expenditure per capita (USD)' },
  { column: 'corruption_perceptions_index', wbCode: null, label: 'Corruption Perceptions Index' },
  { column: 'press_freedom_index', wbCode: null, label: 'Press Freedom Index' },
  { column: 'democracy_index', wbCode: null, label: 'Democracy Index' },
  { column: 'homicide_rate', wbCode: 'VC.IHR.PSRC.P5', label: 'Homicide rate (per 100,000)' },
  { column: 'incarceration_rate', wbCode: null, label: 'Incarceration rate (per 100,000)' },
  { column: 'global_peace_index', wbCode: null, label: 'Global Peace Index' },

  // Aid
  { column: 'oda_given_per_capita', wbCode: null, label: 'Foreign aid given per capita (USD)' },
  { column: 'oda_received_per_capita', wbCode: 'DT.ODA.ODAT.PC.ZS', label: 'Foreign aid received per capita (USD)' },

  // Quality of Life & Culture
  { column: 'happiness_score', wbCode: null, label: 'Happiness score' },
  { column: 'internet_penetration_pct', wbCode: 'IT.NET.USER.ZS', label: 'Internet users (%)' },
  { column: 'mobile_subscriptions_per_100', wbCode: 'IT.CEL.SETS.P2', label: 'Mobile subscriptions (per 100)' },
  { column: 'tourism_per_capita', wbCode: null, label: 'Tourism arrivals per capita' },
  { column: 'unesco_world_heritage_sites', wbCode: null, label: 'UNESCO World Heritage Sites' },
];

// ─── CSV Parsing ────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n').filter((r) => r.trim());
  const cols = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVRow(lines[i]);
    const obj = {};
    cols.forEach((c, j) => (obj[c] = vals[j] || ''));
    rows.push(obj);
  }
  return { cols, rows };
}

function parseCSVRow(line) {
  const vals = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      vals.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  vals.push(current);
  return vals;
}

function quoteField(val) {
  if (val.includes(',') || val.includes('"') || val.includes('|') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function toCSV(cols, rows) {
  const header = cols.join(',');
  const body = rows.map((row) => cols.map((c) => quoteField(row[c] ?? '')).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

// ─── Country Name Matching ──────────────────────────────────────────────────

/**
 * Build a map from lowercase country name → CSV row index.
 * Includes name_alternates (pipe-separated) for broader matching.
 */
function buildNameLookup(rows) {
  const lookup = new Map();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.is_sovereign !== 'true') continue;
    const name = row.name.toLowerCase();
    lookup.set(name, i);
    if (row.name_alternates) {
      for (const alt of row.name_alternates.split('|')) {
        lookup.set(alt.trim().toLowerCase(), i);
      }
    }
  }
  return lookup;
}

/**
 * Manual overrides for World Bank country names → our CSV country names.
 * World Bank uses some non-standard names; this maps them to our names.
 */
const WB_NAME_OVERRIDES = {
  'bahamas, the': 'bahamas',
  'brunei darussalam': 'brunei',
  'cabo verde': 'cape verde',
  'congo, dem. rep.': 'democratic republic of the congo',
  'congo, rep.': 'republic of the congo',
  "cote d'ivoire": "côte d'ivoire",
  'czech republic': 'czechia',
  'egypt, arab rep.': 'egypt',
  'eswatini': 'eswatini',
  'gambia, the': 'gambia',
  'iran, islamic rep.': 'iran',
  'korea, dem. people\'s rep.': 'north korea',
  'korea, rep.': 'south korea',
  'kyrgyz republic': 'kyrgyzstan',
  'lao pdr': 'laos',
  'micronesia, fed. sts.': 'micronesia',
  'russian federation': 'russia',
  'slovak republic': 'slovakia',
  'st. kitts and nevis': 'saint kitts and nevis',
  'st. lucia': 'saint lucia',
  'st. vincent and the grenadines': 'saint vincent and the grenadines',
  'syrian arab republic': 'syria',
  'timor-leste': 'timor-leste',
  'turkiye': 'türkiye',
  'türkiye': 'türkiye',
  'venezuela, rb': 'venezuela',
  'viet nam': 'vietnam',
  'west bank and gaza': 'palestine',
  'yemen, rep.': 'yemen',
  'sao tome and principe': 'são tomé and príncipe',
  'united states': 'united states of america',
  'somalia, fed. rep.': 'somalia',
  'puerto rico (us)': '',
  'hong kong sar, china': '',
  'macao sar, china': '',
};

function resolveWBName(wbName) {
  const lower = wbName.toLowerCase();
  return WB_NAME_OVERRIDES[lower] ?? lower;
}

// ─── World Bank API ─────────────────────────────────────────────────────────

async function fetchWorldBankIndicator(indicatorCode) {
  const url = `${WB_BASE_URL}/country/all/indicator/${indicatorCode}?date=${WB_DATE_RANGE}&format=json&per_page=${WB_PER_PAGE}`;
  let allData = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const pageUrl = page === 1 ? url : `${url}&page=${page}`;
    let json = null;
    for (let attempt = 0; attempt < WB_MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(pageUrl);
        if (!res.ok) {
          console.error(`  WB API error for ${indicatorCode}: ${res.status} (attempt ${attempt + 1})`);
          await sleep(1000 * (attempt + 1));
          continue;
        }
        json = await res.json();
        break;
      } catch (err) {
        console.error(`  WB API fetch error for ${indicatorCode}: ${err.message} (attempt ${attempt + 1})`);
        await sleep(1000 * (attempt + 1));
      }
    }
    if (!json || json.length < 2) {
      console.error(`  WB API empty response for ${indicatorCode} after retries`);
      return new Map();
    }
    totalPages = json[0].pages;
    if (json[1]) allData = allData.concat(json[1]);
    page++;
  }

  // Group by country, pick most recent non-null value
  const byCountry = new Map();
  for (const entry of allData) {
    if (entry.value === null || entry.value === undefined) continue;
    const name = resolveWBName(entry.country.value);
    const year = parseInt(entry.date, 10);
    const existing = byCountry.get(name);
    if (!existing || year > existing.year) {
      byCountry.set(name, { value: entry.value, year });
    }
  }
  return byCountry;
}

async function fetchAllWorldBankData() {
  const wbColumns = STAT_COLUMNS.filter((c) => c.wbCode !== null);
  console.log(`Fetching ${wbColumns.length} World Bank indicators...`);

  const results = new Map(); // column → Map<country, {value, year}>

  for (const col of wbColumns) {
    process.stdout.write(`  ${col.column} (${col.wbCode})...`);
    const data = await fetchWorldBankIndicator(col.wbCode);
    results.set(col.column, data);
    console.log(` ${data.size} countries`);
    await sleep(WB_DELAY_MS);
  }

  return results;
}

// Also fetch tourism arrivals (absolute) and military expenditure (absolute USD)
// for deriving per-capita values
async function fetchDerivedSourceData() {
  console.log('Fetching derived source indicators...');

  process.stdout.write('  tourism_arrivals (ST.INT.ARVL)...');
  const tourismArrivals = await fetchWorldBankIndicator('ST.INT.ARVL');
  console.log(` ${tourismArrivals.size} countries`);
  await sleep(WB_DELAY_MS);

  process.stdout.write('  military_expenditure_usd (MS.MIL.XPND.CD)...');
  const milExpUsd = await fetchWorldBankIndicator('MS.MIL.XPND.CD');
  console.log(` ${milExpUsd.size} countries`);

  return { tourismArrivals, milExpUsd };
}

// ─── Non-World-Bank Source Data ─────────────────────────────────────────────

/**
 * Load a simple CSV/TSV file from source-data directory.
 * Returns Map<lowercase country name, value string>.
 * Options:
 *   nameColumn: column containing country name (default: 'country')
 *   valueColumn: column containing the value
 *   delimiter: ',' or '\t' (default: ',')
 *   nameOverrides: extra name overrides specific to this source
 */
function loadSourceDataCSV(filename, { nameColumn = 'country', valueColumn, delimiter = ',', nameOverrides = {} } = {}) {
  const path = `${SOURCE_DATA_DIR}/${filename}`;
  if (!existsSync(path)) {
    console.warn(`  Warning: source file not found: ${path}`);
    return new Map();
  }
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^\uFEFF/, ''));
  const nameIdx = headers.indexOf(nameColumn);
  const valueIdx = headers.indexOf(valueColumn);
  if (nameIdx === -1 || valueIdx === -1) {
    console.warn(`  Warning: columns not found in ${filename}: need '${nameColumn}' and '${valueColumn}', got [${headers.join(', ')}]`);
    return new Map();
  }

  const result = new Map();
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(delimiter);
    const rawName = vals[nameIdx]?.trim();
    const value = vals[valueIdx]?.trim();
    if (!rawName || !value || value === '' || value === '-') continue;
    const name = nameOverrides[rawName.toLowerCase()] ?? rawName.toLowerCase();
    result.set(name, value);
  }
  return result;
}

/**
 * Load all non-WB source data files. Each returns a Map<country name, value>.
 */
function loadAllSourceData() {
  console.log('Loading non-World-Bank source data...');
  const results = {};

  // CIA World Factbook — elevation, highest point, coastline, median age
  const factbookOverrides = {
    'burma': 'myanmar',
    'cabo verde': 'cape verde',
    'czechia': 'czechia',
    'eswatini': 'eswatini',
    'holy see (vatican city)': 'vatican city',
    'korea, north': 'north korea',
    'korea, south': 'south korea',
    'timor-leste': 'timor-leste',
    'turkiye': 'türkiye',
    'türkiye': 'türkiye',
  };

  results.median_age = loadSourceDataCSV('cia-factbook.csv', {
    valueColumn: 'median_age', nameOverrides: factbookOverrides,
  });
  results.average_elevation_m = loadSourceDataCSV('cia-factbook.csv', {
    valueColumn: 'average_elevation_m', nameOverrides: factbookOverrides,
  });
  results.highest_point_m = loadSourceDataCSV('cia-factbook.csv', {
    valueColumn: 'highest_point_m', nameOverrides: factbookOverrides,
  });
  results.coastline_km = loadSourceDataCSV('cia-factbook.csv', {
    valueColumn: 'coastline_km', nameOverrides: factbookOverrides,
  });

  // UNDP — HDI, mean years of schooling
  const undpOverrides = {
    'congo (democratic republic of the)': 'democratic republic of the congo',
    'congo': 'republic of the congo',
    "cote d'ivoire": "côte d'ivoire",
    'czechia': 'czechia',
    'eswatini (kingdom of)': 'eswatini',
    'hong kong, china (sar)': '',
    'iran (islamic republic of)': 'iran',
    'korea (republic of)': 'south korea',
    "korea (democratic people's rep. of)": 'north korea',
    "lao people's democratic republic": 'laos',
    'micronesia (federated states of)': 'micronesia',
    'moldova (republic of)': 'moldova',
    'palestine, state of': 'palestine',
    'russian federation': 'russia',
    'syrian arab republic': 'syria',
    'tanzania (united republic of)': 'tanzania',
    'türkiye': 'türkiye',
    'viet nam': 'vietnam',
    'bolivia (plurinational state of)': 'bolivia',
    'venezuela (bolivarian republic of)': 'venezuela',
  };

  results.hdi = loadSourceDataCSV('undp-hdi.csv', {
    valueColumn: 'hdi', nameOverrides: undpOverrides,
  });
  results.mean_years_schooling = loadSourceDataCSV('undp-hdi.csv', {
    valueColumn: 'mean_years_schooling', nameOverrides: undpOverrides,
  });

  // Transparency International — Corruption Perceptions Index
  results.corruption_perceptions_index = loadSourceDataCSV('transparency-cpi.csv', {
    valueColumn: 'cpi_score',
  });

  // RSF — Press Freedom Index
  results.press_freedom_index = loadSourceDataCSV('rsf-press-freedom.csv', {
    valueColumn: 'score',
  });

  // EIU — Democracy Index
  results.democracy_index = loadSourceDataCSV('eiu-democracy-index.csv', {
    valueColumn: 'score',
  });

  // World Prison Brief — incarceration rate
  results.incarceration_rate = loadSourceDataCSV('world-prison-brief.csv', {
    valueColumn: 'rate_per_100000',
  });

  // World Happiness Report
  results.happiness_score = loadSourceDataCSV('world-happiness-report.csv', {
    valueColumn: 'score',
  });

  // UNESCO World Heritage Sites count
  results.unesco_world_heritage_sites = loadSourceDataCSV('unesco-whs.csv', {
    valueColumn: 'count',
  });

  // OECD DAC — ODA given per capita
  results.oda_given_per_capita = loadSourceDataCSV('oecd-oda-given.csv', {
    valueColumn: 'oda_per_capita_usd',
  });

  // CRU/CCKP — average temperature and rainfall
  results.average_temperature_c = loadSourceDataCSV('climate-data.csv', {
    valueColumn: 'avg_temperature_c',
  });
  results.average_rainfall_mm = loadSourceDataCSV('climate-data.csv', {
    valueColumn: 'avg_rainfall_mm',
  });

  // Global Peace Index
  results.global_peace_index = loadSourceDataCSV('global-peace-index.csv', {
    valueColumn: 'score',
  });

  for (const [key, data] of Object.entries(results)) {
    console.log(`  ${key}: ${data.size} countries`);
  }

  return results;
}

// ─── Data Merging ───────────────────────────────────────────────────────────

function mergeData(rows, nameLookup, wbData, sourceData, derivedData) {
  console.log('\nMerging data into CSV rows...');

  // Initialize all stat columns to empty on all rows
  for (const col of STAT_COLUMNS) {
    for (const row of rows) {
      row[col.column] = '';
    }
  }

  // Merge World Bank data
  for (const [column, countryMap] of wbData.entries()) {
    let matched = 0;
    for (const [name, { value }] of countryMap.entries()) {
      const idx = nameLookup.get(name);
      if (idx !== undefined) {
        rows[idx][column] = formatValue(value, column);
        matched++;
      }
    }
    if (matched < 100) {
      console.log(`  Warning: ${column} matched only ${matched} countries`);
    }
  }

  // Merge non-WB source data
  for (const [column, countryMap] of Object.entries(sourceData)) {
    let matched = 0;
    for (const [name, value] of countryMap.entries()) {
      if (!name) continue; // skip empty override mappings
      const idx = nameLookup.get(name);
      if (idx !== undefined) {
        rows[idx][column] = value;
        matched++;
      }
    }
  }

  // Derive tourism_per_capita = tourism_arrivals / population
  if (derivedData.tourismArrivals) {
    let derived = 0;
    for (const [name, { value: arrivals }] of derivedData.tourismArrivals.entries()) {
      const idx = nameLookup.get(name);
      if (idx === undefined) continue;
      const pop = parseFloat(rows[idx].population);
      if (!pop || isNaN(pop)) continue;
      rows[idx].tourism_per_capita = formatValue(arrivals / pop, 'tourism_per_capita');
      derived++;
    }
    console.log(`  tourism_per_capita: derived for ${derived} countries`);
  }

  // Derive military_expenditure_per_capita = mil_exp_usd / population
  if (derivedData.milExpUsd) {
    let derived = 0;
    for (const [name, { value: milUsd }] of derivedData.milExpUsd.entries()) {
      const idx = nameLookup.get(name);
      if (idx === undefined) continue;
      const pop = parseFloat(rows[idx].population);
      if (!pop || isNaN(pop)) continue;
      rows[idx].military_expenditure_per_capita = formatValue(milUsd / pop, 'military_expenditure_per_capita');
      derived++;
    }
    console.log(`  military_expenditure_per_capita: derived for ${derived} countries`);
  }
}

/**
 * Format a numeric value for CSV output.
 * Round to appropriate precision based on the column.
 */
function formatValue(value, column) {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';

  // Large integers: no decimals
  if (column === 'population' || column === 'gdp_nominal' || column === 'co2_total_mt' ||
      column === 'land_area_km2' || column === 'coastline_km' || column === 'net_migration_rate' ||
      column === 'unesco_world_heritage_sites') {
    return Math.round(num).toString();
  }

  // Most percentages and rates: 1 decimal
  if (column.endsWith('_pct') || column.endsWith('_pct_gdp') || column === 'life_expectancy' ||
      column === 'median_age' || column === 'fertility_rate' || column === 'unemployment_rate' ||
      column === 'inflation_rate' || column === 'homicide_rate' ||
      column === 'happiness_score' || column === 'democracy_index' ||
      column === 'average_temperature_c') {
    return parseFloat(num.toFixed(1)).toString();
  }

  // Per-1000 rates: 1 decimal
  if (column.endsWith('_per_1000') || column === 'infant_mortality_rate' ||
      column === 'child_mortality_rate') {
    return parseFloat(num.toFixed(1)).toString();
  }

  // Per-100k rates: 1 decimal
  if (column === 'maternal_mortality_ratio' || column === 'incarceration_rate') {
    return Math.round(num).toString();
  }

  // HDI, Gini, CPI: 1-3 decimals as appropriate
  if (column === 'hdi') return parseFloat(num.toFixed(3)).toString();
  if (column === 'gini_coefficient' || column === 'corruption_perceptions_index') {
    return parseFloat(num.toFixed(1)).toString();
  }

  // Per-capita values: 1 decimal
  if (column.endsWith('_per_capita')) {
    return parseFloat(num.toFixed(1)).toString();
  }

  // Elevation: no decimals
  if (column === 'average_elevation_m' || column === 'highest_point_m') {
    return Math.round(num).toString();
  }

  // Default: 2 decimals
  return parseFloat(num.toFixed(2)).toString();
}

// ─── Coverage Report ────────────────────────────────────────────────────────

function printCoverageReport(rows) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              COVERAGE REPORT                          ║');
  console.log('╠════════════════════════════════════════════════════════╣');

  const sovereignRows = rows.filter((r) => r.is_sovereign === 'true');
  const total = sovereignRows.length;

  for (const col of STAT_COLUMNS) {
    const filled = sovereignRows.filter((r) => r[col.column] && r[col.column] !== '').length;
    const pct = ((filled / total) * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(filled / total * 20)).padEnd(20, '░');
    console.log(`║ ${col.column.padEnd(35)} ${String(filled).padStart(3)}/${total} ${bar} ${pct}% ║`);
  }

  console.log('╚════════════════════════════════════════════════════════╝');
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const wbOnly = process.argv.includes('--wb-only');

  // Read existing CSV
  console.log(`Reading ${BORDERS_PATH}...`);
  const text = readFileSync(BORDERS_PATH, 'utf8');
  const { cols, rows } = parseCSV(text);
  console.log(`  ${rows.length} rows, ${cols.length} columns`);

  // Build name lookup
  const nameLookup = buildNameLookup(rows);
  console.log(`  ${nameLookup.size} lookup entries for sovereign countries`);

  // Fetch World Bank data
  const wbData = await fetchAllWorldBankData();

  // Fetch derived source data
  const derivedData = await fetchDerivedSourceData();

  // Load non-WB source data (skip if --wb-only)
  const sourceData = wbOnly ? {} : loadAllSourceData();

  // Merge everything into rows
  mergeData(rows, nameLookup, wbData, sourceData, derivedData);

  // Build output columns: original columns + new stat columns
  const statColumnNames = STAT_COLUMNS.map((c) => c.column);
  const originalCols = cols.filter((c) => !statColumnNames.includes(c));
  const outputCols = [...originalCols, ...statColumnNames];

  // Write enriched CSV
  console.log(`\nWriting ${BORDERS_PATH}...`);
  writeFileSync(BORDERS_PATH, toCSV(outputCols, rows), 'utf8');
  console.log(`  ${outputCols.length} columns (${statColumnNames.length} stat columns added)`);

  // Print coverage report
  printCoverageReport(rows);

  // Log unmatched World Bank countries for debugging
  console.log('\nUnmatched World Bank countries:');
  const allWBNames = new Set();
  for (const countryMap of wbData.values()) {
    for (const name of countryMap.keys()) {
      allWBNames.add(name);
    }
  }
  const unmatched = [...allWBNames].filter((name) => !nameLookup.has(name)).sort();
  if (unmatched.length > 0) {
    for (const name of unmatched) {
      console.log(`  - "${name}"`);
    }
  } else {
    console.log('  (none)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
