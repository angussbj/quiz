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
  supportingDataPaths: ['/data/borders/world-borders.csv'],
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
  supportingDataPaths: ['/data/borders/world-borders.csv'],
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all human bones quizzes.
 * Individual definitions spread this and add id, title, description, and dataFilter.
 */
const humanBonesQuizBase = {
  path: ['Science', 'Biology', 'Human Bones'] as const,
  visualizationType: 'anatomy' as const,
  availableModes: ['free-recall-unordered', 'identify', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showLabels', label: 'Bone names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showGroupColors', label: 'Region colors', defaultValue: false, group: 'display' } as const,
  ],
  presets: [
    {
      name: 'easy',
      label: 'Easy',
      values: { showLabels: true, showGroupColors: true },
    },
    {
      name: 'hard',
      label: 'Hard',
      values: { showLabels: false, showGroupColors: false },
    },
  ],
  columnMappings: {
    answer: 'name',
    label: 'name',
    group: 'region',
  },
  dataPath: '/data/science/biology/human-bones.csv',
  supportingDataPaths: [] as const,
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

const humanBonesQuizzes: ReadonlyArray<QuizDefinition> = [
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-common',
    title: 'Human Bones (Common)',
    description: 'Name the commonly known bones of the human skeleton.',
    dataFilter: { column: 'common', values: ['true'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-all',
    title: 'Human Bones (All)',
    description: 'Name all bones of the human skeleton, including ribs and lesser-known bones.',
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-head',
    title: 'Head Bones',
    description: 'Name the bones of the head and skull.',
    dataFilter: { column: 'region', values: ['Head'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-torso',
    title: 'Torso Bones',
    description: 'Name the bones of the torso: spine, sternum, pelvis, and shoulder girdle.',
    dataFilter: { column: 'region', values: ['Torso'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-ribcage',
    title: 'Rib Cage',
    description: 'Identify all 12 pairs of ribs.',
    dataFilter: { column: 'subregion', values: ['Rib Cage'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-arm',
    title: 'Arm Bones',
    description: 'Name the bones of the arm: humerus, radius, and ulna.',
    dataFilter: { column: 'region', values: ['Arm'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-hand',
    title: 'Hand Bones',
    description: 'Name the bone groups of the hand: carpals, metacarpals, and phalanges.',
    dataFilter: { column: 'region', values: ['Hand'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-leg',
    title: 'Leg Bones',
    description: 'Name the bones of the leg: femur, patella, tibia, and fibula.',
    dataFilter: { column: 'region', values: ['Leg'] },
  },
  {
    ...humanBonesQuizBase,
    id: 'sci-human-bones-foot',
    title: 'Foot Bones',
    description: 'Name the bone groups of the foot: tarsals, metatarsals, and phalanges.',
    dataFilter: { column: 'region', values: ['Foot'] },
  },
];

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
  ...humanBonesQuizzes,
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

  // ===== World War I =====
  {
    ...timelineQuizBase,
    id: 'hist-timeline-ww1',
    title: 'World War I Timeline',
    description: 'Place key events of World War I on a timeline, from the July Crisis to the Paris Peace Conference.',
    path: ['History', 'Modern', 'World War I Timeline'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showFrontColours', label: 'Front colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showFrontColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showFrontColours: false } },
    ],
    columnMappings: { answer: 'event', label: 'event', group: 'front' },
    dataPath: '/data/history/modern/ww1-timeline.csv',
    groupFilterColumn: 'front',
    groupFilterLabel: 'Front / Theatre',
  },

  // ===== Geological Time =====
  {
    ...timelineQuizBase,
    id: 'sci-geological-eras',
    title: 'Geological Time',
    description: 'Place geological eons, eras, and periods on a deep-time timeline.',
    path: ['Science', 'Earth Science', 'Geological Time'],
    toggles: [
      { key: 'showLabels', label: 'Period names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Period dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showEonColours', label: 'Period type colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showEonColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showEonColours: false } },
    ],
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
    path: ['History', 'Culture', 'Famous Composers'],
    toggles: [
      { key: 'showLabels', label: 'Composer names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'composer', label: 'composer', group: 'continent' },
    dataPath: '/data/history/music/composers.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },

  // ===== Leaders (Political, Religious, Military, Cultural) =====
  {
    ...timelineQuizBase,
    id: 'hist-leaders-political',
    title: 'Famous Political Leaders',
    description: 'Place famous political leaders from all cultures and eras on a timeline by their lifespans.',
    path: ['History', 'Leaders', 'Political Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/political-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-religious',
    title: 'Famous Religious Leaders',
    description: 'Place famous religious leaders and spiritual figures from all traditions on a timeline.',
    path: ['History', 'Leaders', 'Religious Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/religious-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-military',
    title: 'Famous Military Leaders',
    description: 'Place famous generals, admirals, and military commanders from all cultures on a timeline.',
    path: ['History', 'Leaders', 'Military Leaders'],
    toggles: [
      { key: 'showLabels', label: 'Leader names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'leader', label: 'leader', group: 'continent' },
    dataPath: '/data/history/leaders/military-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },
  {
    ...timelineQuizBase,
    id: 'hist-leaders-cultural',
    title: 'Famous Cultural Figures',
    description: 'Place famous artists, writers, philosophers, and scientists from all cultures on a timeline.',
    path: ['History', 'Leaders', 'Cultural Figures'],
    toggles: [
      { key: 'showLabels', label: 'Figure names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Life dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'figure', label: 'figure', group: 'continent' },
    dataPath: '/data/history/leaders/cultural-leaders.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },

  // ===== Technology Inventions =====
  {
    ...timelineQuizBase,
    id: 'hist-major-inventions',
    title: 'Major Technology Inventions',
    description: 'Place the 50 most significant technology inventions in history on a timeline.',
    path: ['History', 'Science & Technology', 'Major Inventions'],
    toggles: [
      { key: 'showLabels', label: 'Invention names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Invention dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showCategoryColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showCategoryColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showCategoryColours: false } },
    ],
    columnMappings: { answer: 'invention', label: 'invention', group: 'category' },
    dataPath: '/data/history/technology/major-inventions.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Category',
  },

  // ===== Species Evolution =====
  {
    ...timelineQuizBase,
    id: 'sci-species-evolution-major',
    title: 'Species Evolution',
    description: 'Place the major milestones of life on Earth on a deep-time timeline.',
    path: ['Science', 'Biology', 'Species Evolution'],
    toggles: [
      { key: 'showLabels', label: 'Species names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Timeline dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showGroupColours', label: 'Group colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showGroupColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showGroupColours: false } },
    ],
    columnMappings: { answer: 'species', label: 'species', group: 'group' },
    dataPath: '/data/history/science/species-evolution-major.csv',
    groupFilterColumn: 'group',
    groupFilterLabel: 'Life group',
  },
  {
    ...timelineQuizBase,
    id: 'sci-species-evolution-all',
    title: 'Species Evolution (Detailed)',
    description: 'Place 100+ species and evolutionary milestones on a deep-time timeline.',
    path: ['Science', 'Biology', 'Species Evolution (Detailed)'],
    toggles: [
      { key: 'showLabels', label: 'Species names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Timeline dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showGroupColours', label: 'Group colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showGroupColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showGroupColours: false } },
    ],
    columnMappings: { answer: 'species', label: 'species', group: 'group' },
    dataPath: '/data/history/science/species-evolution-all.csv',
    groupFilterColumn: 'group',
    groupFilterLabel: 'Life group',
  },

  // ===== Space Exploration =====
  {
    ...timelineQuizBase,
    id: 'hist-space-milestones',
    title: 'Space Exploration Milestones',
    description: 'Place key milestones in space exploration and space technology on a timeline.',
    path: ['History', 'Science & Technology', 'Space Exploration'],
    toggles: [
      { key: 'showLabels', label: 'Event names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Event dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showCategoryColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showCategoryColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showCategoryColours: false } },
    ],
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
    path: ['History', 'Ancient', 'Major Empires'],
    toggles: [
      { key: 'showLabels', label: 'Empire names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Empire dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
    columnMappings: { answer: 'empire', label: 'empire', group: 'continent' },
    dataPath: '/data/history/ancient/major-empires.csv',
    groupFilterColumn: 'continent',
    groupFilterLabel: 'Continent',
  },

  // ===== My Suggestions: Ancient Civilizations =====
  {
    ...timelineQuizBase,
    id: 'hist-ancient-civilizations',
    title: 'Ancient Civilizations',
    description: 'Place ancient and classical civilizations from around the world on a timeline.',
    path: ['History', 'Ancient', 'Ancient Civilizations'],
    toggles: [
      { key: 'showLabels', label: 'Civilization names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Civilization dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showContinentColours', label: 'Continent colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showContinentColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showContinentColours: false } },
    ],
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
    path: ['History', 'Culture', 'Art Movements'],
    toggles: [
      { key: 'showLabels', label: 'Movement names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Movement dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showCategoryColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showCategoryColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showCategoryColours: false } },
    ],
    columnMappings: { answer: 'movement', label: 'movement', group: 'category' },
    dataPath: '/data/history/culture/art-movements.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Art form',
  },

  // ===== My Suggestions: Pandemics =====
  {
    ...timelineQuizBase,
    id: 'hist-pandemics',
    title: 'Major Pandemics',
    description: 'Place major pandemics and epidemics throughout history on a timeline.',
    path: ['History', 'Science & Technology', 'Pandemics'],
    toggles: [
      { key: 'showLabels', label: 'Pandemic names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showDates', label: 'Pandemic dates', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
      { key: 'showCategoryColours', label: 'Category colours', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showCategoryColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showCategoryColours: false } },
    ],
    columnMappings: { answer: 'pandemic', label: 'pandemic', group: 'category' },
    dataPath: '/data/history/science/pandemics.csv',
    groupFilterColumn: 'category',
    groupFilterLabel: 'Disease type',
  },

  // ===== My Suggestions: Scientific Discoveries =====
  {
    ...timelineQuizBase,
    id: 'hist-scientific-discoveries',
    title: 'Scientific Discoveries',
    description: 'Place major scientific discoveries and theories on a timeline.',
    path: ['History', 'Science & Technology', 'Scientific Discoveries'],
    toggles: [
      { key: 'showLabels', label: 'Discovery names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' } as const,
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
    presets: [
      { name: 'easy', label: 'Easy', values: { showLabels: true, showDates: true, showFieldColours: true } },
      { name: 'hard', label: 'Hard', values: { showLabels: false, showDates: false, showFieldColours: false } },
    ],
    columnMappings: { answer: 'discovery', label: 'discovery', group: 'field' },
    dataPath: '/data/history/science/scientific-discoveries.csv',
    groupFilterColumn: 'field',
    groupFilterLabel: 'Scientific field',
  },
];
