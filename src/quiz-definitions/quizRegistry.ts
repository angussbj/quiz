import type { QuizDefinition, SortColumnDefinition } from './QuizDefinition';
import type { SelectToggleDefinition } from '../quiz-modes/ToggleDefinition';

/** Build a data display selectToggle from sort column definitions. */
function buildDataDisplayToggle(
  key: string,
  label: string,
  sortColumns: ReadonlyArray<SortColumnDefinition>,
): SelectToggleDefinition {
  return {
    key,
    label,
    group: 'display',
    defaultValue: 'none',
    renderAs: 'dropdown',
    options: [
      { value: 'none', label: 'None' },
      ...sortColumns.map((c) => ({
        value: c.column,
        label: c.label,
        ...(c.category ? { category: c.category } : {}),
        ...(c.missingLabel ? { missingLabel: c.missingLabel } : {}),
      })),
    ],
  };
}

/** Build a color-by-data selectToggle from sort column definitions. */
function buildColorToggle(
  key: string,
  label: string,
  sortColumns: ReadonlyArray<SortColumnDefinition>,
  extraOptions?: ReadonlyArray<{ readonly value: string; readonly label: string }>,
): SelectToggleDefinition {
  return {
    key,
    label,
    group: 'display',
    defaultValue: 'none',
    renderAs: 'dropdown',
    options: [
      { value: 'none', label: 'None' },
      ...(extraOptions ?? []),
      ...sortColumns.map((c) => ({
        value: c.column,
        label: c.label,
        ...(c.category ? { category: c.category } : {}),
      })),
    ],
  };
}

/**
 * Static registry of all available quizzes.
 * Each entry is a complete QuizDefinition with metadata and data paths.
 * The navigation tree is built from these definitions' path segments.
 *
 * Add new quizzes here. Order determines display order within categories.
 */

/**
 * Shared configuration for all capitals quizzes.
 * Individual definitions spread this and add id, title, description, and dataFilter.
 */
const capitalsQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showRegionColors', label: 'Region colors', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showCityNames', label: 'City names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showCountryNames', label: 'Country names on map', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showPromptCountryNames', label: 'Country names in prompt', defaultValue: true, group: 'display', hiddenBehavior: 'never', promptField: { type: 'text', column: 'country' }, modes: ['prompted-recall'] } as const,
  ],
  selectToggles: [
    { key: 'showPromptFlags', label: 'Flags in prompt', defaultValue: 'off', group: 'display', modes: ['prompted-recall'], promptField: { type: 'flag', column: 'country_code' }, options: [
      { value: 'off', label: 'Off' },
      { value: 'hint', label: 'Hint' },
      { value: 'on', label: 'On' },
    ] },
  ],
  presets: [],
  columnMappings: {
    answer: 'city',
    label: 'city',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'country',
    code: 'country_code',
  },
  dataPath: '/data/capitals/world-capitals.csv',
  supportingDataPaths: ['/data/borders/world-borders.csv', '/data/lakes/large-lakes.csv'],
  locateThresholds: { correct: 100, correctSecond: 200, correctThird: 300 },
  modeConstraints: {
    identify: [
      { type: 'forced' as const, key: 'showCityDots', forcedValue: true, reason: 'City dots are required for clicking in identify mode' },
    ],
    'prompted-recall': [
      { type: 'atLeastOne' as const, keys: ['showPromptCountryNames', 'showPromptFlags'], reason: 'At least one prompt hint is required' },
    ],
  },
  difficultyPresets: {
    slots: [
      { label: 'Easy', mode: 'free-recall-unordered', description: 'Type capital city names from memory', toggleOverrides: { showMapFlags: true, showRegionColors: false, showCityDots: true } },
      { label: 'Medium', mode: 'identify', description: 'Click on each capital when prompted', toggleOverrides: { showMapFlags: true, showRegionColors: false, showCityDots: true } },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a dot on the map, name the capital', toggleOverrides: { showMapFlags: false, showRegionColors: false, showCityDots: true } },
    ],
  },
  advancedPanel: {
    toggleKeys: ['showMapFlags'],
    selectToggleKeys: [],
    forcedToggles: { showBorders: true, showLakes: true, showRegionColors: false, showCityDots: true },
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Sort columns for country statistics, shared between orderedRecallSortColumns and
 * the data display selectToggle. Extracted so both can reference the same array.
 */
const countrySortColumns: ReadonlyArray<SortColumnDefinition> = [
  // Demographics
  { column: 'population', label: 'Population', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'population_density', label: 'Population density (per km\u00B2)', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'population_growth_pct', label: 'Population growth (% annual)', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'median_age', label: 'Median age (years)', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'urban_population_pct', label: 'Urban population (%)', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'fertility_rate', label: 'Fertility rate (births per woman)', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'net_migration_rate', label: 'Net migration', category: 'Demographics', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Economy
  { column: 'gdp_nominal', label: 'GDP nominal (USD)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'gdp_per_capita', label: 'GDP per capita (USD)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'gdp_ppp_per_capita', label: 'GDP PPP per capita (USD)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'gdp_growth_pct', label: 'GDP growth (% annual)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'gini_coefficient', label: 'Gini coefficient', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'unemployment_rate', label: 'Unemployment rate (%)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'inflation_rate', label: 'Inflation rate (% annual)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'government_debt_pct_gdp', label: 'Government debt (% of GDP)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'tax_revenue_pct_gdp', label: 'Tax revenue (% of GDP)', category: 'Economy', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Geography & Environment
  { column: 'land_area_km2', label: 'Land area (km\u00B2)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'average_elevation_m', label: 'Average elevation (m)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'highest_point_m', label: 'Highest point (m)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'coastline_km', label: 'Coastline (km)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'forest_cover_pct', label: 'Forest cover (%)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'average_temperature_c', label: 'Average temperature (\u00B0C)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'average_rainfall_mm', label: 'Average rainfall (mm/year)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'co2_per_capita_tonnes', label: 'CO\u2082 per capita (tonnes)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'co2_total_mt', label: 'CO\u2082 total (Mt)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'pm25_concentration', label: 'PM2.5 (µg/m\u00B3)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'renewable_energy_pct', label: 'Renewable energy (%)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'protected_land_pct', label: 'Protected land area (%)', category: 'Geography & Environment', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Health
  { column: 'life_expectancy', label: 'Life expectancy (years)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'infant_mortality_rate', label: 'Infant mortality (per 1,000)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'child_mortality_rate', label: 'Child mortality, under-5 (per 1,000)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'maternal_mortality_ratio', label: 'Maternal mortality (per 100,000)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'health_expenditure_pct_gdp', label: 'Health expenditure (% of GDP)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'physicians_per_1000', label: 'Physicians (per 1,000)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'hospital_beds_per_1000', label: 'Hospital beds (per 1,000)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'obesity_rate_pct', label: 'Obesity rate (% of adults)', category: 'Health', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Education & Development
  { column: 'hdi', label: 'Human Development Index', category: 'Education & Development', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'literacy_rate_pct', label: 'Literacy rate (%)', category: 'Education & Development', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'mean_years_schooling', label: 'Mean years of schooling', category: 'Education & Development', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'education_expenditure_pct_gdp', label: 'Education expenditure (% of GDP)', category: 'Education & Development', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Governance & Security
  { column: 'military_expenditure_pct_gdp', label: 'Military expenditure (% of GDP)', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'military_expenditure_per_capita', label: 'Military expenditure per capita (USD)', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'corruption_perceptions_index', label: 'Corruption Perceptions Index', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'press_freedom_index', label: 'Press Freedom Index', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'democracy_index', label: 'Democracy Index', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'homicide_rate', label: 'Homicide rate (per 100,000)', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'incarceration_rate', label: 'Incarceration rate (per 100,000)', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'global_peace_index', label: 'Global Peace Index', category: 'Governance & Security', rankDescending: true, infoUrl: '/about/country-statistics' },
  // Aid
  { column: 'oda_given_per_capita', label: 'Foreign aid given per capita (USD)', category: 'Aid', rankDescending: true, infoUrl: '/about/country-statistics', missingLabel: 'Non-donor' },
  { column: 'oda_received_per_capita', label: 'Foreign aid received per capita (USD)', category: 'Aid', rankDescending: true, infoUrl: '/about/country-statistics', missingLabel: 'Non-recipient' },
  // Quality of Life
  { column: 'happiness_score', label: 'Happiness score', category: 'Quality of Life', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'internet_penetration_pct', label: 'Internet users (%)', category: 'Quality of Life', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'mobile_subscriptions_per_100', label: 'Mobile subscriptions (per 100)', category: 'Quality of Life', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'tourism_per_capita', label: 'Tourism arrivals per capita', category: 'Quality of Life', rankDescending: true, infoUrl: '/about/country-statistics' },
  { column: 'unesco_world_heritage_sites', label: 'UNESCO World Heritage Sites', category: 'Quality of Life', rankDescending: true, infoUrl: '/about/country-statistics' },
];

/**
 * Shared configuration for all countries quizzes.
 * Individual definitions spread this and add id, title, description, dataFilter, and group mapping.
 */
const countriesQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'free-recall-ordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: false, group: 'display', hiddenBehavior: 'never', modes: [] } as const,
    { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
  ],
  selectToggles: [
    buildDataDisplayToggle('countryData', 'Country data', countrySortColumns),
    buildColorToggle('countryColors', 'Country colors', countrySortColumns, [{ value: 'region', label: 'Region' }]),
  ],
  presets: [],
  columnMappings: {
    answer: 'name',
    label: 'name',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'group',
  },
  dataPath: '/data/borders/world-borders.csv',
  supportingDataPaths: ['/data/borders/world-borders.csv', '/data/lakes/large-lakes.csv'],
  locateDistanceMode: 'polygon-boundary' as const,
  locateThresholds: { correct: 100, correctSecond: 200, correctThird: 300 },
  rangeLabel: 'Top countries',
  orderedRecallSortColumns: countrySortColumns,
  difficultyPresets: {
    slots: [
      { label: 'Easy', mode: 'free-recall-unordered', description: 'Type country names from memory', toggleOverrides: { showMapFlags: true } },
      { label: 'Medium', mode: 'identify', description: 'Click on each country when prompted', toggleOverrides: { showMapFlags: true } },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a country highlighted, name it', toggleOverrides: { showMapFlags: false } },
    ],
  },
  advancedPanel: {
    toggleKeys: ['showMapFlags'],
    selectToggleKeys: [],
    forcedToggles: { showBorders: true, showLakes: true },
    linkedSelectToggleKeys: ['countryData', 'countryColors'],
    linkedDropdownMaxOptions: 10,
    linkedSortToggleKey: 'orderBy',
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all timeline quizzes.
 * Individual definitions spread this and add id, title, description, path, toggles, presets, columnMappings, and dataPath.
 */
const timelineQuizBase = {
  visualizationType: 'timeline' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'identify' as const,
  supportingDataPaths: [] as const,
  hideFilteredElements: true,
  difficultyPresets: {
    slots: [
      { label: 'Easy', mode: 'identify', description: 'Click on each event when prompted', toggleOverrides: { showColours: true, showDates: true } },
      { label: 'Medium', mode: 'identify', description: 'Click on each event without colour hints', toggleOverrides: { showColours: false, showDates: true } },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a bar on the timeline, name the event', toggleOverrides: { showColours: false, showDates: true } },
    ],
  },
  advancedPanel: {
    toggleKeys: ['showColours'],
    selectToggleKeys: ['datePrecision'],
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description' | 'path' | 'toggles' | 'presets' | 'columnMappings' | 'dataPath'>;

/**
 * Configuration for the largest cities by population quiz.
 * Extends capitalsQuizBase — same toggles, presets, column mappings, and constraints.
 * Adds range filtering (top N), region chip filters, ordered recall mode, and hideFilteredElements.
 */
const largestCitiesQuiz = {
  ...capitalsQuizBase,
  id: 'geo-largest-cities',
  title: 'Largest Cities',
  description: 'Name the largest cities in the world by population.',
  path: ['Geography'],
  availableModes: [...capitalsQuizBase.availableModes, 'free-recall-ordered'] as const,
  defaultMode: 'identify' as const,
  dataPath: '/data/cities/largest-cities.csv',
  initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  rangeColumn: 'rank',
  rangeLabel: 'Top cities',
  groupFilterColumn: 'region',
  groupFilterLabel: 'Region',
  hideFilteredElements: true,
  difficultyPresets: {
    slots: [
      { label: 'Easy', mode: 'identify', description: 'Click on each city when prompted', toggleOverrides: { showMapFlags: true, showRegionColors: true, showCityDots: true }, rangeMaxOverride: 20 },
      { label: 'Medium', mode: 'free-recall-unordered', description: 'Type the largest city names from memory', toggleOverrides: { showMapFlags: false, showRegionColors: false, showCityDots: true }, rangeMaxOverride: 40 },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a dot on the map, name the city', toggleOverrides: { showMapFlags: false, showRegionColors: false, showCityDots: true }, rangeMaxOverride: 100 },
    ],
  },
} satisfies QuizDefinition;

/** Sort columns for rivers, shared between orderedRecallSortColumns and data display. */
const riverSortColumns: ReadonlyArray<SortColumnDefinition> = [
  { column: 'discharge_m3s', label: 'Discharge (m\u00B3/s)', rankDescending: true },
  { column: 'length_km', label: 'Length (km)', mergeAggregation: 'sum' as const, rankDescending: true },
];

/**
 * Shared configuration for all rivers quizzes.
 */
const riversQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'free-recall-ordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'identify' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showRiverNames', label: 'River names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'includeSmallerRivers', label: 'Include smaller rivers', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'mergeTributaries', label: 'Merge tributaries', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'mergeDistributaries', label: 'Merge distributaries', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'mergeSegmentNames', label: 'Merge segment names', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
  ],
  selectToggles: [buildDataDisplayToggle('riverData', 'River data', riverSortColumns)],
  presets: [],
  columnMappings: {
    answer: 'name',
    label: 'name',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'continent',
    pathRenderStyle: 'stroke',
  },
  dataPath: '/data/rivers/world-rivers.csv',
  supportingDataPaths: ['/data/borders/world-borders.csv', '/data/lakes/medium-lakes.csv'],
  tributaryColumn: 'tributary_of',
  distributaryColumn: 'distributary_of',
  segmentColumn: 'segment_of',
  hideFilteredElements: true,
  toggleControlledFilter: {
    toggleKey: 'includeSmallerRivers',
    column: 'scalerank',
    values: ['0', '1', '2', '3', '4', '5', '6'],
  },
  elementStateColorOverrides: {
    default: 'var(--color-lake)',
    context: 'var(--color-lake)',
  },
  orderedRecallSortColumns: riverSortColumns,
  difficultyPresets: {
    slots: [
      { label: 'Easy', mode: 'identify', description: 'Click on each river when prompted', toggleOverrides: { includeSmallerRivers: true, mergeTributaries: true, mergeSegmentNames: true, mergeDistributaries: true }, rangeMaxOverride: 20 },
      { label: 'Medium', mode: 'free-recall-unordered', description: 'Type river names from memory', toggleOverrides: { includeSmallerRivers: true, mergeTributaries: false, mergeSegmentNames: true, mergeDistributaries: true }, rangeMaxOverride: 40 },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a river highlighted, name it', toggleOverrides: { includeSmallerRivers: true, mergeTributaries: false, mergeSegmentNames: false, mergeDistributaries: false }, rangeMaxOverride: 100 },
    ],
  },
  advancedPanel: {
    toggleKeys: ['includeSmallerRivers', 'mergeTributaries'],
    selectToggleKeys: [],
    forcedToggles: { showBorders: true, showLakes: true, mergeDistributaries: true, mergeSegmentNames: true },
    linkedSelectToggleKeys: ['riverData'],
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;


/**
 * Shared configuration for all country subdivision quizzes (states, provinces, etc.).
 * Each definition overrides id, title, description, dataPath, supportingDataPaths,
 * initialCameraPosition, and groupFilterColumn/Label.
 */
const subdivisionsQuizBase = {
  path: ['Geography', 'Subdivisions'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'identify' as const,
  toggles: [
    { key: 'showBorders', label: 'Borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCountryNames', label: 'Subdivision names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
  ],
  presets: [],
  columnMappings: {
    answer: 'name',
    label: 'name',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'region',
  },
  supportingDataPaths: ['/data/borders/world-borders.csv', '/data/lakes/large-lakes.csv'],
  locateDistanceMode: 'polygon-boundary' as const,
  locateThresholds: { correct: 100, correctSecond: 200, correctThird: 300 },
  difficultyPresets: {
    slots: [
      { label: 'Name from memory', mode: 'free-recall-unordered', description: 'Type names from memory' },
      { label: 'Point and click', mode: 'identify', description: 'Click on each region when prompted' },
      { label: 'Hard', mode: 'prompted-recall', description: 'See a region highlighted, name it' },
    ],
  },
  advancedPanel: {
    toggleKeys: [],
    selectToggleKeys: [],
    forcedToggles: { showBorders: true },
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description' | 'dataPath'>;

export const quizRegistry: ReadonlyArray<QuizDefinition> = [
  largestCitiesQuiz,
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-world',
    title: 'World Capitals',
    description: 'Name the capital cities of the world.',
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
    groupFilterCameraPositions: {
      Europe: { x: -25, y: -72, width: 77, height: 42 },
      Asia: { x: 25, y: -70, width: 155, height: 80 },
      Africa: { x: -25, y: -40, width: 85, height: 80 },
      'North America': { x: -130, y: -55, width: 95, height: 50 },
      'South America': { x: -85, y: -15, width: 55, height: 73 },
      Oceania: { x: 100, y: -15, width: 80, height: 55 },
    },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-world',
    title: 'World Countries',
    description: 'Identify all sovereign countries of the world on a map.',
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
    groupFilterCameraPositions: {
      Europe: { x: -25, y: -72, width: 77, height: 42 },
      Asia: { x: 25, y: -70, width: 155, height: 80 },
      Africa: { x: -25, y: -40, width: 85, height: 80 },
      'North America': { x: -130, y: -55, width: 95, height: 50 },
      'South America': { x: -85, y: -15, width: 55, height: 73 },
      Oceania: { x: 100, y: -15, width: 80, height: 55 },
    },
  },
  {
    id: 'geo-flags-world',
    title: 'World Flags',
    description: 'Match all countries of the world to their flags.',
    path: ['Geography'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'identify', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
      wikipedia: 'country',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    supportingDataPaths: [],
    modeConstraints: {
      identify: [
        { type: 'forced' as const, key: 'showCountryNames', forcedValue: false, reason: 'Country names would reveal answers in identify mode' },
      ],
    },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
    hideFilteredElements: true,
    difficultyPresets: {
      slots: [
        { label: 'Easy', mode: 'multiple-choice', description: 'Pick the matching country from options' },
        { label: 'Medium', mode: 'identify', description: "Click on each country's flag" },
        { label: 'Hard', mode: 'prompted-recall', description: 'See a flag, name the country' },
      ],
    },
    advancedPanel: {
      toggleKeys: [],
      selectToggleKeys: [],
    },
  },
  {
    id: 'sci-periodic-table',
    title: 'Periodic Table',
    description: 'Name the elements of the periodic table.',
    path: ['Science', 'Chemistry'],
    visualizationType: 'grid',
    availableModes: ['free-recall-unordered', 'prompted-recall', 'free-recall-ordered', 'identify', 'locate'],
    defaultMode: 'free-recall-unordered',
    toggles: [
      { key: 'showSymbols', label: 'Element symbols', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showAtomicNumbers', label: 'Atomic numbers', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showNames', label: 'Element names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true },
      { key: 'showAtomicWeight', label: 'Atomic weight', defaultValue: false, group: 'display', hiddenBehavior: 'never' },
    ],
    selectToggles: [
      {
        key: 'elementData',
        label: 'Element data',
        group: 'display',
        defaultValue: 'half_life',
        renderAs: 'dropdown',
        options: [
          { value: 'none', label: 'None' },
          { value: 'half_life', label: 'Half-life', missingLabel: 'Stable' },
          { value: 'density', label: 'Density (g/cm\u00B3)' },
          { value: 'standard_state', label: 'State' },
          { value: 'electronegativity', label: 'Electronegativity' },
          { value: 'melting_point', label: 'Melting point (K)' },
          { value: 'boiling_point', label: 'Boiling point (K)' },
          { value: 'year_discovered', label: 'Year discovered', missingLabel: 'Ancient' },
          { value: 'cost_usd_per_kg', label: 'Cost USD/kg (1999\u20132025)', infoUrl: '/about/element-costs' },
        ],
      },
      {
        key: 'elementColors',
        label: 'Element colors',
        group: 'display',
        defaultValue: 'none',
        renderAs: 'dropdown',
        options: [
          { value: 'none', label: 'None' },
          { value: 'category', label: 'Category' },
          { value: 'density', label: 'Density (g/cm\u00B3)' },
          { value: 'electronegativity', label: 'Electronegativity' },
          { value: 'melting_point', label: 'Melting point (K)' },
          { value: 'boiling_point', label: 'Boiling point (K)' },
          { value: 'year_discovered', label: 'Year discovered' },
          { value: 'half_life', label: 'Half-life' },
          { value: 'cost_usd_per_kg', label: 'Cost USD/kg (1999\u20132025)', infoUrl: '/about/element-costs' },
        ],
      },
    ],
    presets: [],
    columnMappings: {
      answer: 'name',
      label: 'name',
      group: 'category',
    },
    dataPath: '/data/science/chemistry/periodic-table.csv',
    supportingDataPaths: [],
    rangeLabel: 'Elements',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Element category',
    locateDistanceMode: 'grid-centroid' as const,
    locateThresholds: { correct: 0, correctSecond: 1, correctThird: 2 },
    difficultyPresets: {
      slots: [
        { label: 'Easy', mode: 'free-recall-unordered', description: 'Type element names from memory', toggleOverrides: { showSymbols: false, showAtomicNumbers: true }, selectToggleOverrides: { elementData: 'half_life', elementColors: 'category' } },
        { label: 'Medium', mode: 'free-recall-ordered', description: 'Name elements in order of atomic number', toggleOverrides: { showSymbols: false, showAtomicNumbers: true }, selectToggleOverrides: { orderBy: 'atomic_number', sortOrder: 'ascending', elementData: 'half_life', elementColors: 'category' } },
        { label: 'Hard', mode: 'prompted-recall', description: 'See an element highlighted, name it', toggleOverrides: { showSymbols: false, showAtomicNumbers: true }, selectToggleOverrides: { elementData: 'year_discovered', elementColors: 'year_discovered' } },
      ],
    },
    advancedPanel: {
      toggleKeys: [],
      selectToggleKeys: [],
      forcedToggles: { showAtomicNumbers: true },
      linkedSelectToggleKeys: ['elementData', 'elementColors'],
      linkedSortToggleKey: 'orderBy',
    },
    orderedRecallSortColumns: [
      { column: 'atomic_number', label: 'Atomic number' },
      { column: 'atomic_weight', label: 'Atomic weight' },
      { column: 'density', label: 'Density' },
      { column: 'electronegativity', label: 'Electronegativity' },
      { column: 'melting_point', label: 'Melting point' },
      { column: 'boiling_point', label: 'Boiling point' },
      { column: 'year_discovered', label: 'Year discovered' },
      { column: 'half_life', label: 'Half-life' },
      { column: 'cost_usd_per_kg', label: 'Cost USD/kg (1999\u20132025)' },
    ],
  },
  {
    id: 'sci-human-bones-3d',
    title: 'Human Bones (3D)',
    description: 'Locate bones on a 3D skeleton model.',
    path: ['Science', 'Biology'],
    visualizationType: 'anatomy-3d' as const,
    availableModes: ['locate', 'free-recall-unordered', 'identify'] as const,
    defaultMode: 'locate' as const,
    toggles: [
      { key: 'showSkull',  label: 'Skull',  defaultValue: true,  group: 'regions', hiddenBehavior: 'never' } as const,
      { key: 'showTorso',  label: 'Torso',  defaultValue: true,  group: 'regions', hiddenBehavior: 'never' } as const,
      { key: 'showLimbs',  label: 'Limbs',  defaultValue: true,  group: 'regions', hiddenBehavior: 'never' } as const,
      { key: 'showHands',  label: 'Hands',  defaultValue: true,  group: 'regions', hiddenBehavior: 'never' } as const,
      { key: 'showFeet',   label: 'Feet',   defaultValue: true,  group: 'regions', hiddenBehavior: 'never' } as const,
      { key: 'showTeeth',      label: 'Teeth',           defaultValue: false, group: 'types', hiddenBehavior: 'never' } as const,
      { key: 'showCostalCart', label: 'Costal cartilage', defaultValue: false, group: 'types', hiddenBehavior: 'never' } as const,
      { key: 'showSesamoids',  label: 'Sesamoids',       defaultValue: true, group: 'types', hiddenBehavior: 'never' } as const,
      { key: 'groupBilateral', label: 'Group left/right', defaultValue: true,  group: 'grouping', hiddenBehavior: 'never' } as const,
      { key: 'groupNumbered',  label: 'Group numbered',  defaultValue: true,  group: 'grouping', hiddenBehavior: 'never' } as const,
    ],
    presets: [],
    columnMappings: {
      answer: 'name',
      label: 'name',
      group: 'region',
    },
    dataPath: '/data/bones-3d/bones.csv',
    supportingDataPaths: [] as const,
    hideUnfocusedElements: false,
    difficultyPresets: {
      slots: [
        { label: 'Easy', mode: 'identify', description: 'Click on each bone when prompted', toggleOverrides: { showHands: false, showFeet: false, showTeeth: false } },
        { label: 'Medium', mode: 'locate', description: 'Click where each bone is on the skeleton', toggleOverrides: { showHands: true, showFeet: true, showTeeth: false } },
        { label: 'Hard', mode: 'free-recall-unordered', description: 'Type bone names from memory', toggleOverrides: { showHands: true, showFeet: true, showTeeth: false } },
      ],
    },
    advancedPanel: {
      toggleKeys: ['showSkull', 'showTorso', 'showLimbs', 'showHands', 'showFeet', 'groupBilateral'],
      selectToggleKeys: [],
    },
  },
  {
    ...timelineQuizBase,
    id: 'hist-emperors-roman',
    title: 'Roman Emperors',
    description: 'Name the emperors of Rome in chronological order.',
    path: ['History', 'Ancient'],
    toggles: [
      { key: 'showLabels', label: 'Emperor names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Reign dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
        ],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: {
      answer: 'emperor',
      label: 'emperor',
    },
    dataPath: '/data/history/ancient/roman-emperors.csv',
  },
  {
    ...riversQuizBase,
    id: 'geo-rivers-world',
    title: 'World Rivers',
    description: 'Name the major rivers of the world.',
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
    rangeLabel: 'Top rivers',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    groupFilterCameraPositions: {
      Europe: { x: -25, y: -72, width: 77, height: 42 },
      Asia: { x: 25, y: -70, width: 155, height: 80 },
      Africa: { x: -25, y: -40, width: 85, height: 80 },
      'North America': { x: -130, y: -55, width: 80, height: 50 },
      'South America': { x: -85, y: -15, width: 55, height: 73 },
      Oceania: { x: 100, y: -15, width: 80, height: 55 },
    },
  },

  // ===== Modern History =====
  {
    ...timelineQuizBase,
    id: 'hist-modern-history',
    title: 'Modern History',
    description: 'Place the defining events of the modern era (1440–present) on a timeline.',
    path: ['History', 'Modern'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Group colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
      {
        key: 'groupBy',
        label: 'Group by',
        options: [
          { value: 'none', label: 'None' },
          { value: 'region', label: 'Region' },
          { value: 'theme', label: 'Theme' },
        ],
        defaultValue: 'region',
        group: 'filters',
      },
    ],
    presets: [],
    columnMappings: { answer: 'event', label: 'event', group: 'region' },
    dataPath: '/data/history/modern/modern-history.csv',
    dynamicGrouping: {
      selectToggleKey: 'groupBy',
      options: {
        none: undefined,
        region: { column: 'region', chipLabel: 'Region' },
        theme: { column: 'theme', chipLabel: 'Theme' },
      },
    },
    hideFilteredElements: true,
  },

  // ===== World War 1 =====
  {
    ...timelineQuizBase,
    id: 'hist-timeline-ww1',
    title: 'World War I Timeline',
    description: 'Place key events of World War I on a timeline, from the July Crisis to the Paris Peace Conference.',
    path: ['History', 'Modern'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Front colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
        ],
        defaultValue: 'month',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'event', label: 'event', group: 'front' },
    dataPath: '/data/history/modern/ww1-timeline.csv',
    groupFilterColumn: 'front',
    groupFilterLabel: 'Front / Theatre',
  },

  // ===== World War 2 =====
  {
    ...timelineQuizBase,
    id: 'hist-timeline-ww2',
    title: 'World War II Timeline',
    description: 'Place key events of World War II on a timeline.',
    path: ['History', 'Modern'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true },
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showColours', label: 'Theatre colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
        ],
        defaultValue: 'month',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: {
      answer: 'event',
      label: 'event',
      group: 'theatre',
    },
    dataPath: '/data/history/modern/ww2-timeline.csv',
  },

  // ===== Geological Time =====
  {
    ...timelineQuizBase,
    id: 'sci-geological-eras',
    title: 'Geological Time',
    description: 'Place geological eons, eras, and periods on a deep-time timeline.',
    path: ['Science', 'Earth Science'],
    toggles: [
      { key: 'showLabels', label: 'Period names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Period dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Period type colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'era', label: 'era', group: 'eon' },
    dataPath: '/data/history/ancient/geological-eras.csv',
    groupFilterColumn: 'eon',
    groupFilterLabel: 'Period type',
  },

  // ===== Famous Composers =====
  {
    ...timelineQuizBase,
    id: 'hist-composers',
    title: 'Famous Composers',
    description: 'Place famous composers from all cultures on a timeline by their lifespans.',
    path: ['History', 'Culture'],
    toggles: [
      { key: 'showLabels', label: 'Composer names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'composer', label: 'composer', group: 'continent' },
    dataPath: '/data/history/music/composers.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },

  // ===== Leaders (Political, Religious, Military, Cultural) =====
  {
    ...timelineQuizBase,
    id: 'hist-leaders-political',
    title: 'Famous Political Leaders',
    description: 'Place famous political leaders from all cultures and eras on a timeline by their lifespans.',
    path: ['History', 'Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/political-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-religious',
    title: 'Famous Religious Leaders',
    description: 'Place famous religious leaders and spiritual figures from all traditions on a timeline.',
    path: ['History', 'Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/religious-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-military',
    title: 'Famous Military Leaders',
    description: 'Place famous generals, admirals, and military commanders from all cultures on a timeline.',
    path: ['History', 'Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/military-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-cultural',
    title: 'Famous Cultural Figures',
    description: 'Place famous artists, writers, philosophers, and scientists from all cultures on a timeline.',
    path: ['History', 'Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Figure names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'figure', label: 'figure', group: 'continent' },
    dataPath: '/data/history/leaders/cultural-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },

  // ===== Technology Inventions =====
  {
    ...timelineQuizBase,
    id: 'hist-major-inventions',
    title: 'Major Technology Inventions',
    description: 'Place the 50 most significant technology inventions in history on a timeline.',
    path: ['History', 'Science & Technology'],
    toggles: [
      { key: 'showLabels', label: 'Invention names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Invention dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'invention', label: 'invention', group: 'category' },
    dataPath: '/data/history/technology/major-inventions.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Category',
    timeScale: 'log' as const,
  },

  // ===== Species Evolution =====
  {
    ...timelineQuizBase,
    id: 'sci-species-evolution-major',
    title: 'Species Evolution',
    description: 'Place the major milestones of life on Earth on a deep-time timeline.',
    path: ['Science', 'Biology'],
    toggles: [
      { key: 'showLabels', label: 'Species names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Timeline dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Group colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'species', label: 'species', group: 'group' },
    dataPath: '/data/history/science/species-evolution-major.csv',
    groupFilterColumn: 'group',
    groupFilterLabel: 'Life group',
    timeScale: 'log' as const,
  },
  {
    ...timelineQuizBase,
    id: 'sci-species-evolution-all',
    title: 'Species Evolution (Detailed)',
    description: 'Place 98 species and evolutionary milestones on a deep-time timeline.',
    path: ['Science', 'Biology'],
    toggles: [
      { key: 'showLabels', label: 'Species names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Timeline dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Group colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'species', label: 'species', group: 'group' },
    dataPath: '/data/history/science/species-evolution-all.csv',
    groupFilterColumn: 'group',
    groupFilterLabel: 'Life group',
    timeScale: 'log' as const,
  },

  // ===== Space Exploration =====
  {
    ...timelineQuizBase,
    id: 'hist-space-milestones',
    title: 'Space Exploration Milestones',
    description: 'Place key milestones in space exploration and space technology on a timeline.',
    path: ['History', 'Science & Technology'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
        ],
        defaultValue: 'month',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'event', label: 'event', group: 'category' },
    dataPath: '/data/history/space/space-milestones.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Mission type',
  },

  // ===== My Suggestions: Major Empires =====
  {
    ...timelineQuizBase,
    id: 'hist-major-empires',
    title: 'Major Empires',
    description: 'Place major empires from all continents and eras on a timeline.',
    path: ['History', 'Ancient'],
    toggles: [
      { key: 'showLabels', label: 'Empire names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Empire dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'empire', label: 'empire', group: 'continent' },
    dataPath: '/data/history/ancient/major-empires.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
    timeScale: 'log' as const,
  },

  // ===== My Suggestions: Ancient Civilizations =====
  {
    ...timelineQuizBase,
    id: 'hist-ancient-civilizations',
    title: 'Ancient Civilizations',
    description: 'Place ancient and classical civilizations from around the world on a timeline.',
    path: ['History', 'Ancient'],
    toggles: [
      { key: 'showLabels', label: 'Civilization names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Civilization dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'civilization', label: 'civilization', group: 'continent' },
    dataPath: '/data/history/ancient/ancient-civilizations.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },

  // ===== My Suggestions: Art Movements =====
  {
    ...timelineQuizBase,
    id: 'hist-art-movements',
    title: 'Art Movements',
    description: 'Place major art movements and cultural periods from around the world on a timeline.',
    path: ['History', 'Culture'],
    toggles: [
      { key: 'showLabels', label: 'Movement names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Movement dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'movement', label: 'movement', group: 'category' },
    dataPath: '/data/history/culture/art-movements.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Art form',
    timeScale: 'log' as const,
  },

  // ===== My Suggestions: Pandemics =====
  {
    ...timelineQuizBase,
    id: 'hist-pandemics',
    title: 'Major Pandemics',
    description: 'Place major pandemics and epidemics throughout history on a timeline.',
    path: ['History', 'Science & Technology'],
    toggles: [
      { key: 'showLabels', label: 'Pandemic names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Pandemic dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [{ value: 'year', label: 'Year' }],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'pandemic', label: 'pandemic', group: 'category' },
    dataPath: '/data/history/science/pandemics.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Disease type',
    timeScale: 'log' as const,
  },

  // ===== My Suggestions: Scientific Discoveries =====
  {
    ...timelineQuizBase,
    id: 'hist-scientific-discoveries',
    title: 'Scientific Discoveries',
    description: 'Place major scientific discoveries and theories on a timeline.',
    path: ['History', 'Science & Technology'],
    toggles: [
      { key: 'showLabels', label: 'Discovery names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
      { key: 'showDates', label: 'Discovery dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showFieldColours', label: 'Field colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    ],
    selectToggles: [
      {
        key: 'datePrecision',
        label: 'Date precision',
        options: [
          { value: 'year', label: 'Year' },
          { value: 'month', label: 'Month' },
          { value: 'day', label: 'Day' },
        ],
        defaultValue: 'year',
        group: 'display',
        modes: ['locate'],
      },
    ],
    presets: [],
    columnMappings: { answer: 'discovery', label: 'discovery', group: 'field' },
    dataPath: '/data/history/science/scientific-discoveries.csv',
    groupFilterColumn: 'field',
    groupFilterLabel: 'Scientific field',
    timeScale: 'log' as const,
    difficultyPresets: {
      slots: [
        { label: 'Easy', mode: 'identify', description: 'Click on each discovery when prompted', toggleOverrides: { showFieldColours: true, showDates: true } },
        { label: 'Medium', mode: 'identify', description: 'Click on each discovery without colour hints', toggleOverrides: { showFieldColours: false, showDates: true } },
        { label: 'Hard', mode: 'prompted-recall', description: 'See a bar on the timeline, name the discovery', toggleOverrides: { showFieldColours: false, showDates: true } },
      ],
    },
    advancedPanel: {
      toggleKeys: ['showFieldColours'],
      selectToggleKeys: ['datePrecision'],
    },
  },

  // ===== Country Subdivisions =====
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-us',
    title: 'US States',
    description: 'Name all 50 US states.',
    dataPath: '/data/subdivisions/united-states.csv',
    initialCameraPosition: { x: -125, y: -50, width: 60, height: 30 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-india',
    title: 'Indian States',
    description: 'Name the states and union territories of India.',
    dataPath: '/data/subdivisions/india.csv',
    initialCameraPosition: { x: 68, y: -37, width: 30, height: 30 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-china',
    title: 'Chinese Provinces',
    description: 'Name the provinces, autonomous regions, and municipalities of China.',
    dataPath: '/data/subdivisions/china.csv',
    initialCameraPosition: { x: 73, y: -53, width: 62, height: 37 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-brazil',
    title: 'Brazilian States',
    description: 'Name the 26 states and federal district of Brazil.',
    dataPath: '/data/subdivisions/brazil.csv',
    initialCameraPosition: { x: -74, y: 6, width: 40, height: 40 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-russia',
    title: 'Russian Subjects',
    description: 'Name the federal subjects of Russia.',
    dataPath: '/data/subdivisions/russia.csv',
    initialCameraPosition: { x: 25, y: -72, width: 155, height: 40 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Federal district',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-mexico',
    title: 'Mexican States',
    description: 'Name the 31 states and federal district of Mexico.',
    dataPath: '/data/subdivisions/mexico.csv',
    initialCameraPosition: { x: -118, y: -32, width: 35, height: 20 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-indonesia',
    title: 'Indonesian Provinces',
    description: 'Name the provinces of Indonesia.',
    dataPath: '/data/subdivisions/indonesia.csv',
    initialCameraPosition: { x: 95, y: 11, width: 50, height: 25 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Island group',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-japan',
    title: 'Japanese Prefectures',
    description: 'Name the 47 prefectures of Japan.',
    dataPath: '/data/subdivisions/japan.csv',
    initialCameraPosition: { x: 128, y: -45, width: 20, height: 20 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
  },
  {
    ...subdivisionsQuizBase,
    id: 'geo-subdivisions-nigeria',
    title: 'Nigerian States',
    description: 'Name the 36 states and federal capital territory of Nigeria.',
    dataPath: '/data/subdivisions/nigeria.csv',
    initialCameraPosition: { x: 3, y: -4, width: 15, height: 12 },
    groupFilterColumn: 'region',
    groupFilterLabel: 'Geopolitical zone',
  },
];
