/**
 * Generate largest-cities.csv from source data.
 *
 * Reads the raw population CSV and cross-references with coordinate data
 * to produce a quiz-ready CSV of the world's largest cities by population.
 *
 * Usage:
 *   npx tsx scripts/generateLargestCities.ts
 *
 * Input:
 *   raw_data/largest-cities-by-population-2026.csv  (population data)
 *   scripts/source-data/countries.json              (mledoze/countries — for region/subregion)
 *   scripts/source-data/cities.csv                  (dr5hn/countries-states-cities-database — for coordinates)
 *
 * Output:
 *   public/data/cities/largest-cities.csv
 *
 * Source files (gitignored). Download before running:
 *   curl -L https://raw.githubusercontent.com/mledoze/countries/master/countries.json \
 *     -o scripts/source-data/countries.json
 *   curl -L https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv \
 *     -o scripts/source-data/cities.csv
 *
 * The population numbers, growth rates, and ranks come from the raw CSV.
 * Coordinates come from SimpleMaps worldcities, with manual overrides where needed.
 * Region/subregion come from mledoze/countries.json via the cca2 country code.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface CountryEntry {
  readonly cca2: string;
  readonly name: { readonly common: string };
  readonly region: string;
  readonly subregion?: string;
}

interface RawCity {
  readonly city: string;
  readonly country: string;
  readonly cca2: string;
  readonly population: number;
  readonly growthRate: number;
  readonly rank: number;
  readonly type: string;
}

// ------------------------------------------------------------------
// CSV helpers
// ------------------------------------------------------------------

function parseCsvLine(line: string): ReadonlyArray<string> {
  const result: Array<string> = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('|') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ------------------------------------------------------------------
// Manual coordinate overrides for cities not found in worldcities DB
// or with incorrect matches.
// Format: key is "city|cca2" (matching raw CSV), value is { lat, lng }
// ------------------------------------------------------------------

const COORDINATE_OVERRIDES: Readonly<Record<string, { readonly lat: number; readonly lng: number }>> = {
  // Cities not found in dr5hn database (name mismatch or missing)
  'Shanghai|CN': { lat: 31.2304, lng: 121.4737 },
  'Chongqing|CN': { lat: 29.5630, lng: 106.5516 },
  'Buenos Aires|AR': { lat: -34.6037, lng: -58.3816 },
  'Manila|PH': { lat: 14.5995, lng: 120.9842 },
  'Tianjin|CN': { lat: 39.3434, lng: 117.3616 },
  'Bangalore|IN': { lat: 12.9716, lng: 77.5946 },
  'Bogota|CO': { lat: 4.7110, lng: -74.0721 },
  'Jakarta|ID': { lat: -6.2088, lng: 106.8456 },
  'New York|US': { lat: 40.7128, lng: -74.0060 },
  'Hong Kong|HK': { lat: 22.3193, lng: 114.1694 },
  'Hanoi|VN': { lat: 21.0285, lng: 105.8542 },
  'Brasilia|BR': { lat: -15.7975, lng: -47.8919 },
  'Yaounde|CM': { lat: 3.8480, lng: 11.5021 },
  'Montreal|CA': { lat: 45.5017, lng: -73.5673 },
  'Antananarivo|MG': { lat: -18.8792, lng: 47.5079 },
  'Medellin|CO': { lat: 6.2442, lng: -75.5812 },
  'Asuncion|PY': { lat: -25.2867, lng: -57.6470 },
  'Huaian|CN': { lat: 33.5010, lng: 119.0230 },
  'Izmir|TR': { lat: 38.4192, lng: 27.1287 },
  'Goiania|BR': { lat: -16.6869, lng: -49.2648 },
  'Belem|BR': { lat: -1.4558, lng: -48.5044 },
  'Lome|TG': { lat: 6.1375, lng: 1.2123 },
  'Bursa|TR': { lat: 40.1885, lng: 29.0610 },
  'Lianyungang|CN': { lat: 34.5966, lng: 119.2216 },
  'Panama City|PA': { lat: 8.9936, lng: -79.5197 },
  'Santa Cruz|BO': { lat: -17.7833, lng: -63.1821 },
  'Kananga|CD': { lat: -5.8963, lng: 22.4167 },
  'Gaziantep|TR': { lat: 37.0662, lng: 37.3833 },
  'Suqian|CN': { lat: 33.9333, lng: 118.2833 },
  'Nouakchott|MR': { lat: 18.0735, lng: -15.9582 },
  'Cordoba|AR': { lat: -31.4135, lng: -64.1811 },
  'Ciudad Juarez|MX': { lat: 31.6904, lng: -106.4245 },
  'Daejon|KR': { lat: 36.3504, lng: 127.3845 },
  'Basra|IQ': { lat: 30.5085, lng: 47.7804 },
  'San Jose|CR': { lat: 9.9281, lng: -84.0907 },
  'Liuan|CN': { lat: 31.7556, lng: 116.5139 },
  'Queretaro|MX': { lat: 20.5888, lng: -100.3899 },
  'Konya|TR': { lat: 37.8746, lng: 32.4932 },
  'Zurich|CH': { lat: 47.3769, lng: 8.5417 },
  'Joao Pessoa|BR': { lat: -7.1195, lng: -34.8450 },
  'Belgrade|RS': { lat: 44.8176, lng: 20.4569 },
  'Maceio|BR': { lat: -9.6658, lng: -35.7350 },
  'Suweon|KR': { lat: 37.2636, lng: 127.0286 },
  'Astana|KZ': { lat: 51.1801, lng: 71.4460 },
  'Mysore|IN': { lat: 12.2958, lng: 76.6394 },
  'Ruian|CN': { lat: 27.7767, lng: 120.6553 },
  'Florianopolis|BR': { lat: -27.5954, lng: -48.5480 },
  'San Luis Potosi|MX': { lat: 22.1565, lng: -100.9855 },
  'Xiongan|CN': { lat: 39.0380, lng: 115.9930 },
  'Merida|MX': { lat: 20.9674, lng: -89.5926 },
  'Shimkent|KZ': { lat: 42.3000, lng: 69.6000 },
  'Yongin|KR': { lat: 37.2411, lng: 127.1776 },
  'Cologne|DE': { lat: 50.9333, lng: 6.9500 },
  'Diyarbakir|TR': { lat: 37.9144, lng: 40.2306 },
  'Rostov-on-Don|RU': { lat: 47.2357, lng: 39.7015 },
  'Goyang|KR': { lat: 37.6564, lng: 126.8350 },
  'Hamah|SY': { lat: 35.1318, lng: 36.7519 },
  'Cartagena|CO': { lat: 10.3910, lng: -75.4794 },
  'Cancun|MX': { lat: 21.1619, lng: -86.8515 },
  'Antwerp|BE': { lat: 51.2194, lng: 4.4025 },
  'Taiz|YE': { lat: 13.5789, lng: 44.0209 },
  'Valparaiso|CL': { lat: -33.0472, lng: -71.6127 },
  'Zamboanga City|PH': { lat: 6.9214, lng: 122.0790 },
  'Cucuta|CO': { lat: 7.8939, lng: -72.5078 },
  'Seongnam|KR': { lat: 37.4386, lng: 127.1378 },
  'Concepcion|CL': { lat: -36.8270, lng: -73.0503 },
  'Culiacan|MX': { lat: 24.7994, lng: -107.3879 },
  'Eskisehir|TR': { lat: 39.7767, lng: 30.5206 },
  'Sulaimaniya|IQ': { lat: 35.5575, lng: 45.4348 },
  'Dasmarinas|PH': { lat: 14.3294, lng: 120.9367 },
  'Cagayan de Oro City|PH': { lat: 8.4822, lng: 124.6472 },
  'Oshogbo|NG': { lat: 7.7827, lng: 4.5418 },
  'Gaza|PS': { lat: 31.5017, lng: 34.4674 },
  'Xalapa|MX': { lat: 19.5438, lng: -96.9102 },
  'Bucheon|KR': { lat: 37.4989, lng: 126.7831 },
  'Belgaum|IN': { lat: 15.8497, lng: 74.4977 },
  'Thessaloniki|GR': { lat: 40.6401, lng: 22.9444 },
  'Frankfurt|DE': { lat: 50.1109, lng: 8.6821 },
  'Maturin|VE': { lat: 9.7456, lng: -63.1836 },
  'Amara|IQ': { lat: 31.8350, lng: 47.1500 },
  'Lattakia|SY': { lat: 35.5317, lng: 35.7917 },
  'Mangalore|IN': { lat: 12.9141, lng: 74.8560 },
  'Herat|AF': { lat: 34.3529, lng: 62.2040 },
  'Ansan|KR': { lat: 37.3219, lng: 126.8309 },
  'Sao Jose dos Campos|BR': { lat: -23.1794, lng: -45.8869 },
  'Krakow|PL': { lat: 50.0647, lng: 19.9450 },
  'Gulbarga|IN': { lat: 17.3297, lng: 76.8343 },
  'Bali|ID': { lat: -8.6705, lng: 115.2126 },
  'Ribeirao Preto|BR': { lat: -21.1775, lng: -47.8103 },
  // Chinese cities with province qualifiers
  'Ji nan Shandong|CN': { lat: 36.6512, lng: 116.9986 },
  'Taiyuan Shanxi|CN': { lat: 37.8706, lng: 112.5489 },
  'Tangshan Hebei|CN': { lat: 39.6292, lng: 118.1742 },
  'Fuzhou Fujian|CN': { lat: 26.0745, lng: 119.2965 },
  'Taian Shandong|CN': { lat: 36.2000, lng: 117.0867 },
  'Jining Shandong|CN': { lat: 35.4000, lng: 116.5867 },
  'Linyi Shandong|CN': { lat: 35.1042, lng: 118.3564 },
  'Taizhou Zhejiang|CN': { lat: 28.6583, lng: 121.4221 },
  'Taizhou Jiangsu|CN': { lat: 32.4906, lng: 119.9148 },
  'Yancheng Jiangsu|CN': { lat: 33.3477, lng: 120.1631 },
  'Pingdingshan Henan|CN': { lat: 33.7659, lng: 113.1927 },
  'Zhenjiang Jiangsu|CN': { lat: 32.1872, lng: 119.4249 },
  'Jixi Heilongjiang|CN': { lat: 45.2956, lng: 130.9694 },
  'Fuzhou Jiangxi|CN': { lat: 27.9598, lng: 116.3581 },
  'Yichun Jiangxi|CN': { lat: 27.8043, lng: 114.4163 },
  'Xiangtan Hunan|CN': { lat: 27.8293, lng: 112.9440 },
  'Pingxiang Jiangxi|CN': { lat: 27.6167, lng: 113.8500 },
  'Nanyang Henan|CN': { lat: 32.9987, lng: 112.5283 },
  'Mianyang Sichuan|CN': { lat: 31.4679, lng: 104.6791 },
  'Suining Sichuan|CN': { lat: 30.5333, lng: 105.5928 },
  'Linfen|CN': { lat: 36.0881, lng: 111.5190 },
  'Xianyang Shaanxi|CN': { lat: 34.3456, lng: 108.7147 },
  'Yulin Shaanxi|CN': { lat: 38.2655, lng: 109.7344 },
  "Ma'anshan|CN": { lat: 31.6886, lng: 118.5074 },
  'Wuhu Anhui|CN': { lat: 31.3340, lng: 118.3622 },
  'Jingzhou Hubei|CN': { lat: 30.3267, lng: 112.2391 },
  'Fushun Liaoning|CN': { lat: 41.8708, lng: 123.8864 },
  'Erduosi-Ordoss|CN': { lat: 39.6086, lng: 109.7814 },
  'Xi-an|CN': { lat: 34.2658, lng: 108.9541 },
  'Haerbin|CN': { lat: 45.7500, lng: 126.6500 },
  'Qiqihaer|CN': { lat: 47.3500, lng: 123.9667 },
  'Sao Paulo|BR': { lat: -23.5505, lng: -46.6333 },
  'Belo Horizonte|BR': { lat: -19.9167, lng: -43.9333 },
  'Grande Vitoria|BR': { lat: -20.3155, lng: -40.3128 },
  'Grande Sao Luis|BR': { lat: -2.5297, lng: -44.2826 },
  'Baixada Santista|BR': { lat: -23.9608, lng: -46.3336 },
  'Ho Chi Minh City|VN': { lat: 10.8231, lng: 106.6297 },
  'Hai Phong|VN': { lat: 20.8449, lng: 106.6881 },
  'Bien Hoa|VN': { lat: 10.9500, lng: 106.8167 },
  'Can Tho|VN': { lat: 10.0333, lng: 105.7833 },
  'Da Nang|VN': { lat: 16.0544, lng: 108.2022 },
  'N-Djamena|TD': { lat: 12.1348, lng: 15.0557 },
  'Nay Pyi Taw|MM': { lat: 19.7633, lng: 96.0785 },
  'Jiddah|SA': { lat: 21.5433, lng: 39.1728 },
  'Hufuf-Mubarraz|SA': { lat: 25.3648, lng: 49.5879 },
  'Ad-Dammam|SA': { lat: 26.4207, lng: 50.0888 },
  'Tel Aviv|IL': { lat: 32.0853, lng: 34.7818 },
  'New Taipei|TW': { lat: 25.0120, lng: 121.4654 },
  'Gaoxiong|TW': { lat: 22.6273, lng: 120.3014 },
  'Taizhong|TW': { lat: 24.1477, lng: 120.6736 },
  'Kozhikode|IN': { lat: 11.2588, lng: 75.7804 },
  'Malappuram|IN': { lat: 11.0510, lng: 76.0711 },
  'Thrissur|IN': { lat: 10.5276, lng: 76.2144 },
  'Kochi|IN': { lat: 9.9312, lng: 76.2673 },
  'Kollam|IN': { lat: 8.8932, lng: 76.6141 },
  'Thiruvananthapuram|IN': { lat: 8.5241, lng: 76.9366 },
  'Kannur|IN': { lat: 11.8745, lng: 75.3704 },
  'Cherthala|IN': { lat: 9.6846, lng: 76.3389 },
  'Kottayam|IN': { lat: 9.5916, lng: 76.5222 },
  'Kayamkulam|IN': { lat: 9.1747, lng: 76.5010 },
  'Durg-Bhilainagar|IN': { lat: 21.1904, lng: 81.2849 },
  'Hubli-Dharwad|IN': { lat: 15.3647, lng: 75.1240 },
  'Nanded Waghala|IN': { lat: 19.1383, lng: 77.3210 },
  'Ekurhuleni|ZA': { lat: -26.1496, lng: 28.3122 },
  'Soshanguve|ZA': { lat: -25.4869, lng: 28.0869 },
  'West Rand|ZA': { lat: -26.1667, lng: 27.6500 },
  'Vereeniging|ZA': { lat: -26.6736, lng: 27.9318 },
  'Buffalo City|ZA': { lat: -32.9872, lng: 27.8716 },
  'Leon de los Aldamas|MX': { lat: 21.1221, lng: -101.6811 },
  'Toluca de Lerdo|MX': { lat: 19.2826, lng: -99.6557 },
  'La Laguna|MX': { lat: 25.5428, lng: -103.4068 },
  'Acapulco de Juarez|MX': { lat: 16.8636, lng: -99.8825 },
  'Tuxtla Gutierrez|MX': { lat: 16.7528, lng: -93.1150 },
  'Oaxaca de Juarez|MX': { lat: 17.0732, lng: -96.7266 },
  'San Miguel de Tucuman|AR': { lat: -26.8083, lng: -65.2176 },
  'Barcelona Puerto La Cruz|VE': { lat: 10.1222, lng: -64.6868 },
  'Sekondi Takoradi|GH': { lat: 4.9340, lng: -1.7137 },
  'Blantyre-Limbe|MW': { lat: -15.7667, lng: 35.0167 },
  'Abomey-Calavi|BJ': { lat: 6.4499, lng: 2.3553 },
  'San Pedro Sula|HN': { lat: 15.5, lng: -88.0333 },
  'Port-au-Prince|HT': { lat: 18.5392, lng: -72.3350 },
  'Dar es Salaam|TZ': { lat: -6.7924, lng: 39.2083 },
  'Bobo-Dioulasso|BF': { lat: 11.1833, lng: -4.2917 },
  'Bandar Lampung|ID': { lat: -5.4500, lng: 105.2667 },
  'Pekan Baru|ID': { lat: 1.4667, lng: 102.1333 },
  'Ar-Rayyan|QA': { lat: 25.2919, lng: 51.4244 },
  'Bur Sa\'id|EG': { lat: 31.2653, lng: 32.3019 },
  'West Yorkshire|GB': { lat: 53.7997, lng: -1.5491 },
  'Hempstead|US': { lat: 40.7062, lng: -73.6187 },
  'Samut Prakan|TH': { lat: 13.5990, lng: 100.5998 },
  'Chon Buri|TH': { lat: 13.3611, lng: 100.9847 },
  'Nonthaburi|TH': { lat: 13.8591, lng: 100.5217 },
  'Pathum Thani|TH': { lat: 14.0208, lng: 100.5250 },
  'Nakhon Ratchasima|TH': { lat: 14.9799, lng: 102.0978 },
  'Songkhla|TH': { lat: 7.1897, lng: 100.5954 },
  'Gold Coast|AU': { lat: -28.0167, lng: 153.4000 },
  'Quebec City|CA': { lat: 46.8139, lng: -71.2080 },
  'Gebze|TR': { lat: 40.8028, lng: 29.4307 },
  'Mbuji-Mayi|CD': { lat: -6.1500, lng: 23.6000 },
  'Hargeysa|SO': { lat: 9.5600, lng: 44.0650 },
  'Merca|SO': { lat: 1.7089, lng: 44.7728 },
  'Al-Hudaydah|YE': { lat: 14.7979, lng: 42.9544 },
  'Misratah|LY': { lat: 32.3754, lng: 15.0925 },
  'Banghazi|LY': { lat: 32.1167, lng: 20.0667 },
};

// ------------------------------------------------------------------
// City name aliases: raw CSV name → worldcities lookup name
// When the raw CSV uses a non-standard romanisation, map it to the
// name used in the SimpleMaps worldcities database.
// ------------------------------------------------------------------

const CITY_NAME_ALIASES: Readonly<Record<string, string>> = {
  'Xi-an': 'Xian',
  'Haerbin': 'Harbin',
  'Qiqihaer': 'Qiqihar',
  'Sao Paulo': 'São Paulo',
  'Ho Chi Minh City': 'Ho Chi Minh City',
  'Bogota': 'Bogotá',
  'Jiddah': 'Jeddah',
  'Esfahan': 'Isfahan',
  'Orumiyeh': 'Urmia',
  'Pyongyang': "P'yŏngyang",
  'Sanaa': "Sana'a",
  'Kiev': 'Kyiv',
  'Kharkiv': 'Kharkiv',
  'Dnipro': 'Dnipro',
  'Odesa': 'Odessa',
  'Tanger': 'Tangier',
  'Fes': 'Fez',
  'Kuerle': 'Korla',
};

// ------------------------------------------------------------------
// Display name overrides (when the raw CSV name is awkward for display)
// ------------------------------------------------------------------

const DISPLAY_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  'Xi-an': "Xi'an",
  'Haerbin': 'Harbin',
  'Qiqihaer': 'Qiqihar',
  'Sao Paulo': 'São Paulo',
  'N-Djamena': "N'Djamena",
  'Jiddah': 'Jeddah',
  'Esfahan': 'Isfahan',
  'Orumiyeh': 'Urmia',
  'Tanger': 'Tangier',
  'Fes': 'Fez',
  'Kuerle': 'Korla',
  'Bur Sa\'id': 'Port Said',
  'Hufuf-Mubarraz': 'Al-Hofuf',
  'Erduosi-Ordoss': 'Ordos',
  'Gaoxiong': 'Kaohsiung',
  'Taizhong': 'Taichung',
  'New Taipei': 'New Taipei City',
};

// ------------------------------------------------------------------
// Alternate names for answer matching
// ------------------------------------------------------------------

const ALTERNATE_NAMES: Readonly<Record<string, string>> = {
  'Tokyo': 'Tōkyō|Tokio',
  'Delhi': 'New Delhi|Nai Dilli',
  'Sao Paulo': 'Sao Paulo|San Pablo',
  'Beijing': 'Peking',
  'Mumbai': 'Bombay',
  'Kolkata': 'Calcutta',
  'Chennai': 'Madras',
  'Bangalore': 'Bengaluru',
  'Istanbul': 'Constantinople',
  'Bogota': 'Bogotá',
  'Xi-an': "Xi'an|Xian|Chang'an",
  'Haerbin': 'Harbin|Ha-erh-pin',
  'Qiqihaer': 'Qiqihar',
  'Ho Chi Minh City': 'Saigon|HCMC',
  'Kiev': 'Kyiv',
  'Jiddah': 'Jeddah|Jedda',
  'Esfahan': 'Isfahan|Esfahan',
  'N-Djamena': "N'Djamena|Ndjamena",
  'Tanger': 'Tangier|Tanger',
  'Fes': 'Fez',
  'Dar es Salaam': 'Dar-es-Salaam',
  'Yangon': 'Rangoon',
  'Dhaka': 'Dacca',
  'Guangzhou': 'Canton',
  'Fukuoka': 'Hakata',
  'Orumiyeh': 'Urmia|Orumiyeh',
  'Gaoxiong': 'Kaohsiung',
  'Taizhong': 'Taichung',
  'Kuerle': 'Korla',
  'Bur Sa\'id': 'Port Said',
  'Hufuf-Mubarraz': 'Al-Hofuf|Hofuf',
  'Erduosi-Ordoss': 'Ordos|Eerduosi',
  'Mbuji-Mayi': 'Mbujimayi',
  'Hargeysa': 'Hargeisa',
  'Merca': 'Marka',
};

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

const rawCsvPath = resolve(__dirname, '..', 'raw_data', 'largest-cities-by-population-2026.csv');
const countriesJsonPath = resolve(__dirname, 'source-data', 'countries.json');
const citiesCsvPath = resolve(__dirname, 'source-data', 'cities.csv');
const outputDir = resolve(__dirname, '..', 'public', 'data', 'cities');
const outputPath = resolve(outputDir, 'largest-cities.csv');

// --- Load raw population data ---
const rawText = readFileSync(rawCsvPath, 'utf8');
const rawLines = rawText.trim().split('\n');
const rawHeader = parseCsvLine(rawLines[0]);

function colIndex(name: string): number {
  const idx = rawHeader.indexOf(name);
  if (idx === -1) throw new Error(`Column "${name}" not found in raw CSV. Available: ${rawHeader.join(', ')}`);
  return idx;
}

const iCity = colIndex('city');
const iCountry = colIndex('country');
const iCca2 = colIndex('cca2');
const iPop2026 = colIndex('pop2026');
const iGrowthRate = colIndex('growthRate');
const iRank = colIndex('rank');
const iType = colIndex('type');

const rawCities: Array<RawCity> = [];
for (let i = 1; i < rawLines.length; i++) {
  const cols = parseCsvLine(rawLines[i]);
  if (cols.length < rawHeader.length) continue;
  rawCities.push({
    city: cols[iCity],
    country: cols[iCountry],
    cca2: cols[iCca2].toUpperCase(),
    population: parseInt(cols[iPop2026], 10),
    growthRate: parseFloat(cols[iGrowthRate]),
    rank: parseInt(cols[iRank], 10),
    type: cols[iType],
  });
}

console.log(`Loaded ${rawCities.length} cities from raw CSV`);

// --- Load countries.json for region data ---
interface CountryRegion {
  readonly region: string;
  readonly subregion: string;
}

const regionMap = new Map<string, CountryRegion>();

if (existsSync(countriesJsonPath)) {
  const countries: ReadonlyArray<CountryEntry> = JSON.parse(readFileSync(countriesJsonPath, 'utf8'));
  for (const c of countries) {
    regionMap.set(c.cca2, {
      region: c.region,
      subregion: c.subregion ?? '',
    });
  }
  console.log(`Loaded region data for ${regionMap.size} countries`);
} else {
  console.warn('countries.json not found. Download from:');
  console.warn('  curl -L https://raw.githubusercontent.com/mledoze/countries/master/countries.json -o scripts/source-data/countries.json');
  process.exit(1);
}

// Manual region overrides for territories/special codes not in countries.json
const REGION_OVERRIDES: Readonly<Record<string, CountryRegion>> = {
  'HK': { region: 'Asia', subregion: 'Eastern Asia' },
  'TW': { region: 'Asia', subregion: 'Eastern Asia' },
  'PR': { region: 'Americas', subregion: 'Caribbean' },
  'XK': { region: 'Europe', subregion: 'Southeast Europe' },
};

function getRegion(cca2: string): CountryRegion {
  const override = REGION_OVERRIDES[cca2];
  if (override) return override;
  const entry = regionMap.get(cca2);
  if (entry) return entry;
  console.warn(`  No region data for ${cca2}`);
  return { region: 'Unknown', subregion: '' };
}

// --- Load dr5hn cities.csv for coordinate lookup ---
const cityCoords = new Map<string, { lat: number; lng: number; pop: number }>();

if (existsSync(citiesCsvPath)) {
  const wcText = readFileSync(citiesCsvPath, 'utf8');
  const wcLines = wcText.trim().split('\n');
  // dr5hn format: id,name,state_id,state_code,state_name,country_id,country_code,country_name,latitude,longitude,...,population,...
  for (let i = 1; i < wcLines.length; i++) {
    const cols = parseCsvLine(wcLines[i]);
    const cc = (cols[6] ?? '').toUpperCase();
    const cityName = cols[1] ?? '';
    const lat = parseFloat(cols[8]);
    const lng = parseFloat(cols[9]);
    const pop = parseInt(cols[14] || '0', 10);

    if (!cc || !cityName || isNaN(lat) || isNaN(lng)) continue;

    const key = `${cityName}|${cc}`;
    const existing = cityCoords.get(key);
    // Keep the entry with larger population (more likely to be the right city)
    if (!existing || pop > existing.pop) {
      cityCoords.set(key, { lat, lng, pop });
    }
  }
  console.log(`Loaded ${cityCoords.size} coordinate entries from cities.csv`);
} else {
  console.warn('cities.csv not found. Download from:');
  console.warn('  curl -L https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/csv/cities.csv -o scripts/source-data/cities.csv');
}

// --- Build output rows ---

interface OutputRow {
  readonly id: string;
  readonly city: string;
  readonly country: string;
  readonly countryCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly population: number;
  readonly growthRate: number;
  readonly rank: number;
  readonly region: string;
  readonly subregion: string;
  readonly cityAlternates: string;
}

const rows: Array<OutputRow> = [];
const missing: Array<string> = [];

for (const raw of rawCities) {
  let lat: number | undefined;
  let lng: number | undefined;

  // 1. Check manual overrides first
  const overrideKey = `${raw.city}|${raw.cca2}`;
  const override = COORDINATE_OVERRIDES[overrideKey];
  if (override) {
    lat = override.lat;
    lng = override.lng;
  }

  // 2. Try worldcities lookup
  if (lat === undefined) {
    // Try raw name
    const key1 = `${raw.city}|${raw.cca2}`;
    const coords1 = cityCoords.get(key1);
    if (coords1) {
      lat = coords1.lat;
      lng = coords1.lng;
    }
  }

  if (lat === undefined) {
    // Try alias name
    const alias = CITY_NAME_ALIASES[raw.city];
    if (alias) {
      const key2 = `${alias}|${raw.cca2}`;
      const coords2 = cityCoords.get(key2);
      if (coords2) {
        lat = coords2.lat;
        lng = coords2.lng;
      }
    }
  }

  if (lat === undefined) {
    // Try display name override
    const displayName = DISPLAY_NAME_OVERRIDES[raw.city];
    if (displayName) {
      const key3 = `${displayName}|${raw.cca2}`;
      const coords3 = cityCoords.get(key3);
      if (coords3) {
        lat = coords3.lat;
        lng = coords3.lng;
      }
    }
  }

  if (lat === undefined || lng === undefined) {
    missing.push(`${raw.rank}. ${raw.city} (${raw.country}, ${raw.cca2})`);
    continue;
  }

  const regionInfo = getRegion(raw.cca2);

  const displayName = DISPLAY_NAME_OVERRIDES[raw.city] ?? raw.city;

  const id = displayName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  rows.push({
    id,
    city: displayName,
    country: raw.country,
    countryCode: raw.cca2.toLowerCase(),
    latitude: Math.round(lat * 10000) / 10000,
    longitude: Math.round(lng * 10000) / 10000,
    population: raw.population,
    growthRate: Math.round(raw.growthRate * 100000) / 100000,
    rank: raw.rank,
    region: regionInfo.region,
    subregion: regionInfo.subregion,
    cityAlternates: ALTERNATE_NAMES[raw.city] ?? '',
  });
}

// Sort by rank
rows.sort((a, b) => a.rank - b.rank);

// Build CSV
const header = 'id,city,country,country_code,latitude,longitude,population,growth_rate,rank,region,subregion,city_alternates,label_position';
const csvRows = rows.map((r) => {
  const fields = [
    r.id,
    r.city,
    r.country,
    r.countryCode,
    String(r.latitude),
    String(r.longitude),
    String(r.population),
    String(r.growthRate),
    String(r.rank),
    r.region,
    r.subregion,
    r.cityAlternates,
    '', // label_position — computed by separate script
  ];
  return fields.map(escapeCsvField).join(',');
});

const csv = header + '\n' + csvRows.join('\n') + '\n';

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

writeFileSync(outputPath, csv);

console.log(`\nWritten ${rows.length} cities to ${outputPath}`);
if (missing.length > 0) {
  console.warn(`\nMissing coordinates (${missing.length}):`);
  for (const m of missing) {
    console.warn(`  ${m}`);
  }
}
