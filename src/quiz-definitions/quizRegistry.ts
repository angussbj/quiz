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
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' } as const,
    { key: 'showCityNames', label: 'City names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showCountryNames', label: 'Country names on map', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showPromptCountryNames', label: 'Country names in prompt', defaultValue: false, group: 'display', hiddenBehavior: 'never', promptField: { type: 'text', column: 'country' }, modes: ['identify', 'prompted-recall'] } as const,
  ],
  selectToggles: [
    { key: 'showPromptFlags', label: 'Flags in prompt', defaultValue: 'off', group: 'display', modes: ['identify', 'prompted-recall'], promptField: { type: 'flag', column: 'country_code' }, options: [
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
  modeConstraints: {
    identify: [
      { type: 'forced' as const, key: 'showCityDots', forcedValue: true, reason: 'City dots are required for clicking in identify mode' },
      { type: 'atLeastOne' as const, keys: ['showPromptCountryNames', 'showPromptFlags'], reason: 'At least one prompt hint is required' },
    ],
    'prompted-recall': [
      { type: 'atLeastOne' as const, keys: ['showPromptCountryNames', 'showPromptFlags'], reason: 'At least one prompt hint is required' },
    ],
  },
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all countries quizzes.
 * Individual definitions spread this and add id, title, description, dataFilter, and group mapping.
 */
const countriesQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showCityDots', label: 'City dots', defaultValue: false, group: 'display', hiddenBehavior: 'never', modes: [] } as const,
    { key: 'showCountryNames', label: 'Country names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showMapFlags', label: 'Flags on map', defaultValue: false, group: 'display', hiddenBehavior: { hintAfter: 2 } } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
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
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;

/**
 * Shared configuration for all human bones quizzes.
 * Individual definitions spread this and add id, title, description, and dataFilter.
 */
const humanBonesQuizBase = {
  path: ['Science', 'Biology'],
  visualizationType: 'anatomy' as const,
  availableModes: ['free-recall-unordered', 'identify', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showLabels', label: 'Bone names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showGroupColors', label: 'Region colors', defaultValue: false, group: 'display' } as const,
  ],
  presets: [],
  columnMappings: {
    answer: 'name',
    label: 'name',
    group: 'region',
  },
  dataPath: '/data/science/biology/human-bones.csv',
  supportingDataPaths: [] as const,
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
  dataPath: '/data/cities/largest-cities.csv',
  initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
  rangeColumn: 'rank',
  rangeLabel: 'Top cities',
  groupFilterColumn: 'region',
  groupFilterLabel: 'Region',
  hideFilteredElements: true,
} satisfies QuizDefinition;

/**
 * Shared configuration for all rivers quizzes.
 */
const riversQuizBase = {
  path: ['Geography'],
  visualizationType: 'map' as const,
  availableModes: ['free-recall-unordered', 'identify', 'locate', 'prompted-recall'] as const,
  defaultMode: 'free-recall-unordered' as const,
  toggles: [
    { key: 'showBorders', label: 'Country borders', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
    { key: 'showRiverNames', label: 'River names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true } as const,
    { key: 'showLakes', label: 'Lakes', defaultValue: true, group: 'display', hiddenBehavior: 'never' } as const,
  ],
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
} satisfies Omit<QuizDefinition, 'id' | 'title' | 'description'>;


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
    dataFilter: { column: 'is_sovereign', values: ['true'] },
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
    availableModes: ['free-recall-unordered', 'multiple-choice', 'prompted-recall'],
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
    },
    dataPath: '/data/capitals/world-capitals.csv',
    supportingDataPaths: [],
    groupFilterColumn: 'region',
    groupFilterLabel: 'Region',
    hideFilteredElements: true,
  },
  {
    id: 'sci-periodic-table',
    title: 'Periodic Table',
    description: 'Name the elements of the periodic table.',
    path: ['Science', 'Chemistry'],
    visualizationType: 'grid',
    availableModes: ['free-recall-unordered', 'prompted-recall', 'free-recall-ordered', 'identify'],
    defaultMode: 'free-recall-unordered',
    toggles: [
      { key: 'showSymbols', label: 'Element symbols', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showAtomicNumbers', label: 'Atomic numbers', defaultValue: true, group: 'display', hiddenBehavior: 'on-reveal' },
      { key: 'showNames', label: 'Element names', defaultValue: false, group: 'display', hiddenBehavior: 'on-reveal', revealsAnswer: true },
      { key: 'showGroups', label: 'Category colours', defaultValue: false, group: 'display', hiddenBehavior: 'never' },
    ],
    presets: [],
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
    ...humanBonesQuizBase,
    id: 'sci-human-bones-all',
    title: 'Human Bones',
    description: 'Name all bones of the human skeleton.',
    groupFilterColumn: 'region',
    groupFilterLabel: 'Body region',
    hideFilteredElements: true,
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
    dataFilter: { column: 'scalerank', values: ['0', '1', '2', '3', '4', '5', '6'] },
    initialCameraPosition: { x: -169, y: -70, width: 360, height: 130 },
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
  },
];
