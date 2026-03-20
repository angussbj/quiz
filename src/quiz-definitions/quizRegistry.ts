import type { QuizDefinition } from './QuizDefinition';

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
  path: ['Geography', 'Capitals'] as const,
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showCityNames', label: 'City names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showCountryNames', label: 'Country names on map', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showPromptCountryNames', label: 'Country names in prompt', defaultValue: false, group: 'display', hiddenBehavior: 'never', promptField: { type: 'text', column: 'country' }, modes: ['identify'] } as const,
  ],
  selectToggles: [
    { key: 'showPromptFlags', label: 'Flags in prompt', defaultValue: 'off', group: 'display', modes: ['identify'], promptField: { type: 'flag', column: 'code' }, options: [
      { value: 'off', label: 'Off' },
      { value: 'hint', label: 'Hint' },
      { value: 'on', label: 'On' },
    ] },
  ],
  presets: [
    {
      name: 'easy',
      label: 'Easy',
      values: { showBorders: true, showCityDots: true, showCityNames: true, showCountryNames: true, showMapFlags: true, showPromptCountryNames: true },
    },
    {
      name: 'medium',
      label: 'Medium',
      values: { showBorders: true, showCityDots: true, showCityNames: false, showCountryNames: false, showMapFlags: false, showPromptCountryNames: false },
    },
    {
      name: 'hard',
      label: 'Hard',
      values: { showBorders: false, showCityDots: false, showCityNames: false, showCountryNames: false, showMapFlags: false, showPromptCountryNames: false },
    },
  ],
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
  modeConstraints: {
    identify: [
      { type: 'forced' as const, key: 'showCityDots', forcedValue: true, reason: 'City dots are required for clicking in identify mode' },
    ],
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all countries quizzes.
 * Individual definitions spread this and add id, title, description, dataFilter, and group mapping.
 */
const countriesQuizBase = {
  path: ['Geography', 'Countries'] as const,
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: false, group: 'display', hiddenBehavior: 'never', modes: [] } as const,
    { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
  ],
  presets: [
    {
      name: 'easy',
      label: 'Easy',
      values: { showBorders: true, showCityDots: false, showCountryNames: true, showMapFlags: true },
    },
    {
      name: 'medium',
      label: 'Medium',
      values: { showBorders: true, showCityDots: false, showCountryNames: false, showMapFlags: false },
    },
    {
      name: 'hard',
      label: 'Hard',
      values: { showBorders: false, showCityDots: false, showCountryNames: false, showMapFlags: false },
    },
  ],
  columnMappings: {
    answer: 'name',
    label: 'name',
    latitude: 'latitude',
    longitude: 'longitude',
    group: 'group',
  },
  dataPath: '/data/borders/world-borders.csv',
  supportingDataPaths: ['/data/borders/world-borders.csv', '/data/lakes/large-lakes.csv'],
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all timeline quizzes.
 * Individual definitions spread this and add id, title, description, path, toggles, presets, columnMappings, and dataPath.
 */
const timelineQuizBase = {
  visualizationType: 'timeline' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate'] as const,
  defaultMode: 'free-recall-unordered' as const,
  supportingDataPaths: [] as const,
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description' | 'path' | 'toggles' | 'presets' | 'columnMappings' | 'dataPath'>;

/**
 * Shared configuration for all rivers quizzes.
 */
const riversQuizBase = {
  path: ['Geography', 'Rivers'] as const,
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showRiverNames', label: 'River names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
  ],
  presets: [
    {
      name: 'easy',
      label: 'Easy',
      values: { showBorders: true, showRiverNames: true },
    },
    {
      name: 'hard',
      label: 'Hard',
      values: { showBorders: false, showRiverNames: false },
    },
  ],
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
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

function buildRiversQuizzes(): ReadonlyArray<QuizDefinition> {
  const continents: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly filterValues: ReadonlyArray<string>;
    readonly initialCameraPosition?: QuizDefinition['initialCameraPosition'];
  }> = [
    {
      id: 'geo-rivers-europe',
      title: 'European Rivers',
      description: 'Name the major rivers of Europe.',
      filterValues: ['Europe'],
    },
    {
      id: 'geo-rivers-asia',
      title: 'Asian Rivers',
      description: 'Name the major rivers of Asia.',
      filterValues: ['Asia'],
    },
    {
      id: 'geo-rivers-africa',
      title: 'African Rivers',
      description: 'Name the major rivers of Africa.',
      filterValues: ['Africa'],
    },
    {
      id: 'geo-rivers-north-america',
      title: 'North American Rivers',
      description: 'Name the major rivers of North America.',
      filterValues: ['North America'],
      initialCameraPosition: { x: -130, y: -55, width: 80, height: 50 },
    },
    {
      id: 'geo-rivers-south-america',
      title: 'South American Rivers',
      description: 'Name the major rivers of South America.',
      filterValues: ['South America'],
      initialCameraPosition: { x: -85, y: -15, width: 55, height: 73 },
    },
    {
      id: 'geo-rivers-oceania',
      title: 'Oceanian Rivers',
      description: 'Name the major rivers of Oceania.',
      filterValues: ['Oceania'],
    },
  ];

  const quizzes: Array<QuizDefinition> = continents.map((c) => ({
    ...riversQuizBase,
    id: c.id,
    title: c.title,
    description: c.description,
    dataFilter: [
      { column: 'continent', values: c.filterValues },
      { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5', '6'] },
    ],
    ...(c.initialCameraPosition ? { initialCameraPosition: c.initialCameraPosition } : {}),
  }));

  // World quiz — all continents, scalerank <= 5
  quizzes.push({
    ...riversQuizBase,
    id: 'geo-rivers-world',
    title: 'World Rivers',
    description: 'Name the major rivers of the world.',
    dataFilter: { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5'] },
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  });

  return quizzes;
}

export const quizRegistry: ReadonlyArray<QuizDefinition> = [
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-europe',
    title: 'European Capitals',
    description: 'Name the capital cities of European countries.',
    dataFilter: { column: 'region', values: ['Europe'] },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-asia',
    title: 'Asian Capitals',
    description: 'Name the capital cities of Asian countries.',
    dataFilter: { column: 'region', values: ['Asia'] },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-africa',
    title: 'African Capitals',
    description: 'Name the capital cities of African countries.',
    dataFilter: { column: 'region', values: ['Africa'] },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-north-america',
    title: 'North American Capitals',
    description: 'Name the capital cities of North America, Central America, and the Caribbean.',
    dataFilter: { column: 'subregion', values: ['North America', 'Central America', 'Caribbean'] },
    initialCameraPosition: { x: -120, y: -40, width: 72, height: 43 },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-south-america',
    title: 'South American Capitals',
    description: 'Name the capital cities of South American countries.',
    dataFilter: { column: 'subregion', values: ['South America'] },
    initialCameraPosition: { x: -85, y: -15, width: 55, height: 73 },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-oceania',
    title: 'Oceanian Capitals',
    description: 'Name the capital cities of Oceanian countries.',
    dataFilter: { column: 'region', values: ['Oceania'] },
  },
  {
    ...capitalsQuizBase,
    id: 'geo-capitals-world',
    title: 'World Capitals',
    description: 'Name all 197 capital cities of the world.',
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-europe',
    title: 'European Countries',
    description: 'Identify the countries of Europe on a map.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'region', values: ['Europe'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-asia',
    title: 'Asian Countries',
    description: 'Identify the countries of Asia on a map.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'region', values: ['Asia'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-africa',
    title: 'African Countries',
    description: 'Identify the countries of Africa on a map.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'region', values: ['Africa'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-north-america',
    title: 'North American Countries',
    description: 'Identify the countries of North America, Central America, and the Caribbean.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'group', values: ['North America', 'Central America', 'Caribbean'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
    initialCameraPosition: { x: -130, y: -50, width: 72, height: 43 },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-south-america',
    title: 'South American Countries',
    description: 'Identify the countries of South America on a map.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'group', values: ['South America'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
    initialCameraPosition: { x: -85, y: -15, width: 55, height: 73 },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-oceania',
    title: 'Oceanian Countries',
    description: 'Identify the countries of Oceania on a map.',
    dataFilter: [
      { column: 'is_sovereign', values: ['true'] },
      { column: 'region', values: ['Oceania'] },
    ],
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'group' },
  },
  {
    ...countriesQuizBase,
    id: 'geo-countries-world',
    title: 'World Countries',
    description: 'Identify all sovereign countries of the world on a map.',
    dataFilter: { column: 'is_sovereign', values: ['true'] },
    columnMappings: { ...countriesQuizBase.columnMappings, group: 'region' },
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  },
  {
    id: 'geo-flags-europe',
    title: 'European Flags',
    description: 'Match European countries to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'region', values: ['Europe'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-asia',
    title: 'Asian Flags',
    description: 'Match Asian countries to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'region', values: ['Asia'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-africa',
    title: 'African Flags',
    description: 'Match African countries to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'region', values: ['Africa'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-north-america',
    title: 'North American Flags',
    description: 'Match countries of North America, Central America, and the Caribbean to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'subregion', values: ['North America', 'Central America', 'Caribbean'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-south-america',
    title: 'South American Flags',
    description: 'Match South American countries to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'subregion', values: ['South America'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-oceania',
    title: 'Oceania Flags',
    description: 'Match Oceanian countries to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    dataFilter: { column: 'region', values: ['Oceania'] },
    supportingDataPaths: [],
  },
  {
    id: 'geo-flags-world',
    title: 'World Flags',
    description: 'Match all countries of the world to their flags.',
    path: ['Geography', 'Flags'],
    visualizationType: 'flag-grid',
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
    defaultMode: 'multiple-choice',
    toggles: [
      { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
    ],
    presets: [],
    columnMappings: {
      answer: 'country',
      label: 'country',
      flag: 'country_code',
      group: 'subregion',
    },
    dataPath: '/data/capitals/world-capitals.csv',
    supportingDataPaths: [],
  },
  {
    id: 'sci-periodic-table',
    title: 'Periodic Table',
    description: 'Name the elements of the periodic table.',
    path: ['Science', 'Chemistry', 'Periodic Table'],
    visualizationType: 'grid',
    availableModes: ['free-recall-unordered', 'prompted-recall', 'free-recall-ordered', 'identify'],
    defaultMode: 'free-recall-unordered',
    toggles: [
      { key: 'showSymbols', label: 'Element symbols', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showAtomicNumbers', label: 'Atomic numbers', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showNames', label: 'Element names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showGroups', label: 'Category colours', defaultValue: false, group: 'display', hiddenBehavior: 'never' },
    ],
    presets: [
      {
        name: 'easy',
        label: 'Easy',
        values: { showSymbols: true, showAtomicNumbers: true, showNames: false, showGroups: true },
      },
      {
        name: 'hard',
        label: 'Hard',
        values: { showSymbols: false, showAtomicNumbers: false, showNames: false, showGroups: false },
      },
    ],
    columnMappings: {
      answer: 'name',
      label: 'name',
      group: 'category',
    },
    dataPath: '/data/science/chemistry/periodic-table.csv',
    supportingDataPaths: [],
    rangeColumn: 'atomic_number',
    rangeLabel: 'Atomic number',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Element category',
  },
  {
    id: 'sci-human-bones',
    title: 'Human Bones',
    description: 'Name the bones of the human skeleton.',
    path: ['Science', 'Biology', 'Human Bones'],
    visualizationType: 'grid',
    availableModes: ['free-recall-unordered', 'identify'],
    defaultMode: 'free-recall-unordered',
    toggles: [],
    presets: [],
    columnMappings: {
      answer: 'bone',
      label: 'bone',
      group: 'region',
    },
    dataPath: '/data/science/biology/human-bones.csv',
    supportingDataPaths: [],
  },
  {
    ...timelineQuizBase,
    id: 'hist-emperors-roman',
    title: 'Roman Emperors',
    description: 'Name the emperors of Rome in chronological order.',
    path: ['History', 'Ancient', 'Roman Emperors'],
    toggles: [
      { key: 'showLabels', label: 'Emperor names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
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
    presets: [
      {
        name: 'easy',
        label: 'Easy',
        values: { showLabels: true, showDates: true },
      },
      {
        name: 'hard',
        label: 'Hard',
        values: { showLabels: false, showDates: false },
      },
    ],
    columnMappings: {
      answer: 'emperor',
      label: 'emperor',
    },
    dataPath: '/data/history/ancient/roman-emperors.csv',
  },
  {
    ...timelineQuizBase,
    id: 'hist-timeline-ww2',
    title: 'World War II Timeline',
    description: 'Place key events of World War II on a timeline.',
    path: ['History', 'Modern', 'World War II Timeline'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showTheatreColours', label: 'Theatre colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' },
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
    presets: [
      {
        name: 'easy',
        label: 'Easy',
        values: { showLabels: true, showDates: true, showTheatreColours: true },
      },
      {
        name: 'hard',
        label: 'Hard',
        values: { showLabels: false, showDates: false, showTheatreColours: false },
      },
    ],
    columnMappings: {
      answer: 'event',
      label: 'event',
      group: 'theatre',
    },
    dataPath: '/data/history/modern/ww2-timeline.csv',
  },
  ...buildRiversQuizzes(),
];
